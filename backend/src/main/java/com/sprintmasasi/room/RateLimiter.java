package com.sprintmasasi.room;

import java.time.Clock;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/** Anahtar başına basit sabit pencere sayacı. Bellekte, tek sunucu için yeterli. */
public class RateLimiter {

    private record Window(long startMillis, int count) {}

    private final ConcurrentMap<String, Window> windows = new ConcurrentHashMap<>();
    private final Clock clock;
    private final int limit;
    private final long windowMillis;

    public RateLimiter(Clock clock, int limit, Duration window) {
        this.clock = clock;
        this.limit = limit;
        this.windowMillis = window.toMillis();
    }

    /** Sayacı artırır; sınır aşıldıysa false döner. */
    public boolean tryAcquire(String key) {
        long now = clock.millis();
        Window w = windows.compute(key, (k, old) ->
                old == null || now - old.startMillis >= windowMillis ? new Window(now, 1) : new Window(old.startMillis, old.count + 1));
        return w.count <= limit;
    }

    /** Sayacı artırmadan sınırın dolup dolmadığına bakar. */
    public boolean isExhausted(String key) {
        Window w = windows.get(key);
        return w != null && clock.millis() - w.startMillis < windowMillis && w.count >= limit;
    }

    public void reset(String key) {
        windows.remove(key);
    }

    /** Süresi dolmuş pencereleri temizler. */
    public void purge() {
        long now = clock.millis();
        windows.entrySet().removeIf(e -> now - e.getValue().startMillis >= windowMillis);
    }
}
