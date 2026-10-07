package com.sprintmasasi.ws;

import java.lang.reflect.Type;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.TimeUnit;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

/** Testlerde gerçek bir tarayıcı gibi davranan sahte STOMP istemcisi. */
class TestStompClient {

    final List<Map<String, Object>> received = new CopyOnWriteArrayList<>();
    final StompSession session;

    private TestStompClient(StompSession session) {
        this.session = session;
    }

    static TestStompClient connect(int port, String room, String token) throws Exception {
        var client = new WebSocketStompClient(new StandardWebSocketClient());
        client.setMessageConverter(new MappingJackson2MessageConverter());
        var connectHeaders = new StompHeaders();
        connectHeaders.add("room", room);
        connectHeaders.add("token", token);
        StompSession session = client.connectAsync("ws://localhost:" + port + "/ws", new WebSocketHttpHeaders(),
                connectHeaders, new StompSessionHandlerAdapter() {}).get(5, TimeUnit.SECONDS);
        var c = new TestStompClient(session);
        c.subscribe("/topic/room/" + room);
        c.subscribe("/user/queue/room");
        c.subscribe("/user/queue/errors");
        return c;
    }

    private void subscribe(String destination) {
        session.subscribe(destination, new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return Map.class;
            }

            @Override
            @SuppressWarnings("unchecked")
            public void handleFrame(StompHeaders headers, Object payload) {
                received.add((Map<String, Object>) payload);
            }
        });
    }

    void send(String event, Object payload) {
        session.send("/app/" + event, payload == null ? Map.of() : payload);
    }

    @SuppressWarnings("unchecked")
    Map<String, Object> lastOfType(String type) {
        for (int i = received.size() - 1; i >= 0; i--) {
            if (type.equals(received.get(i).get("type"))) {
                return (Map<String, Object>) received.get(i).get("data");
            }
        }
        return null;
    }

    /** En son bilinen oda durumu: room.state veya kişisel room.state_snapshot, hangisi sonra geldiyse. */
    @SuppressWarnings("unchecked")
    List<Map<String, Object>> lastParticipants() {
        for (int i = received.size() - 1; i >= 0; i--) {
            Object type = received.get(i).get("type");
            Map<String, Object> data = (Map<String, Object>) received.get(i).get("data");
            if ("room.state".equals(type)) {
                return (List<Map<String, Object>>) data.get("participants");
            }
            if ("room.state_snapshot".equals(type)) {
                return (List<Map<String, Object>>) ((Map<String, Object>) data.get("room")).get("participants");
            }
        }
        return List.of();
    }

    void disconnect() {
        if (session.isConnected()) {
            session.disconnect();
        }
    }
}
