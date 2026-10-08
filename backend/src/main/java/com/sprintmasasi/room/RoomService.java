package com.sprintmasasi.room;

import com.sprintmasasi.config.AppProperties;
import com.sprintmasasi.poker.Deck;
import com.sprintmasasi.poker.VoteStatistics;
import com.sprintmasasi.room.RoomViews.CreateRoomResult;
import com.sprintmasasi.room.RoomViews.JoinResult;
import com.sprintmasasi.room.RoomViews.ParticipantView;
import com.sprintmasasi.room.RoomViews.RoomInfo;
import com.sprintmasasi.room.RoomViews.RoomSnapshot;
import com.sprintmasasi.room.RoomViews.RoomState;
import com.sprintmasasi.room.RoomViews.RoundView;
import com.sprintmasasi.room.RoomViews.TicketView;
import com.sprintmasasi.room.RoomViews.TimerView;
import com.sprintmasasi.room.RoomViews.VoteView;
import com.sprintmasasi.room.RoomViews.YourVote;
import com.sprintmasasi.stats.UsageStats;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Oda kurallarının tek yeri. Sunucu otoriterdir: istemci yalnızca niyet bildirir,
 * yetki ve geçerlilik burada kontrol edilir, sonra durum yayınlanır.
 * Loglara yalnızca oda kodu ve olay tipi yazılır; kullanıcı içeriği yazılmaz.
 */
@Service
public class RoomService {

    private static final Logger log = LoggerFactory.getLogger(RoomService.class);

    private final RoomRepository repository;
    private final RoomEvents events;
    private final SecureIds ids;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties props;
    private final Clock clock;
    private final TaskScheduler scheduler;
    private final UsageStats stats;
    private final RateLimiter passwordFailures;
    private final RateLimiter roomCreation;

    public RoomService(RoomRepository repository, RoomEvents events, SecureIds ids, PasswordEncoder passwordEncoder,
                       AppProperties props, Clock clock, TaskScheduler scheduler, UsageStats stats) {
        this.repository = repository;
        this.events = events;
        this.ids = ids;
        this.passwordEncoder = passwordEncoder;
        this.props = props;
        this.clock = clock;
        this.scheduler = scheduler;
        this.stats = stats;
        this.passwordFailures = new RateLimiter(clock, props.passwordMaxAttempts(),
                Duration.ofSeconds(props.passwordWindowSeconds()));
        this.roomCreation = new RateLimiter(clock, props.createRoomsPerMinute(), Duration.ofMinutes(1));
    }

    // ---------------------------------------------------------------- REST tarafı

    public CreateRoomResult create(String rawName, String rawDeck, String rawPassword, String clientIp) {
        return create(rawName, rawDeck, null, rawPassword, clientIp);
    }

    public CreateRoomResult create(String rawName, String rawDeck, List<String> customCards, String rawPassword,
                                   String clientIp) {
        return create(rawName, rawDeck, customCards, rawPassword, false, clientIp);
    }

    public CreateRoomResult create(String rawName, String rawDeck, List<String> customCards, String rawPassword,
                                   boolean ticketsEnabled, String clientIp) {
        if (!roomCreation.tryAcquire(clientIp)) {
            throw new RoomException(ErrorCode.RATE_LIMITED);
        }
        String name = Validation.roomName(rawName);
        Deck deck = Validation.deck(rawDeck, customCards);
        String password = Validation.password(rawPassword);
        String hash = password == null ? null : passwordEncoder.encode(password);
        String claim = ids.token();
        // Çakışma olasılığı çok düşük ama yine de yeni kod dene.
        for (int attempt = 0; attempt < 10; attempt++) {
            Room room = new Room(ids.roomCode(), name, deck, hash, claim, ticketsEnabled, clock.instant());
            if (repository.saveIfAbsent(room)) {
                stats.roomCreated();
                if (ticketsEnabled) {
                    stats.ticketsEnabled(room.code());
                }
                log.info("event=room.created room={}", room.code());
                return new CreateRoomResult(room.code(), claim);
            }
        }
        throw new IllegalStateException("Oda kodu üretilemedi");
    }

    public RoomInfo info(String code) {
        Room room = require(code);
        return room.withLock(() -> new RoomInfo(room.code(), room.name(), room.passwordProtected()));
    }

    /**
     * Odaya katılım. Geçerli bir token ile gelen kişi aynı koltuğa döner ve
     * şifre sorulmaz. Yeni katılımda şifre (varsa) kontrol edilir.
     */
    public JoinResult join(String code, String rawNickname, String rawAvatar, boolean observer, String password,
                           String existingToken, String claimToken, String clientIp) {
        Room room = require(code);

        var rejoin = room.withLock(() -> room.findByToken(existingToken));
        if (rejoin.isPresent()) {
            Participant p = rejoin.get();
            return new JoinResult(room.code(), p.id(), existingToken, p.nickname(), true);
        }

        String nickname = Validation.nickname(rawNickname);
        String avatar = Validation.avatar(rawAvatar);
        checkPassword(room, password, clientIp);

        JoinResult result = room.withLock(() -> {
            ensureOpen(room);
            if (room.seatCount() >= props.maxParticipants()) {
                throw new RoomException(ErrorCode.ROOM_FULL);
            }
            boolean creator = room.consumeClaimToken(claimToken);
            String token = ids.token();
            Participant p = room.addParticipant(ids.participantId(), token, nickname, avatar, observer, clock.instant());
            // Odayı açan kişi moderatör olur. Açan kişi zaten girmişse ve hiç moderatör
            // kalmamışsa yeni gelen (gözlemci değilse) moderatör olur.
            if (creator || (room.creatorClaimed() && !room.hasModerator() && !observer)) {
                p.setModerator(true);
            }
            room.touch(clock.instant());
            return new JoinResult(room.code(), p.id(), token, p.nickname(), false);
        });
        log.info("event=room.join room={}", room.code());
        events.participantJoined(room.code(), result.participantId());
        broadcast(room);
        return result;
    }

    private void checkPassword(Room room, String password, String clientIp) {
        String hash = room.withLock(room::passwordHash);
        if (hash == null) {
            return;
        }
        String limiterKey = clientIp + "|" + room.code();
        if (passwordFailures.isExhausted(limiterKey)) {
            throw new RoomException(ErrorCode.TOO_MANY_ATTEMPTS);
        }
        if (password == null || password.isEmpty()) {
            throw new RoomException(ErrorCode.PASSWORD_REQUIRED);
        }
        if (password.length() > Validation.PASSWORD_MAX || !passwordEncoder.matches(password, hash)) {
            passwordFailures.tryAcquire(limiterKey);
            log.info("event=room.password_failed room={}", room.code());
            throw new RoomException(ErrorCode.WRONG_PASSWORD);
        }
        passwordFailures.reset(limiterKey);
    }

    // ---------------------------------------------------------------- WebSocket tarafı

    /** WebSocket CONNECT sırasında token doğrulanır; katılımcı kimliği döner. */
    public String authenticate(String code, String token) {
        Room room = repository.find(SecureIds.normalizeCode(code))
                .orElseThrow(() -> new RoomException(ErrorCode.ROOM_NOT_FOUND));
        return room.withLock(() -> room.findByToken(token).map(Participant::id))
                .orElseThrow(() -> new RoomException(ErrorCode.INVALID_TOKEN));
    }

    public void connected(String code, String participantId) {
        repository.find(code).ifPresent(room -> {
            boolean changed = room.withLock(() -> room.participant(participantId).map(p -> {
                p.connect();
                room.touch(clock.instant());
                // Moderatör uzun süredir yoksa (bekleme süresi dolmuş) bağlanan devralabilir.
                room.handOverModeratorIfNeeded(graceCutoff());
                stats.participantsOnline(room.code(), onlineCount(room));
                stats.roomActivity(room.code(), clock.instant());
                return true;
            }).orElse(false));
            if (changed) {
                broadcast(room);
            }
        });
    }

    public void disconnected(String code, String participantId) {
        repository.find(code).ifPresent(room -> {
            boolean moderatorLeft = room.withLock(() -> room.participant(participantId).map(p -> {
                p.disconnect(clock.instant());
                stats.roomActivity(room.code(), clock.instant());
                room.touch(clock.instant());
                return p.moderator() && !p.online() && !room.hasOnlineModerator();
            }).orElse(false));
            broadcast(room);
            if (moderatorLeft) {
                // Sayfa yenileme gibi kısa kopmalarda moderatörlük hemen gitmesin.
                scheduler.schedule(() -> handOverIfStillMissing(room.code()),
                        clock.instant().plusSeconds(props.moderatorGraceSeconds()));
            }
        });
    }

    void handOverIfStillMissing(String code) {
        repository.find(code).ifPresent(room -> {
            if (room.withLock(() -> room.handOverModeratorIfNeeded(graceCutoff()))) {
                log.info("event=room.moderator_handover room={}", code);
                broadcast(room);
            }
        });
    }

    public void sync(String code, String participantId) {
        Room room = require(code);
        RoomSnapshot snapshot = room.withLock(() -> {
            PokerRound round = room.round();
            PokerRound.Vote mine = round.votes().get(participantId);
            YourVote yourVote = mine == null ? null : new YourVote(round.id(), mine.card());
            return new RoomSnapshot(participantId, toState(room), yourVote);
        });
        events.snapshot(room.code(), participantId, snapshot);
    }

    public void promote(String code, String actorId, String targetId) {
        Room room = require(code);
        room.withLock(() -> {
            requireModerator(room, actorId);
            Participant target = room.participant(targetId).orElseThrow(() -> new RoomException(ErrorCode.INVALID_INPUT));
            target.setModerator(true);
            room.touch(clock.instant());
        });
        log.info("event=room.promote room={}", room.code());
        broadcast(room);
    }

    /** Kişi kendi isteğiyle ayrılır; koltuğu silinir. */
    public void leave(String code, String actorId) {
        Room room = require(code);
        boolean removed = room.withLock(() -> room.participant(actorId).map(p -> {
            room.removeParticipant(actorId);
            room.handOverModeratorIfNeeded(graceCutoff());
            room.touch(clock.instant());
            return true;
        }).orElse(false));
        if (removed) {
            log.info("event=room.leave room={}", room.code());
            events.participantLeft(room.code(), actorId);
            broadcast(room);
        }
    }

    /** Moderatör şifreyi değiştirir; boş/null şifreyi kaldırır. Mevcut koltuklar etkilenmez. */
    public void setPassword(String code, String actorId, String rawPassword) {
        Room room = require(code);
        String password = Validation.password(rawPassword);
        String hash = password == null ? null : passwordEncoder.encode(password);
        room.withLock(() -> {
            requireModerator(room, actorId);
            room.setPasswordHash(hash);
            room.touch(clock.instant());
        });
        log.info("event=room.password_changed room={}", room.code());
        broadcast(room);
    }

    public void close(String code, String actorId) {
        Room room = require(code);
        room.withLock(() -> {
            requireModerator(room, actorId);
            room.markClosed();
        });
        repository.delete(room.code());
        log.info("event=room.closed room={}", room.code());
        events.closed(room.code(), "closed_by_moderator");
    }

    /** Hareketsiz odaları temizler (zamanlanmış görev çağırır). */
    public List<String> expireIdle() {
        List<String> removed = repository.expireIdle(Duration.ofDays(props.idleExpiryDays()));
        removed.forEach(code -> {
            log.info("event=room.expired room={}", code);
            events.closed(code, "expired");
        });
        passwordFailures.purge();
        roomCreation.purge();
        return removed;
    }

    // ---------------------------------------------------------------- yardımcılar

    Room require(String code) {
        Room room = repository.find(SecureIds.normalizeCode(code))
                .orElseThrow(() -> new RoomException(ErrorCode.ROOM_NOT_FOUND));
        if (room.withLock(room::closed)) {
            throw new RoomException(ErrorCode.ROOM_NOT_FOUND);
        }
        return room;
    }

    private static void ensureOpen(Room room) {
        if (room.closed()) {
            throw new RoomException(ErrorCode.ROOM_NOT_FOUND);
        }
    }

    static void requireModerator(Room room, String actorId) {
        boolean ok = room.participant(actorId).map(Participant::moderator).orElse(false);
        if (!ok) {
            throw new RoomException(ErrorCode.FORBIDDEN);
        }
    }

    void broadcast(Room room) {
        RoomState state = room.withLock(() -> toState(room));
        events.state(room.code(), state);
    }

    private Instant graceCutoff() {
        return clock.instant().minusSeconds(props.moderatorGraceSeconds());
    }

    private static int onlineCount(Room room) {
        return (int) room.participants().stream().filter(Participant::online).count();
    }

    /** Oda kilidi altında çağrılır. */
    RoomState toState(Room room) {
        List<ParticipantView> people = room.participantList().stream()
                .sorted(Comparator.comparingLong(Participant::joinOrder))
                .map(p -> new ParticipantView(p.id(), p.nickname(), p.avatar(), p.moderator(), p.observer(), p.online()))
                .toList();
        // Ticket listesi kapalıyken ticket'lar sunucuda saklanır ama istemciye gitmez.
        List<TicketView> tickets = !room.ticketsEnabled() ? List.of() : room.tickets().stream()
                .map(t -> new TicketView(t.id(), t.title(), t.link(), t.note(), t.status().name(), t.finalEstimate(),
                        List.copyOf(t.history())))
                .toList();
        Deck custom = room.customDeck();
        return new RoomState(room.code(), room.name(), room.deckId(), room.deck().cards(),
                custom == null ? null : custom.cards(), room.passwordProtected(), props.maxParticipants(), people,
                room.ticketsEnabled(), tickets, room.currentTicketId(), roundView(room), timerView(room),
                List.copyOf(room.sessionHistory()));
    }

    /**
     * Turun istemciye giden hali. Gizlilik kuralı burada uygulanır:
     * VOTING durumunda yalnızca kimlerin oy verdiği gider, oy değerleri ve istatistik asla.
     */
    private RoundView roundView(Room room) {
        PokerRound round = room.round();
        List<String> votedIds = List.copyOf(round.votes().keySet());
        if (round.isVoting()) {
            return new RoundView(round.id(), round.number(), round.ticketId(), round.topic(), round.state().name(),
                    votedIds, null, null, null);
        }
        return new RoundView(round.id(), round.number(), round.ticketId(), round.topic(), round.state().name(), votedIds,
                voteViews(room, round), statistics(room.deck(), round), round.finalEstimate());
    }

    /** Açılmış turun oyları (yalnızca REVEALED/FINALIZED için çağrılır). */
    static List<VoteView> voteViews(Room room, PokerRound round) {
        return round.votes().entrySet().stream()
                .map(e -> new VoteView(e.getKey(), e.getValue().nickname(), e.getValue().avatar(), e.getValue().card(),
                        round.excluded().contains(e.getKey()), room.participant(e.getKey()).isEmpty()))
                .toList();
    }

    static VoteStatistics.Result statistics(Deck deck, PokerRound round) {
        List<VoteStatistics.Vote> counted = round.votes().entrySet().stream()
                .filter(e -> !round.excluded().contains(e.getKey()))
                .map(e -> new VoteStatistics.Vote(e.getKey(), e.getValue().card()))
                .toList();
        return VoteStatistics.compute(deck, counted);
    }

    private TimerView timerView(Room room) {
        if (room.timerEndsAt() == null) {
            return null;
        }
        long remaining = Math.max(0, Duration.between(clock.instant(), room.timerEndsAt()).toMillis());
        return new TimerView(room.timerSeconds(), remaining);
    }
}
