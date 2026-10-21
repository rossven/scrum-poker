package com.sprintmasasi.ws;

import com.sprintmasasi.room.RetroService;
import java.security.Principal;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

/** Retrospektif niyetleri: /app/retro.*. Kurallar ve yetki RetroService'te. */
@Controller
public class RetroSocketController {

    public record StartPayload(boolean anonymous, Integer seconds) {}

    public record AddPayload(int column, String text, String sourceId) {}

    public record EditPayload(String cardId, String text) {}

    public record CardPayload(String cardId) {}

    public record LikePayload(String cardId, boolean liked) {}

    public record StepPayload(int delta) {}

    public record ActionPayload(String cardId, String ownerId, String due) {}

    private final RetroService retro;

    public RetroSocketController(RetroService retro) {
        this.retro = retro;
    }

    @MessageMapping("retro.start")
    public void start(@Payload StartPayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        retro.start(p.roomCode(), p.participantId(), body.anonymous(), body.seconds());
    }

    @MessageMapping("retro.add_card")
    public void addCard(@Payload AddPayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        retro.addCard(p.roomCode(), p.participantId(), body.column(), body.text(), body.sourceId());
    }

    @MessageMapping("retro.edit_card")
    public void editCard(@Payload EditPayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        retro.editCard(p.roomCode(), p.participantId(), body.cardId(), body.text());
    }

    @MessageMapping("retro.delete_card")
    public void deleteCard(@Payload CardPayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        retro.deleteCard(p.roomCode(), p.participantId(), body.cardId());
    }

    @MessageMapping("retro.like")
    public void like(@Payload LikePayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        retro.like(p.roomCode(), p.participantId(), body.cardId(), body.liked());
    }

    @MessageMapping("retro.start_discussion")
    public void startDiscussion(Principal principal) {
        var p = (RoomPrincipal) principal;
        retro.startDiscussion(p.roomCode(), p.participantId());
    }

    @MessageMapping("retro.back_to_writing")
    public void backToWriting(Principal principal) {
        var p = (RoomPrincipal) principal;
        retro.backToWriting(p.roomCode(), p.participantId());
    }

    @MessageMapping("retro.step")
    public void step(@Payload StepPayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        retro.step(p.roomCode(), p.participantId(), body.delta());
    }

    @MessageMapping("retro.focus")
    public void focus(@Payload CardPayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        retro.focus(p.roomCode(), p.participantId(), body.cardId());
    }

    @MessageMapping("retro.set_action")
    public void setAction(@Payload ActionPayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        retro.setAction(p.roomCode(), p.participantId(), body.cardId(), body.ownerId(), body.due());
    }

    @MessageMapping("retro.finish")
    public void finish(Principal principal) {
        var p = (RoomPrincipal) principal;
        retro.finish(p.roomCode(), p.participantId());
    }

    @MessageMapping("retro.reopen")
    public void reopen(Principal principal) {
        var p = (RoomPrincipal) principal;
        retro.reopen(p.roomCode(), p.participantId());
    }

    @MessageMapping("retro.close")
    public void close(Principal principal) {
        var p = (RoomPrincipal) principal;
        retro.close(p.roomCode(), p.participantId());
    }
}
