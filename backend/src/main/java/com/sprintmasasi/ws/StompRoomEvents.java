package com.sprintmasasi.ws;

import com.sprintmasasi.room.ErrorCode;
import com.sprintmasasi.room.RoomEvents;
import com.sprintmasasi.room.RoomViews.RoomSnapshot;
import com.sprintmasasi.room.RoomViews.RoomState;
import com.sprintmasasi.room.RoomViews.YourVote;
import java.time.Clock;
import java.util.Map;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class StompRoomEvents implements RoomEvents {

    /** Atılan kişiye bildirim ulaşsın diye bağlantı bu kadar sonra kapatılır. */
    private static final long KICK_CLOSE_DELAY_MS = 500;

    private final SimpMessagingTemplate template;
    private final SessionRegistry sessions;
    private final TaskScheduler scheduler;
    private final Clock clock;

    public StompRoomEvents(@Lazy SimpMessagingTemplate template, SessionRegistry sessions,
                           @Lazy TaskScheduler scheduler, Clock clock) {
        this.template = template;
        this.sessions = sessions;
        this.scheduler = scheduler;
        this.clock = clock;
    }

    @Override
    public void state(String code, RoomState state) {
        template.convertAndSend(Destinations.roomTopic(code), ServerEvent.of("room.state", state));
    }

    @Override
    public void snapshot(String code, String participantId, RoomSnapshot snapshot) {
        toUser(code, participantId, Destinations.USER_ROOM_QUEUE, ServerEvent.of("room.state_snapshot", snapshot));
    }

    @Override
    public void yourVote(String code, String participantId, YourVote vote) {
        toUser(code, participantId, Destinations.USER_ROOM_QUEUE, ServerEvent.of("poker.your_vote", vote));
    }

    @Override
    public void deckChanged(String code, String deckId) {
        template.convertAndSend(Destinations.roomTopic(code),
                ServerEvent.of("poker.deck_changed", Map.of("deck", deckId)));
    }

    @Override
    public void nudged(String code, String participantId) {
        template.convertAndSend(Destinations.roomTopic(code),
                ServerEvent.of("poker.nudged", Map.of("participantId", participantId)));
    }

    @Override
    public void emoji(String code, String participantId, String emoji) {
        template.convertAndSend(Destinations.roomTopic(code),
                ServerEvent.of("table.emoji", Map.of("participantId", participantId, "emoji", emoji)));
    }

    @Override
    public void participantJoined(String code, String participantId) {
        template.convertAndSend(Destinations.roomTopic(code),
                ServerEvent.of("room.participant_joined", Map.of("participantId", participantId)));
    }

    @Override
    public void participantLeft(String code, String participantId) {
        template.convertAndSend(Destinations.roomTopic(code),
                ServerEvent.of("room.participant_left", Map.of("participantId", participantId)));
    }

    @Override
    public void participantKicked(String code, String participantId, String nickname) {
        template.convertAndSend(Destinations.roomTopic(code), ServerEvent.of("room.participant_kicked",
                Map.of("participantId", participantId, "nickname", nickname)));
    }

    @Override
    public void kicked(String code, String participantId) {
        String principal = new RoomPrincipal(code, participantId).getName();
        toUser(code, participantId, Destinations.USER_ROOM_QUEUE, ServerEvent.of("room.kicked", Map.of()));
        scheduler.schedule(() -> sessions.closeAll(principal), clock.instant().plusMillis(KICK_CLOSE_DELAY_MS));
    }

    @Override
    public void closed(String code, String reason) {
        template.convertAndSend(Destinations.roomTopic(code), ServerEvent.of("room.closed", Map.of("reason", reason)));
    }

    @Override
    public void error(String code, String participantId, ErrorCode error) {
        toUser(code, participantId, Destinations.USER_ERROR_QUEUE, ServerEvent.of("error", Map.of("code", error.name())));
    }

    private void toUser(String code, String participantId, String queue, ServerEvent event) {
        template.convertAndSendToUser(new RoomPrincipal(code, participantId).getName(), queue, event);
    }
}
