package com.sprintmasasi.room;

import java.time.Instant;

/**
 * Odadaki bir koltuk. Token yalnızca sunucuda tutulur, hiçbir DTO'ya girmez.
 * Room kilidi altında değiştirilir.
 */
public class Participant {

    private final String id;
    private final String token;
    private final long joinOrder;
    private final Instant joinedAt;
    private String nickname;
    private String avatar;
    private boolean observer;
    private boolean moderator;
    private int connections;
    private Instant offlineSince;

    Participant(String id, String token, long joinOrder, String nickname, String avatar, boolean observer, Instant now) {
        this.id = id;
        this.token = token;
        this.joinOrder = joinOrder;
        this.nickname = nickname;
        this.avatar = avatar;
        this.observer = observer;
        this.joinedAt = now;
        this.offlineSince = now; // katıldı ama henüz bağlanmadı
    }

    public String id() { return id; }
    String token() { return token; }
    public long joinOrder() { return joinOrder; }
    public Instant joinedAt() { return joinedAt; }
    public String nickname() { return nickname; }
    public String avatar() { return avatar; }
    public boolean observer() { return observer; }
    public boolean moderator() { return moderator; }
    public boolean online() { return connections > 0; }
    /** Çevrimdışıysa ne zamandan beri; çevrimiçiyse null. */
    Instant offlineSince() { return offlineSince; }

    void setModerator(boolean moderator) { this.moderator = moderator; }
    void setObserver(boolean observer) { this.observer = observer; }
    void connect() {
        connections++;
        offlineSince = null;
    }

    void disconnect(Instant now) {
        connections = Math.max(0, connections - 1);
        if (connections == 0) {
            offlineSince = now;
        }
    }
}
