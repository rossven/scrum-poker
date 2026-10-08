package com.sprintmasasi.ws;

import com.sprintmasasi.room.AssignmentService;
import java.security.Principal;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

/** "Kim alacak?" niyetleri: /app/assign.*. Kurallar ve yetki AssignmentService'te. */
@Controller
public class AssignmentSocketController {

    public record StartPayload(Integer seconds) {}

    public record VolunteerPayload(boolean volunteer) {}

    public record CandidatePayload(String participantId, boolean candidate) {}

    public record PlayPayload(String game) {}

    public record FairPayload(boolean enabled) {}

    private final AssignmentService assignments;

    public AssignmentSocketController(AssignmentService assignments) {
        this.assignments = assignments;
    }

    @MessageMapping("assign.start")
    public void start(@Payload StartPayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        assignments.start(p.roomCode(), p.participantId(), body.seconds());
    }

    @MessageMapping("assign.volunteer")
    public void volunteer(@Payload VolunteerPayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        assignments.volunteer(p.roomCode(), p.participantId(), body.volunteer());
    }

    @MessageMapping("assign.close_volunteering")
    public void closeVolunteering(Principal principal) {
        var p = (RoomPrincipal) principal;
        assignments.closeVolunteering(p.roomCode(), p.participantId());
    }

    @MessageMapping("assign.set_candidate")
    public void setCandidate(@Payload CandidatePayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        assignments.setCandidate(p.roomCode(), p.participantId(), body.participantId(), body.candidate());
    }

    @MessageMapping("assign.set_fair_rotation")
    public void setFairRotation(@Payload FairPayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        assignments.setFairRotation(p.roomCode(), p.participantId(), body.enabled());
    }

    @MessageMapping("assign.play")
    public void play(@Payload PlayPayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        assignments.play(p.roomCode(), p.participantId(), body.game());
    }

    @MessageMapping("assign.undo")
    public void undo(Principal principal) {
        var p = (RoomPrincipal) principal;
        assignments.undo(p.roomCode(), p.participantId());
    }

    @MessageMapping("assign.close")
    public void close(Principal principal) {
        var p = (RoomPrincipal) principal;
        assignments.close(p.roomCode(), p.participantId());
    }
}
