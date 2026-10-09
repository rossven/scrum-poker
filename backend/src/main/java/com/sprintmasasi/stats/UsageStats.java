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

    // Silinen odalar oda koduyla tutulmaz; yalnızca toplamlara eklenir (bellek ve gizlilik).
    private final AtomicLong closedRoomsWithActivity = new AtomicLong();
    private final AtomicLong closedPeakSum = new AtomicLong();
    private final AtomicLong closedSessions = new AtomicLong();
    private final AtomicLong closedSessionSecondsSum = new AtomicLong();
    private final AtomicLong closedTicketsEnabledRooms = new AtomicLong();

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

    /** Oda kapandı ya da süresi doldu: oda koduna bağlı kayıtlar silinir, sayıları toplamlara eklenir. */
    public void roomRemoved(String roomCode) {
        Integer peak = peakOnlineByRoom.remove(roomCode);
        if (peak != null) {
            closedRoomsWithActivity.incrementAndGet();
            closedPeakSum.addAndGet(peak);
        }
        Session session = sessionsByRoom.remove(roomCode);
        if (session != null) {
            closedSessions.incrementAndGet();
            closedSessionSecondsSum.addAndGet(Duration.between(session.first(), session.last()).toSeconds());
        }
        if (ticketsEnabledRooms.remove(roomCode)) {
            closedTicketsEnabledRooms.incrementAndGet();
        }
    }

    /** Oda koduyla tutulan kayıt sayısı (testler: silinen odalar birikmemeli). */
    public int trackedRooms() {
        return peakOnlineByRoom.size() + sessionsByRoom.size() + ticketsEnabledRooms.size();
    }

    public Map<String, Object> snapshot() {
        var out = new LinkedHashMap<String, Object>();
        out.put("roomsCreated", roomsCreated.get());
        long roomsWithActivity = peakOnlineByRoom.size() + closedRoomsWithActivity.get();
        long peakSum = peakOnlineByRoom.values().stream().mapToLong(i -> i).sum() + closedPeakSum.get();
        out.put("roomsWithActivity", roomsWithActivity);
        out.put("peakConcurrentParticipantsInARoom", peakOnlineEver.get());
        out.put("averagePeakParticipants", roomsWithActivity == 0 ? 0.0 : (double) peakSum / roomsWithActivity);
        out.put("pokerRoundsRevealed", pokerRoundsRevealed.get());
        out.put("ticketsFinalized", ticketsFinalized.get());
        out.put("ticketsEnabledRooms", ticketsEnabledRooms.size() + closedTicketsEnabledRooms.get());
        var games = new LinkedHashMap<String, Long>();
        assignmentGamesByType.forEach((k, v) -> games.put(k, v.get()));
        out.put("assignmentGamesStarted", games);
        long sessions = sessionsByRoom.size() + closedSessions.get();
        long sessionSeconds = sessionsByRoom.values().stream()
                .mapToLong(s -> Duration.between(s.first(), s.last()).toSeconds()).sum() + closedSessionSecondsSum.get();
        out.put("averageSessionMinutes", sessions == 0 ? 0.0 : sessionSeconds / 60.0 / sessions);
        return out;
    }
}
