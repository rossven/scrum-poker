package com.sprintmasasi.ws;

import com.sprintmasasi.room.ErrorCode;
import com.sprintmasasi.room.RoomEvents;
import com.sprintmasasi.room.RoomException;
import com.sprintmasasi.room.RoomService;
import java.security.Principal;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

/** İstemci niyetleri: /app/{olay}. Yetki RoomService içinde kontrol edilir. */
@Controller
public class RoomSocketController {

    public record PromotePayload(String participantId) {}

    public record PasswordPayload(String password) {}

    private final RoomService rooms;
    private final RoomEvents events;

    public RoomSocketController(RoomService rooms, RoomEvents events) {
        this.rooms = rooms;
        this.events = events;
    }

    @MessageMapping("room.sync")
    public void sync(Principal principal) {
        var p = (RoomPrincipal) principal;
        rooms.sync(p.roomCode(), p.participantId());
    }

    @MessageMapping("room.promote")
    public void promote(@Payload PromotePayload payload, Principal principal) {
        var p = (RoomPrincipal) principal;
        rooms.promote(p.roomCode(), p.participantId(), payload.participantId());
    }

    @MessageMapping("room.set_password")
    public void setPassword(@Payload PasswordPayload payload, Principal principal) {
        var p = (RoomPrincipal) principal;
        rooms.setPassword(p.roomCode(), p.participantId(), payload.password());
    }

    @MessageMapping("room.leave")
    public void leave(Principal principal) {
        var p = (RoomPrincipal) principal;
        rooms.leave(p.roomCode(), p.participantId());
    }

    @MessageMapping("room.close")
    public void close(Principal principal) {
        var p = (RoomPrincipal) principal;
        rooms.close(p.roomCode(), p.participantId());
    }

    @MessageExceptionHandler(RoomException.class)
    public void onRoomError(RoomException e, Principal principal) {
        if (principal instanceof RoomPrincipal p) {
            events.error(p.roomCode(), p.participantId(), e.code());
        }
    }

    @MessageExceptionHandler(Exception.class)
    public void onOtherError(Exception e, Principal principal) {
        if (principal instanceof RoomPrincipal p) {
            events.error(p.roomCode(), p.participantId(), ErrorCode.INVALID_INPUT);
        }
    }
}
