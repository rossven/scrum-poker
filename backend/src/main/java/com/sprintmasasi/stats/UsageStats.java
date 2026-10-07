package com.sprintmasasi.stats;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.stereotype.Component;

/**
 * Kişisel veri içermeyen kullanım sayaçları (bellekte).
 * İsim, avatar, ticket başlığı, oy değeri gibi içerik burada asla tutulmaz; yalnızca sayılar.
 */
@Component
public class UsageStats {

    /** Odadaki ilk ve son bağlantı hareketi; oturum süresi = son - ilk. */
    private record Session(Instant first, Instant last) {}

    private final AtomicLong roomsCreated = new AtomicLong();
    private final ConcurrentMap<String, Integer> peakOnlineByRoom = new ConcurrentHashMap<>();
    private final AtomicLong peakOnlineEver = new AtomicLong();
    private final AtomicLong pokerRoundsRevealed = new AtomicLong();
    private final AtomicLong ticketsFinalized = new AtomicLong();
    private final ConcurrentMap<String, AtomicLong> assignmentGamesByType = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Session> sessionsByRoom = new ConcurrentHashMap<>();
    /** Ticket listesini en az bir kez açan odalar (yalnızca oda kodu; ticket içeriği yazılmaz). */
    private final Set<String> ticketsEnabledRooms = ConcurrentHashMap.newKeySet();

    public void roomCreated() {
        roomsCreated.incrementAndGet();
    }

    public void participantsOnline(String roomCode, int online) {
        peakOnlineByRoom.merge(roomCode, online, Math::max);
        peakOnlineEver.accumulateAndGet(online, Math::max);
    }

    /** Odada bağlantı hareketi (bağlanma/kopma) oldu. */
    public void roomActivity(String roomCode, Instant now) {
        sessionsByRoom.merge(roomCode, new Session(now, now), (old, ignored) -> new Session(old.first(), now));
    }

    /** Bir poker turu açıldı (kartlar çevrildi). */
    public void pokerRoundRevealed() {
        pokerRoundsRevealed.incrementAndGet();
    }

    /** Bir ticket için final tahmin onaylandı. */
    public void ticketFinalized() {
        ticketsFinalized.incrementAndGet();
    }

    /** Odada ticket listesi açıldı (oda açılırken ya da sonradan). */
    public void ticketsEnabled(String roomCode) {
        ticketsEnabledRooms.add(roomCode);
    }

    /** Atama oyunu başladı (M3). type: oyun tipi kimliği, ör. "wheel". */
    public void assignmentGameStarted(String type) {
        assignmentGamesByType.computeIfAbsent(type, k -> new AtomicLong()).incrementAndGet();
    }

    public Map<String, Object> snapshot() {
        var out = new LinkedHashMap<String, Object>();
        out.put("roomsCreated", roomsCreated.get());
        out.put("roomsWithActivity", peakOnlineByRoom.size());
        out.put("peakConcurrentParticipantsInARoom", peakOnlineEver.get());
        out.put("averagePeakParticipants", peakOnlineByRoom.values().stream().mapToInt(i -> i).average().orElse(0));
        out.put("pokerRoundsRevealed", pokerRoundsRevealed.get());
        out.put("ticketsFinalized", ticketsFinalized.get());
        out.put("ticketsEnabledRooms", ticketsEnabledRooms.size());
        var games = new LinkedHashMap<String, Long>();
        assignmentGamesByType.forEach((k, v) -> games.put(k, v.get()));
        out.put("assignmentGamesStarted", games);
        out.put("averageSessionMinutes", sessionsByRoom.values().stream()
                .mapToLong(s -> Duration.between(s.first(), s.last()).toSeconds())
                .average().orElse(0) / 60.0);
        return out;
    }
}
