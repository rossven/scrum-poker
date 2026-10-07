package com.sprintmasasi.ws;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.awaitility.Awaitility.await;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"sprintmasasi.create-rooms-per-minute=1000", "sprintmasasi.messages-per-second=1000"})
class RoomWebSocketIntegrationTest {

    @LocalServerPort
    int port;

    @Autowired
    TestRestTemplate http;

    private final List<TestStompClient> clients = new ArrayList<>();

    @AfterEach
    void tearDown() {
        clients.forEach(TestStompClient::disconnect);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> createRoom(String password) {
        var body = new HashMap<String, Object>();
        body.put("name", "Test");
        body.put("password", password);
        return http.postForObject("/api/rooms", body, Map.class);
    }

    @SuppressWarnings("rawtypes")
    private ResponseEntity<Map> join(String code, String nick, Map<String, Object> extra) {
        var body = new HashMap<String, Object>();
        body.put("nickname", nick);
        body.put("avatar", "seed" + Math.abs(nick.hashCode()));
        body.putAll(extra);
        return http.postForEntity("/api/rooms/" + code + "/join", body, Map.class);
    }

    private TestStompClient connect(String code, String token) throws Exception {
        var c = TestStompClient.connect(port, code, token);
        clients.add(c);
        c.send("room.sync", null);
        return c;
    }

    @Test
    void thirtyClientsAllSeeEachOtherOnline() throws Exception {
        var room = createRoom(null);
        String code = (String) room.get("code");
        List<String> tokens = new ArrayList<>();
        for (int i = 0; i < 30; i++) {
            var extra = i == 0 ? Map.<String, Object>of("claimToken", room.get("claimToken")) : Map.<String, Object>of();
            var res = join(code, "Kişi " + i, extra);
            assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
            tokens.add((String) res.getBody().get("token"));
        }
        for (String token : tokens) {
            connect(code, token);
        }

        await().atMost(Duration.ofSeconds(10)).untilAsserted(() -> {
            for (TestStompClient c : clients) {
                var people = c.lastParticipants();
                assertThat(people).hasSize(30);
                assertThat(people).allMatch(p -> Boolean.TRUE.equals(p.get("online")));
                // Her istemci kendi kişisel anlık görüntüsünü de aldı
                assertThat(c.lastOfType("room.state_snapshot")).isNotNull();
            }
        });
    }

    @Test
    void nonModeratorPromoteIsRejectedOverWebSocket() throws Exception {
        var room = createRoom(null);
        String code = (String) room.get("code");
        var mod = join(code, "Moderatör", Map.of("claimToken", room.get("claimToken"))).getBody();
        var ali = join(code, "Ali", Map.of()).getBody();
        var bora = join(code, "Bora", Map.of()).getBody();
        connect(code, (String) mod.get("token"));
        var aliClient = connect(code, (String) ali.get("token"));

        aliClient.send("room.promote", Map.of("participantId", bora.get("participantId")));

        await().atMost(Duration.ofSeconds(5)).until(() -> aliClient.lastOfType("error") != null);
        assertThat(aliClient.lastOfType("error")).containsEntry("code", "FORBIDDEN");
        aliClient.send("room.sync", null);
        await().atMost(Duration.ofSeconds(5)).untilAsserted(() -> {
            @SuppressWarnings("unchecked")
            var people = (List<Map<String, Object>>) ((Map<String, Object>) aliClient.lastOfType("room.state_snapshot")
                    .get("room")).get("participants");
            assertThat(people).filteredOn(p -> Boolean.TRUE.equals(p.get("moderator")))
                    .extracting(p -> p.get("id")).containsExactly(mod.get("participantId"));
        });
    }

    @Test
    void connectingWithInvalidTokenFails() {
        var room = createRoom(null);
        assertThatThrownBy(() -> TestStompClient.connect(port, (String) room.get("code"), "sahte-token"))
                .isInstanceOf(Exception.class);
    }

    @Test
    void cannotSubscribeToAnotherRoomsTopic() throws Exception {
        var roomA = createRoom(null);
        var roomB = createRoom(null);
        String codeB = (String) roomB.get("code");
        var a = join((String) roomA.get("code"), "Ali", Map.of()).getBody();
        var b = join(codeB, "Bora", Map.of()).getBody();
        var bClient = connect(codeB, (String) b.get("token"));
        var spy = connect((String) roomA.get("code"), (String) a.get("token"));
        List<Object> leaked = new java.util.concurrent.CopyOnWriteArrayList<>();
        spy.session.subscribe("/topic/room/" + codeB, new org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter() {
            @Override
            public void handleFrame(org.springframework.messaging.simp.stomp.StompHeaders headers, Object payload) {
                leaked.add(payload);
            }
        });
        Thread.sleep(300);

        // B odasında olay olur: B'deki istemci görür, A'daki casus görmez.
        join(codeB, "Can", Map.of());
        await().atMost(Duration.ofSeconds(5)).until(() -> bClient.lastParticipants().size() == 2);
        Thread.sleep(300);
        assertThat(leaked).isEmpty();
    }

    @Test
    void passwordFlowOverHttpNeverEchoesPassword() {
        String secret = "cok-gizli-42";
        var room = createRoom(secret);
        String code = (String) room.get("code");

        var noPassword = join(code, "Ali", Map.of());
        var wrong = join(code, "Ali", Map.of("password", "yanlis"));
        var ok = join(code, "Ali", Map.of("password", secret));
        var rejoin = join(code, "Ali", Map.of("token", ok.getBody().get("token")));
        var info = http.getForEntity("/api/rooms/" + code, String.class);

        assertThat(noPassword.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(noPassword.getBody()).containsEntry("error", "PASSWORD_REQUIRED");
        assertThat(wrong.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(wrong.getBody()).containsEntry("error", "WRONG_PASSWORD");
        assertThat(ok.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(rejoin.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(rejoin.getBody().get("participantId")).isEqualTo(ok.getBody().get("participantId"));
        assertThat(info.getBody()).contains("\"passwordProtected\":true").doesNotContain(secret).doesNotContain("$2a$");
        for (var res : List.of(noPassword, wrong, ok, rejoin)) {
            assertThat(String.valueOf(res.getBody())).doesNotContain(secret);
        }
    }

    @Test
    void unknownRoomReturns404() {
        var res = http.getForEntity("/api/rooms/YOKBOYLE", Map.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(res.getBody()).containsEntry("error", "ROOM_NOT_FOUND");
    }
}
