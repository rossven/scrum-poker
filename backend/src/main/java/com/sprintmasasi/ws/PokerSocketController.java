package com.sprintmasasi.ws;

import com.sprintmasasi.room.PokerService;
import com.sprintmasasi.room.PokerService.NewTicket;
import java.security.Principal;
import java.util.List;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

/**
 * Poker niyetleri: /app/poker.*, /app/ticket.*, /app/timer.*, /app/participant.*, /app/table.*,
 * /app/room.set_tickets_enabled.
 * Yetki ve kurallar PokerService içinde; hatalar RoomSocketController'daki işleyiciyle kişiye döner.
 */
@Controller
public class PokerSocketController {

    public record VotePayload(String card) {}

    public record FinalizePayload(String value) {}

    public record ExcludePayload(String participantId, boolean excluded) {}

    public record DeckPayload(String deck, List<String> cards) {}

    public record AddTicketsPayload(List<NewTicket> tickets) {}

    public record UpdateTicketPayload(String ticketId, String title, String link, String note) {}

    public record TicketPayload(String ticketId) {}

    public record MoveTicketPayload(String ticketId, int toIndex) {}

    public record TimerPayload(int seconds) {}

    public record ObserverPayload(String participantId, boolean observer) {}

    public record TicketsEnabledPayload(boolean enabled) {}

    public record AutoRevealPayload(boolean enabled) {}

    public record TopicPayload(String topic) {}

    public record NudgePayload(String participantId) {}

    public record EmojiPayload(String emoji) {}

    private final PokerService poker;

    public PokerSocketController(PokerService poker) {
        this.poker = poker;
    }

    @MessageMapping("poker.vote")
    public void vote(@Payload VotePayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        poker.vote(p.roomCode(), p.participantId(), body.card());
    }

    @MessageMapping("poker.reveal")
    public void reveal(Principal principal) {
        var p = (RoomPrincipal) principal;
        poker.reveal(p.roomCode(), p.participantId());
    }

    @MessageMapping("poker.new_round")
    public void newRound(Principal principal) {
        var p = (RoomPrincipal) principal;
        poker.newRound(p.roomCode(), p.participantId());
    }

    @MessageMapping("poker.finalize")
    public void finalizeEstimate(@Payload FinalizePayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        poker.finalizeEstimate(p.roomCode(), p.participantId(), body.value());
    }

    @MessageMapping("poker.exclude_vote")
    public void excludeVote(@Payload ExcludePayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        poker.excludeVote(p.roomCode(), p.participantId(), body.participantId(), body.excluded());
    }

    @MessageMapping("poker.set_deck")
    public void setDeck(@Payload DeckPayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        poker.setDeck(p.roomCode(), p.participantId(), body.deck(), body.cards());
    }

    @MessageMapping("ticket.add")
    public void addTickets(@Payload AddTicketsPayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        poker.addTickets(p.roomCode(), p.participantId(), body.tickets());
    }

    @MessageMapping("ticket.update")
    public void updateTicket(@Payload UpdateTicketPayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        poker.updateTicket(p.roomCode(), p.participantId(), body.ticketId(),
                new NewTicket(body.title(), body.link(), body.note()));
    }

    @MessageMapping("ticket.remove")
    public void removeTicket(@Payload TicketPayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        poker.removeTicket(p.roomCode(), p.participantId(), body.ticketId());
    }

    @MessageMapping("ticket.move")
    public void moveTicket(@Payload MoveTicketPayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        poker.moveTicket(p.roomCode(), p.participantId(), body.ticketId(), body.toIndex());
    }

    @MessageMapping("ticket.select")
    public void selectTicket(@Payload TicketPayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        poker.selectTicket(p.roomCode(), p.participantId(), body.ticketId());
    }

    @MessageMapping("ticket.next")
    public void nextTicket(Principal principal) {
        var p = (RoomPrincipal) principal;
        poker.nextTicket(p.roomCode(), p.participantId());
    }

    @MessageMapping("timer.start")
    public void startTimer(@Payload TimerPayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        poker.startTimer(p.roomCode(), p.participantId(), body.seconds());
    }

    @MessageMapping("timer.stop")
    public void stopTimer(Principal principal) {
        var p = (RoomPrincipal) principal;
        poker.stopTimer(p.roomCode(), p.participantId());
    }

    @MessageMapping("participant.set_observer")
    public void setObserver(@Payload ObserverPayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        poker.setObserver(p.roomCode(), p.participantId(), body.participantId(), body.observer());
    }

    @MessageMapping("room.set_auto_reveal")
    public void setAutoReveal(@Payload AutoRevealPayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        poker.setAutoReveal(p.roomCode(), p.participantId(), body.enabled());
    }

    @MessageMapping("room.set_tickets_enabled")
    public void setTicketsEnabled(@Payload TicketsEnabledPayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        poker.setTicketsEnabled(p.roomCode(), p.participantId(), body.enabled());
    }

    @MessageMapping("poker.set_topic")
    public void setTopic(@Payload TopicPayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        poker.setTopic(p.roomCode(), p.participantId(), body.topic());
    }

    @MessageMapping("poker.nudge")
    public void nudge(@Payload NudgePayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        poker.nudge(p.roomCode(), p.participantId(), body.participantId());
    }

    @MessageMapping("table.emoji")
    public void emoji(@Payload EmojiPayload body, Principal principal) {
        var p = (RoomPrincipal) principal;
        poker.throwEmoji(p.roomCode(), p.participantId(), body.emoji());
    }
}
