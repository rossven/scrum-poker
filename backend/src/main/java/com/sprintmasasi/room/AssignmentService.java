package com.sprintmasasi.room;

import com.sprintmasasi.games.TieBreakerGame;
import com.sprintmasasi.games.TieBreakerGame.Candidate;
import com.sprintmasasi.room.RoomViews.PersonView;
import com.sprintmasasi.stats.UsageStats;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.random.RandomGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;

/**
 * "Kim alacak?" (M3): gönüllü turu → aday ayarı → mini oyun → sonuç. Kazanan yalnızca burada,
 * sunucunun rastgele kaynağıyla (SecureRandom) belirlenir; istemci sonucu sadece animasyonla gösterir.
 */
@Service
public class AssignmentService {

    private static final Logger log = LoggerFactory.getLogger(AssignmentService.class);

    public static final int DEFAULT_VOLUNTEER_SECONDS = 20;
    public static final int MIN_VOLUNTEER_SECONDS = 5;
    public static final int MAX_VOLUNTEER_SECONDS = 300;
    /** Sonuç herkese ulaşsın diye oyun bu kadar sonra başlar; istemciler aynı anda başlatır. */
    public static final int GAME_LEAD_MS = 1500;

    private final RoomService rooms;
    private final SecureIds ids;
    private final Clock clock;
    private final TaskScheduler scheduler;
    private final UsageStats stats;
    private final RandomGenerator random;
    private final Map<String, TieBreakerGame> games = new LinkedHashMap<>();

    public AssignmentService(RoomService rooms, SecureIds ids, Clock clock, TaskScheduler scheduler, UsageStats stats,
                             @Qualifier("gameRandom") RandomGenerator random, List<TieBreakerGame> games) {
        this.rooms = rooms;
        this.ids = ids;
        this.clock = clock;
        this.scheduler = scheduler;
        this.stats = stats;
        this.random = random;
        games.forEach(g -> this.games.put(g.id(), g));
    }

    /**
     * Krupiye "Kim alacak?" adımını başlatır (masadaki ticket ya da serbest turun konusu için).
     * seconds: gönüllü turu süresi; 0 = süre sınırı yok (krupiye kapatır). Süren bir akış varsa yerine geçer.
     */
    public void start(String code, String actorId, Integer rawSeconds) {
        int seconds = rawSeconds == null ? DEFAULT_VOLUNTEER_SECONDS : rawSeconds;
        if (seconds != 0 && (seconds < MIN_VOLUNTEER_SECONDS || seconds > MAX_VOLUNTEER_SECONDS)) {
            throw new RoomException(ErrorCode.INVALID_INPUT);
        }
        Room room = rooms.require(code);
        String assignmentId = room.withLock(() -> {
            RoomService.requireModerator(room, actorId);
            String ticketId = room.round().ticketId();
            String title = room.currentTicket().map(Ticket::title).orElse(room.round().topic());
            var a = new Assignment(ids.ticketId(), ticketId, title, seconds, clock.instant());
            room.setAssignment(a);
            room.touch(clock.instant());
            return a.id();
        });
        if (seconds > 0) {
            scheduler.schedule(() -> closeVolunteeringIfDue(room.code(), assignmentId),
                    clock.instant().plusSeconds(seconds));
        }
        log.info("event=assign.start room={}", room.code());
        rooms.broadcast(room);
    }

    /** "Ben alırım" (ya da vazgeç). Yalnızca gönüllü turunda, oy verebilen katılımcılar. */
    public void volunteer(String code, String actorId, boolean volunteer) {
        Room room = rooms.require(code);
        room.withLock(() -> {
            Participant me = room.participant(actorId).orElseThrow(() -> new RoomException(ErrorCode.FORBIDDEN));
            if (me.observer()) {
                throw new RoomException(ErrorCode.FORBIDDEN);
            }
            Assignment a = requirePhase(room, Assignment.Phase.VOLUNTEERING);
            if (volunteer) {
                a.volunteers().add(actorId);
            } else {
                a.volunteers().remove(actorId);
            }
            room.touch(clock.instant());
        });
        rooms.broadcast(room);
    }

    /** Krupiye gönüllü turunu erken kapatır. */
    public void closeVolunteering(String code, String actorId) {
        Room room = rooms.require(code);
        room.withLock(() -> {
            RoomService.requireModerator(room, actorId);
            finishVolunteering(room, requirePhase(room, Assignment.Phase.VOLUNTEERING));
            room.touch(clock.instant());
        });
        rooms.broadcast(room);
    }

    /** Zamanlanmış görev: gönüllü turunun süresi doldu (akış o arada değişmediyse kapatır). */
    void closeVolunteeringIfDue(String code, String assignmentId) {
        Room room;
        try {
            room = rooms.require(code);
        } catch (RoomException e) {
            return;
        }
        boolean changed = room.withLock(() -> {
            Assignment a = room.assignment();
            if (a == null || !a.id().equals(assignmentId) || a.phase() != Assignment.Phase.VOLUNTEERING
                    || a.volunteerEndsAt() == null || clock.instant().isBefore(a.volunteerEndsAt())) {
                return false;
            }
            finishVolunteering(room, a);
            return true;
        });
        if (changed) {
            rooms.broadcast(room);
        }
    }

    /**
     * Gönüllü turunun sonu: tek gönüllü varsa iş ona atanır (oyun yok); birden çok gönüllü varsa adaylar
     * onlardır; hiç yoksa adaylar bu turda oy veren katılımcılardır (kimse oy vermediyse tüm katılımcılar).
     */
    private void finishVolunteering(Room room, Assignment a) {
        List<String> volunteers = present(room, a.volunteers());
        if (volunteers.size() == 1) {
            a.candidates().clear();
            a.candidates().addAll(volunteers);
            decide(room, a, List.of(volunteers.getFirst()), "volunteer", null);
            return;
        }
        a.toCandidates(volunteers.isEmpty() ? defaultPool(room) : volunteers);
    }

    /** Krupiye bir kişiyi adaylıktan çıkarır ya da geri ekler (izin, kapasite...). */
    public void setCandidate(String code, String actorId, String participantId, boolean candidate) {
        Room room = rooms.require(code);
        room.withLock(() -> {
            RoomService.requireModerator(room, actorId);
            Assignment a = requirePhase(room, Assignment.Phase.CANDIDATES);
            if (candidate) {
                Participant p = room.participant(participantId == null ? "" : participantId)
                        .orElseThrow(() -> new RoomException(ErrorCode.INVALID_INPUT));
                if (p.observer()) {
                    throw new RoomException(ErrorCode.INVALID_INPUT);
                }
                a.candidates().add(p.id());
            } else {
                a.candidates().remove(participantId);
            }
            room.touch(clock.instant());
        });
        rooms.broadcast(room);
    }

    /** Dönüşümlü adalet modunu aç/kapat (oda boyunca geçerli). */
    public void setFairRotation(String code, String actorId, boolean enabled) {
        Room room = rooms.require(code);
        room.withLock(() -> {
            RoomService.requireModerator(room, actorId);
            room.setFairRotation(enabled);
            room.touch(clock.instant());
        });
        rooms.broadcast(room);
    }

    /**
     * Krupiye oyunu başlatır. Kazanan ve tam sıralama burada çekilir; tek aday kaldıysa oyun oynanmadan atanır.
     */
    public void play(String code, String actorId, String gameId) {
        TieBreakerGame game = games.get(gameId);
        if (game == null) {
            throw new RoomException(ErrorCode.INVALID_INPUT);
        }
        Room room = rooms.require(code);
        boolean played = room.withLock(() -> {
            RoomService.requireModerator(room, actorId);
            Assignment a = requirePhase(room, Assignment.Phase.CANDIDATES);
            List<String> candidates = present(room, a.candidates());
            if (candidates.isEmpty()) {
                throw new RoomException(ErrorCode.INVALID_INPUT);
            }
            room.touch(clock.instant());
            if (candidates.size() == 1) {
                decide(room, a, candidates, "direct", null);
                return false;
            }
            boolean weighted = room.fairRotation();
            List<Candidate> input = candidates.stream()
                    .map(id -> new Candidate(id, weighted ? weight(room, id) : 1.0))
                    .toList();
            TieBreakerGame.Outcome outcome = game.play(input, random);
            Instant startsAt = clock.instant().plusMillis(GAME_LEAD_MS);
            decide(room, a, outcome.ranking(), game.id(),
                    new Assignment.Game(game.id(), startsAt, outcome.durationMs(), outcome.animation()));
            return true;
        });
        if (played) {
            stats.assignmentGameStarted(game.id());
        }
        log.info("event=assign.play room={} game={}", room.code(), game.id());
        rooms.broadcast(room);
    }

    /**
     * Krupiye sonucu geri alır: kayıt geçmişte "geri alındı" olarak kalır, ticket'ın ataması kalkar ve
     * aday ayarına dönülür. Tek gönüllüye doğrudan yapılan atama geri alınırsa adaylar varsayılan havuza
     * genişler (krupiye "yine de oyun oynansın" demiştir).
     */
    public void undo(String code, String actorId) {
        Room room = rooms.require(code);
        room.withLock(() -> {
            RoomService.requireModerator(room, actorId);
            Assignment a = requirePhase(room, Assignment.Phase.RESULT);
            AssignmentRecord record = a.result();
            record.markUndone();
            if (a.ticketId() != null) {
                room.ticket(a.ticketId())
                        .filter(t -> t.assignee() != null
                                && t.assignee().participantId().equals(record.winner().participantId()))
                        .ifPresent(t -> t.assign(null));
            }
            List<String> previous = present(room, record.candidates().stream().map(PersonView::participantId).toList());
            if (previous.size() <= 1) {
                List<String> pool = new ArrayList<>(previous);
                defaultPool(room).stream().filter(id -> !pool.contains(id)).forEach(pool::add);
                previous = pool;
            }
            a.toCandidates(previous);
            room.touch(clock.instant());
        });
        log.info("event=assign.undo room={}", room.code());
        rooms.broadcast(room);
    }

    /** Akışı kapatır (sonuç ve geçmiş kalır). */
    public void close(String code, String actorId) {
        Room room = rooms.require(code);
        room.withLock(() -> {
            RoomService.requireModerator(room, actorId);
            room.setAssignment(null);
            room.touch(clock.instant());
        });
        rooms.broadcast(room);
    }

    // ---------------------------------------------------------------- yardımcılar

    /** Sonucu kaydeder: geçmişe yazar, ticket'a atar, akış RESULT olur. Oda kilidi altında çağrılır. */
    private void decide(Room room, Assignment a, List<String> ranking, String gameId, Assignment.Game game) {
        List<PersonView> rankingPeople = ranking.stream().map(id -> person(room, id)).toList();
        List<PersonView> candidatePeople = present(room, a.candidates()).stream().map(id -> person(room, id)).toList();
        var record = new AssignmentRecord(ids.ticketId(), a.ticketId(), a.title(), gameId, rankingPeople,
                candidatePeople, game != null && room.fairRotation(), clock.instant());
        room.addAssignmentRecord(record);
        if (a.ticketId() != null) {
            room.ticket(a.ticketId()).ifPresent(t -> t.assign(record.winner()));
        }
        a.toResult(record, game);
    }

    /** Dönüşümlü adalet: bu oturumda (geri alınmamış) her kazanım ağırlığı yarıya indirir. */
    static double weight(Room room, String participantId) {
        long wins = room.assignmentHistory().stream()
                .filter(r -> !r.undone() && r.winner().participantId().equals(participantId))
                .count();
        return Math.pow(0.5, wins);
    }

    /** Hiç gönüllü yokken adaylar: bu turda oy veren katılımcılar; kimse oy vermediyse tüm katılımcılar. */
    private static List<String> defaultPool(Room room) {
        List<String> seated = room.participantList().stream()
                .filter(p -> !p.observer())
                .map(Participant::id)
                .toList();
        List<String> voters = seated.stream().filter(room.round()::hasVoted).toList();
        return voters.isEmpty() ? seated : voters;
    }

    /** Hâlâ odada olan kişiler (sıra korunur). */
    private static List<String> present(Room room, java.util.Collection<String> ids) {
        return ids.stream().filter(id -> room.participant(id).isPresent()).toList();
    }

    private static PersonView person(Room room, String id) {
        Participant p = room.participant(id).orElseThrow(() -> new RoomException(ErrorCode.INVALID_INPUT));
        return new PersonView(p.id(), p.nickname(), p.avatar());
    }

    private static Assignment requirePhase(Room room, Assignment.Phase phase) {
        Assignment a = room.assignment();
        if (a == null || a.phase() != phase) {
            throw new RoomException(ErrorCode.WRONG_PHASE);
        }
        return a;
    }
}
