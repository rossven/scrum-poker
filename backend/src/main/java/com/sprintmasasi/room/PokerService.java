package com.sprintmasasi.room;

import com.sprintmasasi.poker.Deck;
import com.sprintmasasi.room.RoomViews.RoundRecordView;
import com.sprintmasasi.room.RoomViews.SessionRoundView;
import com.sprintmasasi.room.RoomViews.YourVote;
import com.sprintmasasi.stats.UsageStats;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Planning poker kuralları: oy, açma, tekrar oylama, final tahmin, deste, ticket kuyruğu, zamanlayıcı.
 * Oda düzeyindeki kurallar (katılım, moderatörlük) RoomService'te; durum yayını da oradan yapılır.
 */
@Service
public class PokerService {

    private static final Logger log = LoggerFactory.getLogger(PokerService.class);

    public static final int MAX_TICKETS = 100;
    public static final int TIMER_MIN_SECONDS = 10;
    public static final int TIMER_MAX_SECONDS = 3600;
    /** Aynı kişi en fazla 30 sn'de bir dürtülebilir. */
    public static final Duration NUDGE_INTERVAL = Duration.ofSeconds(30);
    /** Masaya emoji: kişi başına 10 sn'de en fazla 5. */
    public static final int EMOJI_BURST = 5;
    public static final Duration EMOJI_WINDOW = Duration.ofSeconds(10);

    public record NewTicket(String title, String link, String note) {}

    private final RoomService rooms;
    private final RoomEvents events;
    private final SecureIds ids;
    private final Clock clock;
    private final UsageStats stats;
    private final RateLimiter nudges;
    private final RateLimiter emojis;

    public PokerService(RoomService rooms, RoomEvents events, SecureIds ids, Clock clock, UsageStats stats) {
        this.rooms = rooms;
        this.events = events;
        this.ids = ids;
        this.clock = clock;
        this.stats = stats;
        this.nudges = new RateLimiter(clock, 1, NUDGE_INTERVAL);
        this.emojis = new RateLimiter(clock, EMOJI_BURST, EMOJI_WINDOW);
    }

    // ---------------------------------------------------------------- oylama

    /** Oy ver ya da değiştir; card null/boş ise oyu geri çek. Yalnızca VOTING sırasında. */
    public void vote(String code, String actorId, String rawCard) {
        Room room = rooms.require(code);
        String card = rawCard == null || rawCard.isBlank() ? null : rawCard;
        YourVote echo = room.withLock(() -> {
            Participant me = room.participant(actorId).orElseThrow(() -> new RoomException(ErrorCode.FORBIDDEN));
            if (me.observer()) {
                throw new RoomException(ErrorCode.FORBIDDEN);
            }
            PokerRound round = room.round();
            if (!round.isVoting()) {
                throw new RoomException(ErrorCode.WRONG_PHASE);
            }
            if (card == null) {
                round.withdraw(actorId);
            } else {
                if (!room.deck().contains(card)) {
                    throw new RoomException(ErrorCode.INVALID_INPUT);
                }
                round.vote(actorId, new PokerRound.Vote(card, me.nickname(), me.avatar()));
            }
            room.touch(clock.instant());
            return new YourVote(round.id(), card);
        });
        // Değer yalnızca oy verene gider; odaya sadece "kimler oy verdi" yayınlanır.
        events.yourVote(room.code(), actorId, echo);
        rooms.broadcast(room);
    }

    public void reveal(String code, String actorId) {
        Room room = rooms.require(code);
        room.withLock(() -> {
            RoomService.requireModerator(room, actorId);
            if (!room.round().isVoting()) {
                throw new RoomException(ErrorCode.WRONG_PHASE);
            }
            if (room.round().votes().isEmpty()) {
                throw new RoomException(ErrorCode.NO_VOTES);
            }
            room.round().reveal();
            room.touch(clock.instant());
        });
        stats.pokerRoundRevealed();
        log.info("event=poker.reveal room={}", room.code());
        rooms.broadcast(room);
    }

    /** Aynı ticket için yeni tur. Açılmış tur ticket geçmişine yazılır. */
    public void newRound(String code, String actorId) {
        Room room = rooms.require(code);
        room.withLock(() -> {
            RoomService.requireModerator(room, actorId);
            PokerRound old = room.round();
            archiveIfRevealed(room);
            if (old.ticketId() == null && old.state() == PokerRound.State.FINALIZED) {
                // Ticket'sız tur finallendi: yeni konu için temiz bir serbest tur.
                room.startRound(null, 1, null);
            } else {
                // Açılmamış tur yeniden başlarsa numara artmaz (sadece oylar sıfırlanır).
                int number = old.isVoting() ? old.number() : old.number() + 1;
                room.startRound(old.ticketId(), number, old.topic());
            }
            room.touch(clock.instant());
        });
        log.info("event=poker.new_round room={}", room.code());
        rooms.broadcast(room);
    }

    /**
     * Krupiye final tahmini onaylar. Masada ticket varsa "tahmin edildi" olur;
     * yoksa (serbest tur) final tura ve oturum geçmişine yazılır.
     */
    public void finalizeEstimate(String code, String actorId, String value) {
        Room room = rooms.require(code);
        room.withLock(() -> {
            RoomService.requireModerator(room, actorId);
            PokerRound round = room.round();
            if (round.state() != PokerRound.State.REVEALED) {
                throw new RoomException(ErrorCode.WRONG_PHASE);
            }
            if (value == null || !room.deck().contains(value) || Deck.isSpecial(value)) {
                throw new RoomException(ErrorCode.INVALID_INPUT);
            }
            round.finalizeWith(value);
            room.currentTicket().ifPresent(ticket -> ticket.estimate(value));
            archiveIfRevealed(room);
            room.touch(clock.instant());
        });
        stats.ticketFinalized();
        log.info("event=poker.finalize room={}", room.code());
        rooms.broadcast(room);
    }

    /** Oy verip ayrılan (ya da başka bir) kişinin oyunu sayımdan çıkar/geri al. Yalnızca açılmış turda. */
    public void excludeVote(String code, String actorId, String participantId, boolean excluded) {
        Room room = rooms.require(code);
        room.withLock(() -> {
            RoomService.requireModerator(room, actorId);
            PokerRound round = room.round();
            if (round.state() != PokerRound.State.REVEALED) {
                throw new RoomException(ErrorCode.WRONG_PHASE);
            }
            if (!round.hasVoted(participantId)) {
                throw new RoomException(ErrorCode.INVALID_INPUT);
            }
            round.setExcluded(participantId, excluded);
            room.touch(clock.instant());
        });
        rooms.broadcast(room);
    }

    /** Deste değişir; mevcut turun oyları sıfırlanır ve herkes bilgilendirilir. */
    public void setDeck(String code, String actorId, String rawDeck, List<String> customCards) {
        Room room = rooms.require(code);
        Deck deck = Validation.deck(rawDeck, customCards);
        room.withLock(() -> {
            RoomService.requireModerator(room, actorId);
            archiveIfRevealed(room);
            room.setDeck(deck);
            PokerRound old = room.round();
            room.startRound(old.ticketId(), old.isVoting() ? old.number() : old.number() + 1, old.topic());
            room.touch(clock.instant());
        });
        log.info("event=poker.deck_changed room={}", room.code());
        events.deckChanged(room.code(), deck.id());
        rooms.broadcast(room);
    }

    // ---------------------------------------------------------------- ticket kuyruğu

    /** Bir ya da birden çok ticket ekler (toplu yapıştırma). Hepsi geçerliyse eklenir, biri bile değilse hiçbiri. */
    public void addTickets(String code, String actorId, List<NewTicket> raw) {
        if (raw == null || raw.isEmpty()) {
            throw new RoomException(ErrorCode.INVALID_TICKET);
        }
        List<Ticket> fresh = new ArrayList<>();
        for (NewTicket t : raw) {
            if (t == null) {
                throw new RoomException(ErrorCode.INVALID_TICKET);
            }
            fresh.add(new Ticket(ids.ticketId(), Validation.ticketTitle(t.title()),
                    Validation.ticketLink(t.link()), Validation.ticketNote(t.note())));
        }
        Room room = rooms.require(code);
        room.withLock(() -> {
            requireTicketsEnabled(room);
            RoomService.requireModerator(room, actorId);
            if (room.tickets().size() + fresh.size() > MAX_TICKETS) {
                throw new RoomException(ErrorCode.TICKET_LIMIT);
            }
            room.tickets().addAll(fresh);
            // Henüz ticket seçili değilse ve tur boşsa ilk ticket'ı masaya getir.
            if (room.currentTicketId() == null && room.round().isVoting() && room.round().votes().isEmpty()) {
                room.startRound(fresh.getFirst().id(), 1);
            }
            room.touch(clock.instant());
        });
        rooms.broadcast(room);
    }

    public void updateTicket(String code, String actorId, String ticketId, NewTicket raw) {
        String title = Validation.ticketTitle(raw == null ? null : raw.title());
        String link = Validation.ticketLink(raw.link());
        String note = Validation.ticketNote(raw.note());
        Room room = rooms.require(code);
        room.withLock(() -> {
            requireTicketsEnabled(room);
            RoomService.requireModerator(room, actorId);
            requireTicket(room, ticketId).edit(title, link, note);
            room.touch(clock.instant());
        });
        rooms.broadcast(room);
    }

    public void removeTicket(String code, String actorId, String ticketId) {
        Room room = rooms.require(code);
        room.withLock(() -> {
            requireTicketsEnabled(room);
            RoomService.requireModerator(room, actorId);
            Ticket ticket = requireTicket(room, ticketId);
            room.tickets().remove(ticket);
            if (ticketId.equals(room.currentTicketId())) {
                room.startRound(null, 1);
            }
            room.touch(clock.instant());
        });
        rooms.broadcast(room);
    }

    /** Ticket'ı kuyrukta verilen sıraya taşır (0 tabanlı, sınırlar içine kırpılır). */
    public void moveTicket(String code, String actorId, String ticketId, int toIndex) {
        Room room = rooms.require(code);
        room.withLock(() -> {
            requireTicketsEnabled(room);
            RoomService.requireModerator(room, actorId);
            Ticket ticket = requireTicket(room, ticketId);
            room.tickets().remove(ticket);
            int idx = Math.max(0, Math.min(toIndex, room.tickets().size()));
            room.tickets().add(idx, ticket);
            room.touch(clock.instant());
        });
        rooms.broadcast(room);
    }

    /** Ticket'ı masaya getirir; yeni tur başlar. Açılmış ama finallenmemiş tur geçmişe yazılır. */
    public void selectTicket(String code, String actorId, String ticketId) {
        Room room = rooms.require(code);
        room.withLock(() -> {
            requireTicketsEnabled(room);
            RoomService.requireModerator(room, actorId);
            Ticket ticket = requireTicket(room, ticketId);
            archiveIfRevealed(room);
            room.startRound(ticket.id(), ticket.history().size() + 1);
            room.touch(clock.instant());
        });
        rooms.broadcast(room);
    }

    /** Sıradaki tahmin edilmemiş ticket'a geç (mevcut olandan sonra, yoksa baştan). Kalmadıysa masa boşalır. */
    public void nextTicket(String code, String actorId) {
        Room room = rooms.require(code);
        room.withLock(() -> {
            requireTicketsEnabled(room);
            RoomService.requireModerator(room, actorId);
            archiveIfRevealed(room);
            List<Ticket> list = room.tickets();
            int start = room.currentTicket().map(list::indexOf).orElse(-1);
            Ticket next = null;
            for (int i = 1; i <= list.size(); i++) {
                Ticket t = list.get(Math.floorMod(start + i, list.size()));
                if (t.status() == Ticket.Status.PENDING && !t.id().equals(room.currentTicketId())) {
                    next = t;
                    break;
                }
            }
            if (next == null) {
                room.startRound(null, 1);
            } else {
                room.startRound(next.id(), next.history().size() + 1);
            }
            room.touch(clock.instant());
        });
        rooms.broadcast(room);
    }

    // ---------------------------------------------------------------- isteğe bağlı ticket / serbest tur

    /**
     * Ticket listesini açar/kapatır. Kapatınca ticket'lar silinmez, gizlenir; masada ticket varsa
     * açık tur o ticket'ın geçmişine yazılır ve yeni serbest tur başlar. Açınca masa boşsa
     * sıradaki tahmin edilmemiş ticket masaya gelir.
     */
    public void setTicketsEnabled(String code, String actorId, boolean enabled) {
        Room room = rooms.require(code);
        boolean changed = room.withLock(() -> {
            RoomService.requireModerator(room, actorId);
            if (room.ticketsEnabled() == enabled) {
                return false;
            }
            room.setTicketsEnabled(enabled);
            PokerRound round = room.round();
            if (!enabled && round.ticketId() != null) {
                archiveIfRevealed(room);
                room.startRound(null, 1, null);
            } else if (enabled && round.ticketId() == null && round.isVoting() && round.votes().isEmpty()) {
                room.tickets().stream().filter(t -> t.status() == Ticket.Status.PENDING).findFirst()
                        .ifPresent(t -> room.startRound(t.id(), t.history().size() + 1));
            }
            room.touch(clock.instant());
            return true;
        });
        if (!changed) {
            return;
        }
        if (enabled) {
            stats.ticketsEnabled(room.code());
        }
        log.info("event=room.tickets_enabled room={} enabled={}", room.code(), enabled);
        rooms.broadcast(room);
    }

    /** Ticket'sız turun konusu ("Ne oylanıyor?"). Masada ticket varsa yazılamaz. */
    public void setTopic(String code, String actorId, String rawTopic) {
        String topic = Validation.topic(rawTopic);
        Room room = rooms.require(code);
        room.withLock(() -> {
            RoomService.requireModerator(room, actorId);
            if (room.round().ticketId() != null) {
                throw new RoomException(ErrorCode.WRONG_PHASE);
            }
            room.round().setTopic(topic);
            room.touch(clock.instant());
        });
        rooms.broadcast(room);
    }

    // ---------------------------------------------------------------- eğlenceli dokunuşlar

    /** Krupiye oy vermeyen bir katılımcıyı dürter. Kişi başına 30 sn'de bir. */
    public void nudge(String code, String actorId, String targetId) {
        Room room = rooms.require(code);
        room.withLock(() -> {
            RoomService.requireModerator(room, actorId);
            Participant target = room.participant(targetId == null ? "" : targetId)
                    .orElseThrow(() -> new RoomException(ErrorCode.INVALID_INPUT));
            if (target.id().equals(actorId) || target.observer()) {
                throw new RoomException(ErrorCode.INVALID_INPUT);
            }
            if (!room.round().isVoting() || room.round().hasVoted(target.id())) {
                throw new RoomException(ErrorCode.WRONG_PHASE);
            }
            if (!nudges.tryAcquire(room.code() + "|" + target.id())) {
                throw new RoomException(ErrorCode.RATE_LIMITED);
            }
        });
        events.nudged(room.code(), targetId);
    }

    /** Masaya emoji fırlatır (izleyiciler dahil herkes). Saklanmaz; kişi başına hız sınırlı. */
    public void throwEmoji(String code, String actorId, String rawEmoji) {
        String emoji = Validation.tableEmoji(rawEmoji);
        Room room = rooms.require(code);
        room.withLock(() -> {
            room.participant(actorId).orElseThrow(() -> new RoomException(ErrorCode.FORBIDDEN));
            if (!emojis.tryAcquire(room.code() + "|" + actorId)) {
                throw new RoomException(ErrorCode.RATE_LIMITED);
            }
        });
        events.emoji(room.code(), actorId, emoji);
    }

    /** Süresi dolmuş hız sınırı pencerelerini temizler (zamanlanmış görev çağırır). */
    public void purgeLimiters() {
        nudges.purge();
        emojis.purge();
    }

    // ---------------------------------------------------------------- zamanlayıcı

    public void startTimer(String code, String actorId, int seconds) {
        if (seconds < TIMER_MIN_SECONDS || seconds > TIMER_MAX_SECONDS) {
            throw new RoomException(ErrorCode.INVALID_INPUT);
        }
        Room room = rooms.require(code);
        room.withLock(() -> {
            RoomService.requireModerator(room, actorId);
            room.startTimer(seconds, clock.instant());
            room.touch(clock.instant());
        });
        rooms.broadcast(room);
    }

    public void stopTimer(String code, String actorId) {
        Room room = rooms.require(code);
        room.withLock(() -> {
            RoomService.requireModerator(room, actorId);
            room.stopTimer();
        });
        rooms.broadcast(room);
    }

    // ---------------------------------------------------------------- gözlemci / katılımcı

    /**
     * Gözlemci ↔ katılımcı geçişi. Kişinin kendisi ya da moderatör yapabilir.
     * Açık turda oy vermiş biri gözlemciye geçemez (oyu sayılır mı belirsiz kalmasın).
     */
    public void setObserver(String code, String actorId, String targetId, boolean observer) {
        Room room = rooms.require(code);
        String target = targetId == null || targetId.isBlank() ? actorId : targetId;
        room.withLock(() -> {
            if (!target.equals(actorId)) {
                RoomService.requireModerator(room, actorId);
            }
            Participant p = room.participant(target).orElseThrow(() -> new RoomException(ErrorCode.INVALID_INPUT));
            if (observer && room.round().isVoting() && room.round().hasVoted(target)) {
                throw new RoomException(ErrorCode.ALREADY_VOTED);
            }
            p.setObserver(observer);
            room.touch(clock.instant());
        });
        rooms.broadcast(room);
    }

    // ---------------------------------------------------------------- yardımcılar

    private static void requireTicketsEnabled(Room room) {
        if (!room.ticketsEnabled()) {
            throw new RoomException(ErrorCode.FEATURE_DISABLED);
        }
    }

    private static Ticket requireTicket(Room room, String ticketId) {
        return room.ticket(ticketId).orElseThrow(() -> new RoomException(ErrorCode.INVALID_INPUT));
    }

    /**
     * Açılmış (REVEALED/FINALIZED) turu, henüz yazılmadıysa kaydeder: ticket'a aitse o ticket'ın geçmişine,
     * ticket'sız (serbest) turdaysa konusuyla birlikte oturum geçmişine.
     */
    private static void archiveIfRevealed(Room room) {
        PokerRound round = room.round();
        if (round.isVoting() || round.archived()) {
            return;
        }
        var votes = RoomService.voteViews(room, round);
        var statistics = RoomService.statistics(room.deck(), round);
        if (round.ticketId() == null) {
            room.addSessionRecord(new SessionRoundView(round.topic(), round.number(), votes, statistics,
                    round.finalEstimate()));
        } else {
            room.ticket(round.ticketId()).ifPresent(t -> t.addHistory(new RoundRecordView(round.number(), votes,
                    statistics, round.finalEstimate())));
        }
        round.markArchived();
    }
}
