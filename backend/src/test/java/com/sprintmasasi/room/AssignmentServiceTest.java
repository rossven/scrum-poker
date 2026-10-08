package com.sprintmasasi.room;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sprintmasasi.config.AppProperties;
import com.sprintmasasi.games.HorseRaceGame;
import com.sprintmasasi.games.WheelGame;
import com.sprintmasasi.room.PokerService.NewTicket;
import com.sprintmasasi.room.RoomViews.AssignmentView;
import com.sprintmasasi.room.RoomViews.JoinResult;
import com.sprintmasasi.room.RoomViews.RoomState;
import com.sprintmasasi.stats.UsageStats;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class AssignmentServiceTest {

    private static final String IP = "10.0.0.1";

    private MutableClock clock;
    private RecordingEvents events;
    private RoomService rooms;
    private PokerService poker;
    private AssignmentService assign;
    private UsageStats stats;
    private String code;
    private JoinResult mod;
    private JoinResult ali;
    private JoinResult bora;
    private JoinResult cem;

    @BeforeEach
    void setUp() {
        clock = new MutableClock();
        events = new RecordingEvents();
        stats = new UsageStats();
        var props = new AppProperties(50, 7, 20, "", 3, 300, 100, 20);
        var ids = new SecureIds();
        rooms = new RoomService(new InMemoryRoomRepository(clock), events, ids, new BCryptPasswordEncoder(4), props,
                clock, mock(TaskScheduler.class), stats);
        poker = new PokerService(rooms, events, ids, clock, stats);
        assign = new AssignmentService(rooms, ids, clock, mock(TaskScheduler.class), stats, new SecureRandom(),
                List.of(new HorseRaceGame(), new WheelGame()));
        var room = rooms.create("Sprint", null, null, null, true, IP);
        code = room.code();
        mod = rooms.join(code, "Ayşe", "s", false, null, null, room.claimToken(), IP);
        ali = rooms.join(code, "Ali", "s", false, null, null, null, IP);
        bora = rooms.join(code, "Bora", "s", false, null, null, null, IP);
        cem = rooms.join(code, "Cem", "s", false, null, null, null, IP);
    }

    private RoomState state() {
        return events.lastState();
    }

    private AssignmentView flow() {
        return state().assignment();
    }

    private void expectError(ErrorCode code, Runnable action) {
        assertThatThrownBy(action::run).isInstanceOf(RoomException.class).extracting("code").isEqualTo(code);
    }

    @Test
    void onlyModeratorStartsAndControlsTheFlow() {
        expectError(ErrorCode.FORBIDDEN, () -> assign.start(code, ali.participantId(), 20));
        assign.start(code, mod.participantId(), 20);
        expectError(ErrorCode.FORBIDDEN, () -> assign.closeVolunteering(code, ali.participantId()));
        assign.closeVolunteering(code, mod.participantId());
        expectError(ErrorCode.FORBIDDEN, () -> assign.play(code, ali.participantId(), "wheel"));
        expectError(ErrorCode.FORBIDDEN, () -> assign.setCandidate(code, ali.participantId(), bora.participantId(), false));
        expectError(ErrorCode.FORBIDDEN, () -> assign.close(code, ali.participantId()));
    }

    @Test
    void singleVolunteerIsAssignedWithoutAGame() {
        poker.addTickets(code, mod.participantId(), List.of(new NewTicket("ABC-1", null, null)));
        assign.start(code, mod.participantId(), 20);
        assertThat(flow().phase()).isEqualTo("VOLUNTEERING");
        assertThat(flow().volunteerRemainingMs()).isEqualTo(20_000);
        assign.volunteer(code, bora.participantId(), true);
        assign.closeVolunteering(code, mod.participantId());

        assertThat(flow().phase()).isEqualTo("RESULT");
        assertThat(flow().game()).isNull();
        assertThat(flow().result().game()).isEqualTo("volunteer");
        assertThat(flow().result().winner().participantId()).isEqualTo(bora.participantId());
        assertThat(state().tickets().getFirst().assignee().nickname()).isEqualTo("Bora");
        assertThat(state().assignmentHistory()).hasSize(1);
        assertThat(stats.snapshot().get("assignmentGamesStarted")).isEqualTo(Map.of());
    }

    @Test
    void severalVolunteersBecomeTheCandidates() {
        assign.start(code, mod.participantId(), 0);
        assertThat(flow().volunteerRemainingMs()).isNull();
        assign.volunteer(code, ali.participantId(), true);
        assign.volunteer(code, cem.participantId(), true);
        assign.volunteer(code, bora.participantId(), true);
        assign.volunteer(code, bora.participantId(), false); // vazgeçti
        assign.closeVolunteering(code, mod.participantId());

        assertThat(flow().phase()).isEqualTo("CANDIDATES");
        assertThat(flow().candidates()).containsExactly(ali.participantId(), cem.participantId());
    }

    @Test
    void withoutVolunteersCandidatesAreTheVoters() {
        poker.vote(code, ali.participantId(), "3");
        poker.vote(code, bora.participantId(), "5");
        poker.reveal(code, mod.participantId());
        assign.start(code, mod.participantId(), 20);
        assign.closeVolunteering(code, mod.participantId());

        assertThat(flow().candidates()).containsExactly(ali.participantId(), bora.participantId());
    }

    @Test
    void withoutVotesOrVolunteersEveryParticipantIsACandidateButNotObservers() {
        rooms.join(code, "İzleyen", "s", true, null, null, null, IP);
        assign.start(code, mod.participantId(), 20);
        assign.closeVolunteering(code, mod.participantId());

        assertThat(flow().candidates()).containsExactly(mod.participantId(), ali.participantId(), bora.participantId(),
                cem.participantId());
    }

    @Test
    void volunteeringClosesItselfWhenTimeIsUp() {
        assign.start(code, mod.participantId(), 20);
        String id = flow().id();
        assign.volunteer(code, ali.participantId(), true);
        assign.volunteer(code, bora.participantId(), true);

        clock.advance(Duration.ofSeconds(10));
        assign.closeVolunteeringIfDue(code, id); // erken: değişmez
        assertThat(flow().phase()).isEqualTo("VOLUNTEERING");

        clock.advance(Duration.ofSeconds(10));
        assign.closeVolunteeringIfDue(code, id);
        assertThat(flow().phase()).isEqualTo("CANDIDATES");
        assertThat(flow().candidates()).containsExactly(ali.participantId(), bora.participantId());
    }

    @Test
    void observersCannotVolunteerAndVolunteeringIsOnlyDuringTheVolunteerRound() {
        var watcher = rooms.join(code, "İzleyen", "s", true, null, null, null, IP);
        expectError(ErrorCode.WRONG_PHASE, () -> assign.volunteer(code, ali.participantId(), true));
        assign.start(code, mod.participantId(), 20);
        expectError(ErrorCode.FORBIDDEN, () -> assign.volunteer(code, watcher.participantId(), true));
        assign.closeVolunteering(code, mod.participantId());
        expectError(ErrorCode.WRONG_PHASE, () -> assign.volunteer(code, ali.participantId(), true));
    }

    @Test
    void moderatorRemovesAndAddsCandidates() {
        assign.start(code, mod.participantId(), 20);
        assign.closeVolunteering(code, mod.participantId());
        assign.setCandidate(code, mod.participantId(), mod.participantId(), false);
        assign.setCandidate(code, mod.participantId(), cem.participantId(), false); // izinli
        assertThat(flow().candidates()).containsExactly(ali.participantId(), bora.participantId());

        assign.setCandidate(code, mod.participantId(), cem.participantId(), true);
        assertThat(flow().candidates()).containsExactly(ali.participantId(), bora.participantId(), cem.participantId());

        var watcher = rooms.join(code, "İzleyen", "s", true, null, null, null, IP);
        expectError(ErrorCode.INVALID_INPUT,
                () -> assign.setCandidate(code, mod.participantId(), watcher.participantId(), true));
    }

    @Test
    void gameResultIsDecidedOnServerAndRecorded() throws Exception {
        poker.addTickets(code, mod.participantId(), List.of(new NewTicket("ABC-1", null, null)));
        assign.start(code, mod.participantId(), 20);
        assign.closeVolunteering(code, mod.participantId());
        assign.setCandidate(code, mod.participantId(), mod.participantId(), false);
        assign.play(code, mod.participantId(), "horse");

        var a = flow();
        assertThat(a.phase()).isEqualTo("RESULT");
        assertThat(a.game().type()).isEqualTo("horse");
        assertThat(a.game().startsInMs()).isEqualTo(AssignmentService.GAME_LEAD_MS);
        assertThat(a.result().ranking()).hasSize(3);
        assertThat(a.result().candidates()).hasSize(3);
        assertThat(a.result().winner()).isEqualTo(a.result().ranking().getFirst());
        assertThat(a.result().title()).isEqualTo("ABC-1");
        assertThat(a.result().at()).isEqualTo("2026-01-01T10:00:00Z");
        assertThat(state().tickets().getFirst().assignee()).isEqualTo(a.result().winner());
        assertThat(stats.snapshot().get("assignmentGamesStarted")).isEqualTo(Map.of("horse", 1L));

        // İstemciye giden JSON: sonuç, sıralama ve animasyon parametreleri.
        String json = new ObjectMapper().writeValueAsString(state());
        assertThat(json).contains("\"tracks\"").contains("\"ranking\"");

        clock.advance(Duration.ofSeconds(3));
        rooms.broadcast(rooms.require(code));
        assertThat(flow().game().startsInMs()).isEqualTo(AssignmentService.GAME_LEAD_MS - 3000);
    }

    @Test
    void unknownGameIsRejected() {
        assign.start(code, mod.participantId(), 20);
        assign.closeVolunteering(code, mod.participantId());
        expectError(ErrorCode.INVALID_INPUT, () -> assign.play(code, mod.participantId(), "slot"));
    }

    @Test
    void undoKeepsHistoryAndAllowsReplay() {
        poker.addTickets(code, mod.participantId(), List.of(new NewTicket("ABC-1", null, null)));
        assign.start(code, mod.participantId(), 20);
        assign.closeVolunteering(code, mod.participantId());
        assign.play(code, mod.participantId(), "wheel");
        var first = flow().result();

        assign.undo(code, mod.participantId());
        assertThat(flow().phase()).isEqualTo("CANDIDATES");
        assertThat(flow().candidates()).hasSize(4);
        assertThat(state().tickets().getFirst().assignee()).isNull();
        assertThat(state().assignmentHistory()).hasSize(1);
        assertThat(state().assignmentHistory().getFirst().undone()).isTrue();

        assign.play(code, mod.participantId(), "horse");
        assertThat(state().assignmentHistory()).hasSize(2);
        assertThat(state().assignmentHistory().getFirst().id()).isEqualTo(first.id());
        assertThat(state().assignmentHistory().getLast().undone()).isFalse();
        assertThat(state().tickets().getFirst().assignee()).isEqualTo(flow().result().winner());
    }

    @Test
    void undoingASingleVolunteerOpensTheGameToEveryone() {
        assign.start(code, mod.participantId(), 20);
        assign.volunteer(code, ali.participantId(), true);
        assign.closeVolunteering(code, mod.participantId());
        assign.undo(code, mod.participantId());

        assertThat(flow().phase()).isEqualTo("CANDIDATES");
        assertThat(flow().candidates()).first().isEqualTo(ali.participantId());
        assertThat(flow().candidates()).hasSize(4);
    }

    @Test
    void singleCandidateIsAssignedDirectly() {
        assign.start(code, mod.participantId(), 20);
        assign.closeVolunteering(code, mod.participantId());
        for (var p : List.of(mod, ali, bora)) {
            assign.setCandidate(code, mod.participantId(), p.participantId(), false);
        }
        assign.play(code, mod.participantId(), "wheel");
        assertThat(flow().result().game()).isEqualTo("direct");
        assertThat(flow().result().winner().participantId()).isEqualTo(cem.participantId());
        assertThat(flow().game()).isNull();
    }

    @Test
    void fairRotationHalvesTheWeightOfPreviousWinners() {
        Room room = rooms.require(code);
        assign.start(code, mod.participantId(), 20);
        assign.volunteer(code, ali.participantId(), true);
        assign.closeVolunteering(code, mod.participantId()); // Ali kazandı (tek gönüllü)
        assertThat(room.withLock(() -> AssignmentService.weight(room, ali.participantId()))).isEqualTo(0.5);
        assertThat(room.withLock(() -> AssignmentService.weight(room, bora.participantId()))).isEqualTo(1.0);

        assign.start(code, mod.participantId(), 20);
        assign.volunteer(code, ali.participantId(), true);
        assign.closeVolunteering(code, mod.participantId());
        assertThat(room.withLock(() -> AssignmentService.weight(room, ali.participantId()))).isEqualTo(0.25);

        // Geri alınan kazanım sayılmaz.
        assign.undo(code, mod.participantId());
        assertThat(room.withLock(() -> AssignmentService.weight(room, ali.participantId()))).isEqualTo(0.5);

        assign.setFairRotation(code, mod.participantId(), true);
        assertThat(state().fairRotation()).isTrue();
        assign.play(code, mod.participantId(), "wheel");
        assertThat(flow().result().weighted()).isTrue();
        expectError(ErrorCode.FORBIDDEN, () -> assign.setFairRotation(code, ali.participantId(), false));
    }

    @Test
    void leavingOrKickedPeopleDropOutOfTheFlowButHistoryStays() {
        assign.start(code, mod.participantId(), 20);
        assign.volunteer(code, ali.participantId(), true);
        assign.volunteer(code, bora.participantId(), true);
        rooms.kick(code, mod.participantId(), bora.participantId());
        assertThat(flow().volunteers()).containsExactly(ali.participantId());

        assign.closeVolunteering(code, mod.participantId());
        assertThat(flow().result().winner().participantId()).isEqualTo(ali.participantId());

        rooms.leave(code, ali.participantId());
        assertThat(state().assignmentHistory().getFirst().winner().nickname()).isEqualTo("Ali");
    }

    @Test
    void closeEndsTheFlowAndKeepsHistory() {
        assign.start(code, mod.participantId(), 20);
        assign.volunteer(code, ali.participantId(), true);
        assign.closeVolunteering(code, mod.participantId());
        assign.close(code, mod.participantId());
        assertThat(flow()).isNull();
        assertThat(state().assignmentHistory()).hasSize(1);
        expectError(ErrorCode.WRONG_PHASE, () -> assign.undo(code, mod.participantId()));
    }

    @Test
    void volunteerSecondsAreValidated() {
        expectError(ErrorCode.INVALID_INPUT, () -> assign.start(code, mod.participantId(), 2));
        expectError(ErrorCode.INVALID_INPUT, () -> assign.start(code, mod.participantId(), 9999));
    }
}
