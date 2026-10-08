package com.sprintmasasi.ws;

import com.sprintmasasi.room.RoomService;
import java.security.Principal;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

/** Oda niyetleri: /app/room.*. Yetki RoomService içinde kontrol edilir; hatalar SocketErrorAdvice'ta. */
@Controller
public class RoomSocketController {

    public record PromotePayload(String participantId) {}

    public record PasswordPayload(String password) {}

    public record KickPayload(String participantId) {}

    private final RoomService rooms;

    public RoomSocketController(RoomService rooms) {
        this.rooms = rooms;
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

    @MessageMapping("room.kick")
    public void kick(@Payload KickPayload payload, Principal principal) {
        var p = (RoomPrincipal) principal;
        rooms.kick(p.roomCode(), p.participantId(), payload.participantId());
    }

    @MessageMapping("room.close")
    public void close(Principal principal) {
        var p = (RoomPrincipal) principal;
        rooms.close(p.roomCode(), p.participantId());
    }
}
