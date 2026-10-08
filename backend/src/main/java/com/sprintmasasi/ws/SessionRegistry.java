package com.sprintmasasi.ws;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;

/**
 * Açık WebSocket oturumları: masadan atılan kişinin bağlantılarını sunucu tarafında kapatabilmek için.
 * Oturum, WebSocketConfig'teki dekoratörle kaydedilir; kimliği (oda + koltuk) STOMP CONNECT'ten sonra bağlanır.
 */
@Component
public class SessionRegistry {

    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    /** principal adı (oda:koltuk) → oturum kimlikleri */
    private final Map<String, Set<String>> byPrincipal = new ConcurrentHashMap<>();

    public void opened(WebSocketSession session) {
        sessions.put(session.getId(), session);
    }

    public void closed(String sessionId) {
        sessions.remove(sessionId);
        byPrincipal.values().forEach(ids -> ids.remove(sessionId));
    }

    void bind(String principalName, String sessionId) {
        byPrincipal.computeIfAbsent(principalName, k -> ConcurrentHashMap.newKeySet()).add(sessionId);
    }

    /** Kişinin tüm bağlantılarını kapatır. */
    void closeAll(String principalName) {
        Set<String> ids = byPrincipal.remove(principalName);
        if (ids == null) {
            return;
        }
        for (String id : ids) {
            WebSocketSession s = sessions.get(id);
            if (s != null && s.isOpen()) {
                try {
                    s.close(CloseStatus.POLICY_VIOLATION.withReason("KICKED"));
                } catch (IOException ignored) {
                    // Bağlantı zaten kopmuş olabilir.
                }
            }
        }
    }
}
