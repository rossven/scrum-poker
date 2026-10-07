package com.sprintmasasi.stats;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.stereotype.Component;

/**
 * Kişisel veri içermeyen kullanım sayaçları (bellekte).
 * İsim, avatar, ticket başlığı gibi içerik burada asla tutulmaz.
 * M2/M3 sayaçları (poker turu, final, atama oyunu) ilgili milestone'larda eklenecek.
 */
@Component
public class UsageStats {

    private final AtomicLong roomsCreated = new AtomicLong();
    private final ConcurrentMap<String, Integer> peakOnlineByRoom = new ConcurrentHashMap<>();
    private final AtomicLong peakOnlineEver = new AtomicLong();

    public void roomCreated() {
        roomsCreated.incrementAndGet();
    }

    public void participantsOnline(String roomCode, int online) {
        peakOnlineByRoom.merge(roomCode, online, Math::max);
        peakOnlineEver.accumulateAndGet(online, Math::max);
    }

    public Map<String, Object> snapshot() {
        var out = new LinkedHashMap<String, Object>();
        out.put("roomsCreated", roomsCreated.get());
        out.put("roomsWithActivity", peakOnlineByRoom.size());
        out.put("peakConcurrentParticipantsInARoom", peakOnlineEver.get());
        out.put("averagePeakParticipants", peakOnlineByRoom.values().stream().mapToInt(i -> i).average().orElse(0));
        return out;
    }
}
