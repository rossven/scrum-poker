package com.sprintmasasi.ws;

import com.sprintmasasi.room.RoomService;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

/** Çevrimiçi/çevrimdışı durumunu WebSocket oturumlarından türetir. */
@Component
class ConnectionListener {

    private final RoomService rooms;
    // Spring aynı oturum için disconnect olayını birden fazla kez yayınlayabilir.
    private final Set<String> liveSessions = ConcurrentHashMap.newKeySet();

    ConnectionListener(RoomService rooms) {
        this.rooms = rooms;
    }

    @EventListener
    void onConnected(SessionConnectedEvent event) {
        String sessionId = (String) event.getMessage().getHeaders().get("simpSessionId");
        if (event.getUser() instanceof RoomPrincipal p && liveSessions.add(sessionId)) {
            rooms.connected(p.roomCode(), p.participantId());
        }
    }

    @EventListener
    void onDisconnected(SessionDisconnectEvent event) {
        if (event.getUser() instanceof RoomPrincipal p && liveSessions.remove(event.getSessionId())) {
            rooms.disconnected(p.roomCode(), p.participantId());
        }
    }
}
