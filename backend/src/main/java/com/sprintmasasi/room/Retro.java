package com.sprintmasasi.room;

import com.sprintmasasi.room.RoomViews.PersonView;
import com.sprintmasasi.room.RoomViews.RetroCardView;
import com.sprintmasasi.room.RoomViews.RetroView;
import com.sprintmasasi.room.RoomViews.TimerView;
import com.sprintmasasi.room.RoomViews.YourRetro;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.LinkedHashSet;

/**
 * Odanın retrospektifi (oda başına en fazla bir tane). Room kilidi altında değiştirilir.
 * WRITING (yaz ve beğen) → DISCUSSING (konuş) → DONE (özet). Pano üç sütundur; üçüncüsü aksiyonlardır.
 */
class Retro {

    enum Phase { WRITING, DISCUSSING, DONE }

    static final int ACTION_COLUMN = 2;
    static final int COLUMNS = 3;

    /** Kartın sunucudaki hali. authorId asla odaya yayınlanmaz (anonimken hiç, değilken author olarak gider). */
    static final class Card {
        private final String id;
        private final int column;
        private final long seq;
        private final String authorId;
        private final PersonView author;
        private String text;
        private final Set<String> likes = new LinkedHashSet<>();
        private final String sourceId;
        private final String sourceText;
        private PersonView owner;
        private String due;

        Card(String id, int column, long seq, String text, PersonView author, String sourceId, String sourceText) {
            this.id = id;
            this.column = column;
            this.seq = seq;
            this.text = text;
            this.authorId = author.participantId();
            this.author = author;
            this.sourceId = sourceId;
            this.sourceText = sourceText;
        }

        String id() { return id; }
        int column() { return column; }
        String text() { return text; }
        String authorId() { return authorId; }
        Set<String> likes() { return likes; }
        PersonView owner() { return owner; }
        void setText(String text) { this.text = text; }
        void setOwner(PersonView owner) { this.owner = owner; }
        void setDue(String due) { this.due = due; }
        boolean isAction() { return column == ACTION_COLUMN; }
    }

    private final String id;
    private final boolean anonymous;
    private final int writeSeconds;
    private final Instant timerEndsAt;
    private Phase phase = Phase.WRITING;
    private final Map<String, Card> cards = new LinkedHashMap<>();
    private long seq;
    private String focusId;
    private int focusIndex;
    private Instant focusedAt;

    Retro(String id, boolean anonymous, int writeSeconds, Instant now) {
        this.id = id;
        this.anonymous = anonymous;
        this.writeSeconds = writeSeconds;
        this.timerEndsAt = writeSeconds > 0 ? now.plusSeconds(writeSeconds) : null;
    }

    String id() { return id; }
    Phase phase() { return phase; }
    void setPhase(Phase phase) { this.phase = phase; }
    boolean anonymous() { return anonymous; }
    int cardCount() { return cards.size(); }

    Optional<Card> card(String cardId) {
        return Optional.ofNullable(cardId == null ? null : cards.get(cardId));
    }

    long countBy(String authorId) {
        return cards.values().stream().filter(c -> c.authorId.equals(authorId)).count();
    }

    Card add(String cardId, int column, String text, PersonView author, String sourceId, String sourceText) {
        Card c = new Card(cardId, column, ++seq, text, author, sourceId, sourceText);
        cards.put(cardId, c);
        return c;
    }

    void remove(String cardId) {
        cards.remove(cardId);
    }

    /**
     * Konuşma sırası: sütunlar soldan sağa, her sütun beğeniye göre (eşitse yazılış sırasına göre).
     * Aksiyonlar en sonda ve yazılış sırasında. Beğeniler konuşma sırasında kilitli olduğu için sıra sabittir.
     */
    List<Card> discussionOrder() {
        Comparator<Card> topics = Comparator.comparingInt(Card::column)
                .thenComparing((Card c) -> c.likes.size(), Comparator.reverseOrder())
                .thenComparingLong(c -> c.seq);
        List<Card> order = new ArrayList<>(cards.values().stream().filter(c -> !c.isAction()).sorted(topics).toList());
        order.addAll(cards.values().stream().filter(Card::isAction).sorted(Comparator.comparingLong(c -> c.seq)).toList());
        return order;
    }

    /** Odak kartı geçerli kalsın: silindiyse aynı sıradaki karta geçilir. */
    void normalizeFocus(Instant now) {
        List<Card> order = discussionOrder();
        if (order.isEmpty()) {
            focusId = null;
            focusIndex = 0;
            return;
        }
        int idx = -1;
        for (int i = 0; i < order.size(); i++) {
            if (order.get(i).id.equals(focusId)) {
                idx = i;
                break;
            }
        }
        if (idx < 0) {
            idx = Math.min(focusIndex, order.size() - 1);
            focusedAt = now;
        }
        focusIndex = idx;
        focusId = order.get(idx).id;
        if (focusedAt == null) {
            focusedAt = now;
        }
    }

    void focusAt(int index, Instant now) {
        List<Card> order = discussionOrder();
        if (order.isEmpty()) {
            return;
        }
        int idx = Math.max(0, Math.min(index, order.size() - 1));
        if (!order.get(idx).id.equals(focusId)) {
            focusedAt = now;
        }
        focusIndex = idx;
        focusId = order.get(idx).id;
    }

    int focusIndex() { return focusIndex; }

    void resetFocus(Instant now) {
        focusId = null;
        focusIndex = 0;
        focusedAt = now;
        normalizeFocus(now);
    }

    YourRetro yourRetro(String participantId) {
        List<String> mine = cards.values().stream().filter(c -> c.authorId.equals(participantId)).map(c -> c.id).toList();
        List<String> liked = cards.values().stream().filter(c -> c.likes.contains(participantId)).map(c -> c.id).toList();
        return new YourRetro(id, mine, liked);
    }

    RetroView view(Instant now) {
        List<RetroCardView> list = cards.values().stream().map(c -> new RetroCardView(c.id, c.column, c.text,
                c.likes.size(), anonymous ? null : c.author, c.sourceId, c.sourceText, c.owner, c.due)).toList();
        List<String> order = phase == Phase.WRITING ? List.of() : discussionOrder().stream().map(c -> c.id).toList();
        TimerView timer = timerEndsAt == null ? null
                : new TimerView(writeSeconds, Math.max(0, Duration.between(now, timerEndsAt).toMillis()));
        Long elapsed = phase == Phase.DISCUSSING && focusedAt != null
                ? Math.max(0, Duration.between(focusedAt, now).toMillis()) : null;
        return new RetroView(id, phase.name(), anonymous, writeSeconds, timer, list, order,
                phase == Phase.WRITING ? null : focusId, elapsed);
    }
}
