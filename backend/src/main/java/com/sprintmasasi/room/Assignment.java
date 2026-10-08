package com.sprintmasasi.room;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * "Kim alacak?" akışının o anki durumu (oda başına en fazla bir tane). Room kilidi altında değiştirilir.
 * VOLUNTEERING (gönüllü turu) → CANDIDATES (aday ayarı, oyun seçimi) → RESULT (sonuç; geri alınırsa CANDIDATES).
 */
class Assignment {

    enum Phase { VOLUNTEERING, CANDIDATES, RESULT }

    /** Oyun sonucu ve istemcinin animasyonu aynı anda başlatması için gereken bilgiler. */
    record Game(String type, Instant startsAt, int durationMs, Map<String, Object> animation) {}

    private final String id;
    private final String ticketId;
    /** Başlatıldığı andaki ticket başlığı ya da serbest turun konusu (boş olabilir). */
    private final String title;
    private final int volunteerSeconds;
    private final Set<String> volunteers = new LinkedHashSet<>();
    private final Set<String> candidates = new LinkedHashSet<>();
    private Phase phase = Phase.VOLUNTEERING;
    private Instant volunteerEndsAt;
    private AssignmentRecord result;
    private Game game;

    Assignment(String id, String ticketId, String title, int volunteerSeconds, Instant now) {
        this.id = id;
        this.ticketId = ticketId;
        this.title = title;
        this.volunteerSeconds = volunteerSeconds;
        this.volunteerEndsAt = volunteerSeconds > 0 ? now.plusSeconds(volunteerSeconds) : null;
    }

    String id() { return id; }
    String ticketId() { return ticketId; }
    String title() { return title; }
    int volunteerSeconds() { return volunteerSeconds; }
    Set<String> volunteers() { return volunteers; }
    Set<String> candidates() { return candidates; }
    Phase phase() { return phase; }
    Instant volunteerEndsAt() { return volunteerEndsAt; }
    AssignmentRecord result() { return result; }
    Game game() { return game; }

    void toCandidates(List<String> ids) {
        phase = Phase.CANDIDATES;
        volunteerEndsAt = null;
        candidates.clear();
        candidates.addAll(ids);
        result = null;
        game = null;
    }

    void toResult(AssignmentRecord record, Game game) {
        phase = Phase.RESULT;
        volunteerEndsAt = null;
        this.result = record;
        this.game = game;
    }

    /** Kişi odadan çıktı ya da atıldı: gönüllü ve aday listesinden düşer (geçmiş değişmez). */
    void forget(String participantId) {
        volunteers.remove(participantId);
        candidates.remove(participantId);
    }
}
