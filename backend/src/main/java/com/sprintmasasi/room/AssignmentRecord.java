package com.sprintmasasi.room;

import com.sprintmasasi.room.RoomViews.AssignmentRecordView;
import com.sprintmasasi.room.RoomViews.PersonView;
import java.time.Instant;
import java.util.List;

/**
 * Atama geçmişindeki bir sonuç. Kişiler o anki isim/avatarlarıyla saklanır (sonradan çıksalar da görünür).
 * Krupiye geri alırsa silinmez, "geri alındı" olarak kalır.
 */
class AssignmentRecord {

    private final String id;
    private final String ticketId;
    /** Sonucun verildiği oylama turu (serbest turda tahmin buna göre eşlenir). */
    private final long roundId;
    private final String title;
    /** Oyun kimliği ("horse", "wheel") ya da tek aday kaldıysa "volunteer" / "direct". */
    private final String game;
    private final List<PersonView> ranking;
    private final List<PersonView> candidates;
    private final boolean weighted;
    private final Instant at;
    private boolean undone;
    /** İşin final tahmini (kart değeri); atama tahminden önce yapıldıysa sonradan yazılır, null = henüz yok. */
    private String estimate;

    AssignmentRecord(String id, String ticketId, long roundId, String title, String game, List<PersonView> ranking,
                     List<PersonView> candidates, boolean weighted, String estimate, Instant at) {
        this.id = id;
        this.ticketId = ticketId;
        this.roundId = roundId;
        this.estimate = estimate;
        this.title = title;
        this.game = game;
        this.ranking = List.copyOf(ranking);
        this.candidates = List.copyOf(candidates);
        this.weighted = weighted;
        this.at = at;
    }

    String id() { return id; }
    String ticketId() { return ticketId; }
    long roundId() { return roundId; }
    String estimate() { return estimate; }
    void setEstimate(String estimate) { this.estimate = estimate; }
    PersonView winner() { return ranking.getFirst(); }
    List<PersonView> candidates() { return candidates; }
    boolean undone() { return undone; }
    void markUndone() { undone = true; }

    AssignmentRecordView view() {
        return new AssignmentRecordView(id, ticketId, title, game, winner(), ranking, candidates, weighted,
                at.toString(), undone);
    }
}
