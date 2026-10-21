package com.sprintmasasi.room;

import com.sprintmasasi.room.Retro.Card;
import com.sprintmasasi.room.RoomViews.PersonView;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Retrospektif (retro.* niyetleri). Akış: krupiye başlatır → herkes yazar ve beğenir (kartlar herkese açık) →
 * krupiye konuşmaya geçer (sütunlar soldan sağa, beğeniye göre) → özet. Kimse başkasının kartını değiştiremez
 * ya da silemez, krupiye de. Anonim panoda yazar bilgisi odaya hiç yayınlanmaz; kişi kendi kartlarını
 * kendisine özel olaydan (events.yourRetro) bilir.
 */
@Service
public class RetroService {

    private static final Logger log = LoggerFactory.getLogger(RetroService.class);

    public static final int MAX_CARDS = 300;
    public static final int MAX_CARDS_PER_PERSON = 40;
    /** 0 = süresiz; aksi halde 30 sn - 1 saat. */
    public static final int MIN_WRITE_SECONDS = 30;
    public static final int MAX_WRITE_SECONDS = 3600;
    public static final int DEFAULT_WRITE_SECONDS = 480;
    /** Kişi başına 10 sn'de en fazla 8 kart ve 40 beğeni hareketi. */
    public static final int CARD_BURST = 8;
    public static final int LIKE_BURST = 40;
    public static final Duration WINDOW = Duration.ofSeconds(10);

    private final RoomService rooms;
    private final RoomEvents events;
    private final SecureIds ids;
    private final Clock clock;
    private final RateLimiter cardLimiter;
    private final RateLimiter likeLimiter;

    public RetroService(RoomService rooms, RoomEvents events, SecureIds ids, Clock clock) {
        this.rooms = rooms;
        this.events = events;
        this.ids = ids;
        this.clock = clock;
        this.cardLimiter = new RateLimiter(clock, CARD_BURST, WINDOW);
        this.likeLimiter = new RateLimiter(clock, LIKE_BURST, WINDOW);
    }

    /** Krupiye retroyu başlatır. Süren bir retro varken (özet hariç) yenisi açılmaz. */
    public void start(String code, String actorId, boolean anonymous, Integer rawSeconds) {
        int seconds = rawSeconds == null ? DEFAULT_WRITE_SECONDS : rawSeconds;
        if (seconds != 0 && (seconds < MIN_WRITE_SECONDS || seconds > MAX_WRITE_SECONDS)) {
            throw new RoomException(ErrorCode.INVALID_INPUT);
        }
        Room room = rooms.require(code);
        room.withLock(() -> {
            RoomService.requireModerator(room, actorId);
            Retro old = room.retro();
            if (old != null && old.phase() != Retro.Phase.DONE) {
                throw new RoomException(ErrorCode.WRONG_PHASE);
            }
            room.setRetro(new Retro(ids.ticketId(), anonymous, seconds, clock.instant()));
            room.touch(clock.instant());
        });
        log.info("event=retro.start room={}", room.code());
        rooms.broadcast(room);
    }

    /**
     * Kart ekler. Yazma aşamasında herkes her sütuna yazar; konuşma aşamasında yalnızca krupiye ve yalnızca
     * aksiyon sütununa ("Aksiyon çıkar": sourceId konuşulan kart).
     */
    public void addCard(String code, String actorId, int column, String rawText, String sourceId) {
        String text = Validation.retroText(rawText);
        if (column < 0 || column >= Retro.COLUMNS) {
            throw new RoomException(ErrorCode.INVALID_INPUT);
        }
        Room room = rooms.require(code);
        if (!cardLimiter.tryAcquire(room.code() + ":" + actorId)) {
            throw new RoomException(ErrorCode.RATE_LIMITED);
        }
        var mine = room.withLock(() -> {
            Participant me = room.participant(actorId).orElseThrow(() -> new RoomException(ErrorCode.FORBIDDEN));
            Retro retro = requireRetro(room);
            if (retro.phase() == Retro.Phase.DONE) {
                throw new RoomException(ErrorCode.WRONG_PHASE);
            }
            if (retro.phase() == Retro.Phase.DISCUSSING && (!me.moderator() || column != Retro.ACTION_COLUMN)) {
                throw new RoomException(ErrorCode.FORBIDDEN);
            }
            if (retro.cardCount() >= MAX_CARDS || retro.countBy(actorId) >= MAX_CARDS_PER_PERSON) {
                throw new RoomException(ErrorCode.RETRO_LIMIT);
            }
            String srcId = null;
            String srcText = null;
            if (sourceId != null && !sourceId.isBlank()) {
                if (column != Retro.ACTION_COLUMN) {
                    throw new RoomException(ErrorCode.INVALID_INPUT);
                }
                Card src = retro.card(sourceId).filter(c -> !c.isAction())
                        .orElseThrow(() -> new RoomException(ErrorCode.INVALID_INPUT));
                srcId = src.id();
                srcText = src.text();
            }
            retro.add(ids.ticketId(), column, text, new PersonView(me.id(), me.nickname(), me.avatar()), srcId, srcText);
            if (retro.phase() == Retro.Phase.DISCUSSING) {
                retro.normalizeFocus(clock.instant());
            }
            room.touch(clock.instant());
            return retro.yourRetro(actorId);
        });
        events.yourRetro(room.code(), actorId, mine);
        rooms.broadcast(room);
    }

    /** Yalnızca kartın yazarı düzenler. */
    public void editCard(String code, String actorId, String cardId, String rawText) {
        String text = Validation.retroText(rawText);
        Room room = rooms.require(code);
        room.withLock(() -> {
            Retro retro = requireRetro(room);
            Card card = ownCard(room, retro, actorId, cardId);
            card.setText(text);
            room.touch(clock.instant());
        });
        rooms.broadcast(room);
    }

    /** Yalnızca kartın yazarı siler (krupiye başkasının kartını silemez). */
    public void deleteCard(String code, String actorId, String cardId) {
        Room room = rooms.require(code);
        var mine = room.withLock(() -> {
            Retro retro = requireRetro(room);
            ownCard(room, retro, actorId, cardId);
            retro.remove(cardId);
            if (retro.phase() == Retro.Phase.DISCUSSING) {
                retro.normalizeFocus(clock.instant());
            }
            room.touch(clock.instant());
            return retro.yourRetro(actorId);
        });
        events.yourRetro(room.code(), actorId, mine);
        rooms.broadcast(room);
    }

    /** Beğen ya da beğeniyi geri al (yalnızca yazma aşamasında; sıra konuşmada sabit kalsın). */
    public void like(String code, String actorId, String cardId, boolean liked) {
        Room room = rooms.require(code);
        if (!likeLimiter.tryAcquire(room.code() + ":" + actorId)) {
            throw new RoomException(ErrorCode.RATE_LIMITED);
        }
        var mine = room.withLock(() -> {
            room.participant(actorId).orElseThrow(() -> new RoomException(ErrorCode.FORBIDDEN));
            Retro retro = requireRetro(room);
            if (retro.phase() != Retro.Phase.WRITING) {
                throw new RoomException(ErrorCode.WRONG_PHASE);
            }
            Card card = retro.card(cardId).orElseThrow(() -> new RoomException(ErrorCode.INVALID_INPUT));
            if (liked) {
                card.likes().add(actorId);
            } else {
                card.likes().remove(actorId);
            }
            room.touch(clock.instant());
            return retro.yourRetro(actorId);
        });
        events.yourRetro(room.code(), actorId, mine);
        rooms.broadcast(room);
    }

    /** Krupiye yazma aşamasından konuşmaya geçer; odak ilk karttır. */
    public void startDiscussion(String code, String actorId) {
        change(code, actorId, retro -> {
            if (retro.phase() != Retro.Phase.WRITING) {
                throw new RoomException(ErrorCode.WRONG_PHASE);
            }
            retro.setPhase(Retro.Phase.DISCUSSING);
            retro.resetFocus(clock.instant());
        });
    }

    /** Konuşmadan yazmaya geri dön (kartlar ve beğeniler olduğu gibi kalır). */
    public void backToWriting(String code, String actorId) {
        change(code, actorId, retro -> {
            if (retro.phase() != Retro.Phase.DISCUSSING) {
                throw new RoomException(ErrorCode.WRONG_PHASE);
            }
            retro.setPhase(Retro.Phase.WRITING);
        });
    }

    /** Odağı delta kadar kaydırır (+1 sonraki, -1 önceki); uçlarda durur. */
    public void step(String code, String actorId, int delta) {
        if (delta != 1 && delta != -1) {
            throw new RoomException(ErrorCode.INVALID_INPUT);
        }
        change(code, actorId, retro -> {
            requireDiscussing(retro);
            retro.focusAt(retro.focusIndex() + delta, clock.instant());
        });
    }

    /** Odağı doğrudan bir karta alır (listeden tıklama). */
    public void focus(String code, String actorId, String cardId) {
        change(code, actorId, retro -> {
            requireDiscussing(retro);
            int idx = -1;
            List<Card> order = retro.discussionOrder();
            for (int i = 0; i < order.size(); i++) {
                if (order.get(i).id().equals(cardId)) {
                    idx = i;
                }
            }
            if (idx < 0) {
                throw new RoomException(ErrorCode.INVALID_INPUT);
            }
            retro.focusAt(idx, clock.instant());
        });
    }

    /** Aksiyonun sahibi ve tarihi (krupiye). ownerId null/boş = sahipsiz; due boş = tarih yok. */
    public void setAction(String code, String actorId, String cardId, String ownerId, String rawDue) {
        String due = Validation.retroDue(rawDue);
        Room room = rooms.require(code);
        room.withLock(() -> {
            RoomService.requireModerator(room, actorId);
            Retro retro = requireRetro(room);
            requireDiscussing(retro);
            Card card = retro.card(cardId).filter(Card::isAction)
                    .orElseThrow(() -> new RoomException(ErrorCode.INVALID_INPUT));
            PersonView owner = null;
            if (ownerId != null && !ownerId.isBlank()) {
                Participant p = room.participant(ownerId).orElseThrow(() -> new RoomException(ErrorCode.INVALID_INPUT));
                owner = new PersonView(p.id(), p.nickname(), p.avatar());
            }
            card.setOwner(owner);
            card.setDue(due);
            room.touch(clock.instant());
        });
        rooms.broadcast(room);
    }

    /** Konuşma bitti: özet. */
    public void finish(String code, String actorId) {
        change(code, actorId, retro -> {
            requireDiscussing(retro);
            retro.setPhase(Retro.Phase.DONE);
        });
        log.info("event=retro.finish room={}", code);
    }

    /** Özetten konuşmaya geri dön. */
    public void reopen(String code, String actorId) {
        change(code, actorId, retro -> {
            if (retro.phase() != Retro.Phase.DONE) {
                throw new RoomException(ErrorCode.WRONG_PHASE);
            }
            retro.setPhase(Retro.Phase.DISCUSSING);
            retro.normalizeFocus(clock.instant());
        });
    }

    /** Retroyu kapatır, masaya dönülür (kartlar silinir; dışa aktarma istemcide yapılır). */
    public void close(String code, String actorId) {
        Room room = rooms.require(code);
        room.withLock(() -> {
            RoomService.requireModerator(room, actorId);
            requireRetro(room);
            room.setRetro(null);
            room.touch(clock.instant());
        });
        log.info("event=retro.close room={}", room.code());
        rooms.broadcast(room);
    }

    /** Süresi dolmuş sınırlayıcı pencerelerini temizler (RoomJanitor). */
    void purgeLimiters() {
        cardLimiter.purge();
        likeLimiter.purge();
    }

    // ---------------------------------------------------------------- yardımcılar

    private void change(String code, String actorId, java.util.function.Consumer<Retro> action) {
        Room room = rooms.require(code);
        room.withLock(() -> {
            RoomService.requireModerator(room, actorId);
            action.accept(requireRetro(room));
            room.touch(clock.instant());
        });
        rooms.broadcast(room);
    }

    private static Retro requireRetro(Room room) {
        Retro retro = room.retro();
        if (retro == null) {
            throw new RoomException(ErrorCode.WRONG_PHASE);
        }
        return retro;
    }

    private static void requireDiscussing(Retro retro) {
        if (retro.phase() != Retro.Phase.DISCUSSING) {
            throw new RoomException(ErrorCode.WRONG_PHASE);
        }
    }

    /** Kendi kartı (özet aşamasında değişiklik yok). Başkasının kartı için FORBIDDEN. */
    private static Card ownCard(Room room, Retro retro, String actorId, String cardId) {
        room.participant(actorId).orElseThrow(() -> new RoomException(ErrorCode.FORBIDDEN));
        if (retro.phase() == Retro.Phase.DONE) {
            throw new RoomException(ErrorCode.WRONG_PHASE);
        }
        Card card = retro.card(cardId).orElseThrow(() -> new RoomException(ErrorCode.INVALID_INPUT));
        if (!card.authorId().equals(actorId)) {
            throw new RoomException(ErrorCode.FORBIDDEN);
        }
        return card;
    }
}
