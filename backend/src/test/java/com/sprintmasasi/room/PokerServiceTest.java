package com.sprintmasasi.room;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sprintmasasi.config.AppProperties;
import com.sprintmasasi.poker.VoteStatistics.Consensus;
import com.sprintmasasi.room.PokerService.NewTicket;
import com.sprintmasasi.room.RoomViews.CreateRoomResult;
import com.sprintmasasi.room.RoomViews.JoinResult;
import com.sprintmasasi.room.RoomViews.RoomSnapshot;
import com.sprintmasasi.room.RoomViews.RoomState;
import com.sprintmasasi.room.RoomViews.YourVote;
import com.sprintmasasi.stats.UsageStats;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class PokerServiceTest {

    private static final String IP = "10.0.0.1";

    private MutableClock clock;
    private RecordingEvents events;
    private RoomService rooms;
    private PokerService poker;
    private UsageStats stats;
    private CreateRoomResult room;
    private String code;
    private JoinResult mod;
    private JoinResult ali;
    private JoinResult bora;

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
        // M2 ticket testleri: ticket listesi açık oda. (Ticket'sız oda: FreeRoundTest)
        room = rooms.create("Sprint", null, null, null, true, IP);
        code = room.code();
        mod = rooms.join(code, "Ayşe", "s", false, null, null, room.claimToken(), IP);
        ali = rooms.join(code, "Ali", "s", false, null, null, null, IP);
        bora = rooms.join(code, "Bora", "s", false, null, null, null, IP);
    }

    private RoomState state() {
        return events.lastState();
    }

    private void addTicket(String title) {
        poker.addTickets(code, mod.participantId(), List.of(new NewTicket(title, null, null)));
    }

    // ---------------------------------------------------------------- gizlilik

    @Test
    void unrevealedVotesNeverLeak() throws Exception {
        // Ayırt edilebilir kartlar: deste listesi dışında JSON'da hiçbir yerde geçmemeli.
        poker.setDeck(code, mod.participantId(), "custom", List.of("KIRMIZI", "MAVI", "YESIL"));
        int from = events.events.size();
        poker.vote(code, mod.participantId(), "KIRMIZI");
        poker.vote(code, ali.participantId(), "MAVI");
        poker.vote(code, bora.participantId(), "YESIL");
        poker.vote(code, ali.participantId(), "YESIL"); // oyunu değiştirdi
        rooms.sync(code, bora.participantId());
        rooms.connected(code, ali.participantId());

        var mapper = new ObjectMapper();
        for (var e : events.events.subList(from, events.events.size())) {
            boolean personalToVoter = e.participantId() != null;
            var json = mapper.valueToTree(e.data());
            if (e.data() instanceof RoomState || e.data() instanceof RoomSnapshot) {
                ObjectNode roomNode = (ObjectNode) (e.data() instanceof RoomSnapshot ? json.get("room") : json);
                roomNode.remove(List.of("deckCards", "customDeck"));
                var round = roomNode.get("round");
                assertThat(round.has("votes")).isFalse();
                assertThat(round.has("stats")).isFalse();
                assertThat(round.get("state").asText()).isEqualTo("VOTING");
            }
            String text = mapper.writeValueAsString(json);
            if (e.data() instanceof RoomSnapshot snap) {
                // Kişiye özel anlık görüntü yalnızca onun kendi oyunu içerir.
                assertThat(snap.yourVote().card()).isEqualTo("YESIL");
                text = text.replace("\"yourVote\":{\"roundId\":" + snap.yourVote().roundId() + ",\"card\":\"YESIL\"}", "");
            }
            if (e.data() instanceof YourVote) {
                assertThat(personalToVoter).isTrue();
                continue;
            }
            assertThat(text).as(e.type()).doesNotContain("KIRMIZI").doesNotContain("MAVI").doesNotContain("YESIL");
        }
        // Kimlerin oy verdiği görünür
        assertThat(state().round().votedIds())
                .containsExactlyInAnyOrder(mod.participantId(), ali.participantId(), bora.participantId());
    }

    @Test
    void yourVoteGoesOnlyToTheVoter() {
        poker.vote(code, ali.participantId(), "5");
        var echo = events.events.stream().filter(e -> e.type().equals("poker.your_vote")).toList();
        assertThat(echo).hasSize(1);
        assertThat(echo.getFirst().participantId()).isEqualTo(ali.participantId());
        assertThat(((YourVote) echo.getFirst().data()).card()).isEqualTo("5");
    }

    @Test
    void revealShowsAllVotesAndStatistics() {
        poker.vote(code, mod.participantId(), "3");
        poker.vote(code, ali.participantId(), "5");
        poker.vote(code, bora.participantId(), "?");

        poker.reveal(code, mod.participantId());

        var round = state().round();
        assertThat(round.state()).isEqualTo("REVEALED");
        assertThat(round.votes()).extracting(RoomViews.VoteView::card).containsExactlyInAnyOrder("3", "5", "?");
        assertThat(round.stats().average()).isEqualTo(4.0);
        assertThat(round.stats().countedCount()).isEqualTo(2);
        assertThat(round.stats().suggested()).isEqualTo("5");
        assertThat(stats.snapshot()).containsEntry("pokerRoundsRevealed", 1L);
    }

    // ---------------------------------------------------------------- kurallar

    @Test
    void cannotRevealWithoutAnyVote() {
        assertThatThrownBy(() -> poker.reveal(code, mod.participantId())).extracting("code")
                .isEqualTo(ErrorCode.NO_VOTES);
        assertThat(state().round().state()).isEqualTo("VOTING");

        poker.vote(code, ali.participantId(), "5");
        poker.reveal(code, mod.participantId());
        assertThat(state().round().state()).isEqualTo("REVEALED");
    }

    @Test
    void cannotVoteAfterRevealOrWithCardNotInDeck() {
        assertThatThrownBy(() -> poker.vote(code, ali.participantId(), "4")).extracting("code")
                .isEqualTo(ErrorCode.INVALID_INPUT);
        poker.vote(code, ali.participantId(), "3");
        poker.reveal(code, mod.participantId());
        assertThatThrownBy(() -> poker.vote(code, ali.participantId(), "5")).extracting("code")
                .isEqualTo(ErrorCode.WRONG_PHASE);
    }

    @Test
    void voteCanBeChangedAndWithdrawnBeforeReveal() {
        poker.vote(code, ali.participantId(), "5");
        poker.vote(code, ali.participantId(), "8");
        assertThat(state().round().votedIds()).containsExactly(ali.participantId());
        poker.vote(code, ali.participantId(), null);
        assertThat(state().round().votedIds()).isEmpty();
    }

    @Test
    void observersCannotVote() {
        var obs = rooms.join(code, "İzleyici", "s", true, null, null, null, IP);
        assertThatThrownBy(() -> poker.vote(code, obs.participantId(), "5")).extracting("code")
                .isEqualTo(ErrorCode.FORBIDDEN);
    }

    @Test
    void onlyModeratorCanRevealAndManageTickets() {
        assertThatThrownBy(() -> poker.reveal(code, ali.participantId())).extracting("code")
                .isEqualTo(ErrorCode.FORBIDDEN);
        assertThatThrownBy(() -> poker.addTickets(code, ali.participantId(), List.of(new NewTicket("x", null, null))))
                .extracting("code").isEqualTo(ErrorCode.FORBIDDEN);
        assertThatThrownBy(() -> poker.setDeck(code, ali.participantId(), "tshirt", null)).extracting("code")
                .isEqualTo(ErrorCode.FORBIDDEN);
        assertThatThrownBy(() -> poker.startTimer(code, ali.participantId(), 60)).extracting("code")
                .isEqualTo(ErrorCode.FORBIDDEN);
    }

    @Test
    void deckChangeResetsVotesAndNotifiesEveryone() {
        poker.vote(code, ali.participantId(), "5");
        long roundBefore = state().round().id();

        poker.setDeck(code, mod.participantId(), "tshirt", null);

        assertThat(events.events).anyMatch(e -> e.type().equals("poker.deck_changed") && e.participantId() == null);
        assertThat(state().deck()).isEqualTo("tshirt");
        assertThat(state().deckCards()).containsExactly("XS", "S", "M", "L", "XL", "?", "☕");
        assertThat(state().round().votedIds()).isEmpty();
        assertThat(state().round().id()).isNotEqualTo(roundBefore);
        // Eski destenin kartı artık geçersiz
        assertThatThrownBy(() -> poker.vote(code, ali.participantId(), "5")).extracting("code")
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    void invalidCustomDeckIsRejectedAndNothingChanges() {
        int before = events.events.size();
        assertThatThrownBy(() -> poker.setDeck(code, mod.participantId(), "custom", List.of("1", "1")))
                .extracting("code").isEqualTo(ErrorCode.INVALID_DECK);
        assertThatThrownBy(() -> poker.setDeck(code, mod.participantId(), "custom", List.of("123456789")))
                .extracting("code").isEqualTo(ErrorCode.INVALID_DECK);
        assertThat(events.events).hasSize(before);
    }

    @Test
    void customDeckIsKeptWhenSwitchingToAnotherDeck() {
        poker.setDeck(code, mod.participantId(), "custom", List.of("1", "2", "4"));
        poker.setDeck(code, mod.participantId(), "fibonacci", null);
        assertThat(state().deck()).isEqualTo("fibonacci");
        assertThat(state().customDeck()).containsExactly("1", "2", "4");
    }

    @Test
    void reVoteKeepsPreviousRoundInTicketHistoryAndFinalIsWritten() {
        addTicket("Giriş sayfası");
        String ticketId = state().currentTicketId();
        assertThat(ticketId).isNotNull();

        poker.vote(code, ali.participantId(), "3");
        poker.vote(code, bora.participantId(), "13");
        poker.reveal(code, mod.participantId());
        poker.newRound(code, mod.participantId());

        assertThat(state().round().number()).isEqualTo(2);
        assertThat(state().round().votedIds()).isEmpty();
        var history = state().tickets().getFirst().history();
        assertThat(history).hasSize(1);
        assertThat(history.getFirst().votes()).extracting(RoomViews.VoteView::card).containsExactlyInAnyOrder("3", "13");

        poker.vote(code, ali.participantId(), "5");
        poker.vote(code, bora.participantId(), "8");
        poker.reveal(code, mod.participantId());
        poker.finalizeEstimate(code, mod.participantId(), "8");

        var ticket = state().tickets().getFirst();
        assertThat(ticket.status()).isEqualTo("ESTIMATED");
        assertThat(ticket.finalEstimate()).isEqualTo("8");
        assertThat(ticket.history()).hasSize(2);
        assertThat(ticket.history().getLast().finalEstimate()).isEqualTo("8");
        assertThat(state().round().state()).isEqualTo("FINALIZED");
        assertThat(stats.snapshot()).containsEntry("ticketsFinalized", 1L);
    }

    @Test
    void finalizeNeedsRevealedRoundAndRealCard() {
        // Açılmamış tur
        assertThatThrownBy(() -> poker.finalizeEstimate(code, mod.participantId(), "5")).extracting("code")
                .isEqualTo(ErrorCode.WRONG_PHASE);
        addTicket("İş");
        assertThatThrownBy(() -> poker.finalizeEstimate(code, mod.participantId(), "5")).extracting("code")
                .isEqualTo(ErrorCode.WRONG_PHASE); // yeni ticket yeni turla geldi, açılmadı
        poker.selectTicket(code, mod.participantId(), state().tickets().getFirst().id());
        poker.vote(code, ali.participantId(), "3");
        poker.reveal(code, mod.participantId());
        assertThatThrownBy(() -> poker.finalizeEstimate(code, mod.participantId(), "?")).extracting("code")
                .isEqualTo(ErrorCode.INVALID_INPUT);
        assertThatThrownBy(() -> poker.finalizeEstimate(code, mod.participantId(), "7")).extracting("code")
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    void voteOfSomeoneWhoLeftCountsUnlessModeratorExcludesIt() {
        poker.vote(code, ali.participantId(), "3");
        poker.vote(code, bora.participantId(), "8");
        rooms.leave(code, bora.participantId());

        poker.reveal(code, mod.participantId());
        var boraVote = state().round().votes().stream().filter(v -> v.participantId().equals(bora.participantId()))
                .findFirst().orElseThrow();
        assertThat(boraVote.left()).isTrue();
        assertThat(boraVote.nickname()).isEqualTo("Bora");
        assertThat(state().round().stats().average()).isEqualTo(5.5);

        poker.excludeVote(code, mod.participantId(), bora.participantId(), true);
        assertThat(state().round().stats().average()).isEqualTo(3.0);
        assertThat(state().round().stats().voteCount()).isEqualTo(1);
    }

    @Test
    void disconnectedVoterKeepsVoteAndSeesItAfterReconnect() {
        rooms.connected(code, ali.participantId());
        poker.vote(code, ali.participantId(), "13");
        rooms.disconnected(code, ali.participantId());
        rooms.connected(code, ali.participantId());

        rooms.sync(code, ali.participantId());
        var snap = (RoomSnapshot) events.events.getLast().data();
        assertThat(snap.yourVote().card()).isEqualTo("13");
        assertThat(snap.yourVote().roundId()).isEqualTo(snap.room().round().id());
        rooms.sync(code, bora.participantId());
        assertThat(((RoomSnapshot) events.events.getLast().data()).yourVote()).isNull();
    }

    @Test
    void ticketQueueAddReorderRemoveAndNext() {
        poker.addTickets(code, mod.participantId(), List.of(
                new NewTicket("A", "https://jira.example.com/A-1", "not"),
                new NewTicket("B", null, null),
                new NewTicket("C", null, null)));
        assertThat(state().tickets()).extracting(RoomViews.TicketView::title).containsExactly("A", "B", "C");
        assertThat(state().currentTicketId()).isEqualTo(state().tickets().getFirst().id());

        String c = state().tickets().get(2).id();
        poker.moveTicket(code, mod.participantId(), c, 0);
        assertThat(state().tickets()).extracting(RoomViews.TicketView::title).containsExactly("C", "A", "B");

        poker.nextTicket(code, mod.participantId()); // A'dan sonra B
        assertThat(state().currentTicketId()).isEqualTo(state().tickets().get(2).id());

        poker.removeTicket(code, mod.participantId(), state().currentTicketId());
        assertThat(state().tickets()).extracting(RoomViews.TicketView::title).containsExactly("C", "A");
        assertThat(state().currentTicketId()).isNull();
    }

    @Test
    void nextSkipsEstimatedTickets() {
        poker.addTickets(code, mod.participantId(), List.of(new NewTicket("A", null, null),
                new NewTicket("B", null, null)));
        poker.vote(code, ali.participantId(), "3");
        poker.reveal(code, mod.participantId());
        poker.finalizeEstimate(code, mod.participantId(), "3");
        poker.nextTicket(code, mod.participantId());
        assertThat(state().currentTicketId()).isEqualTo(state().tickets().get(1).id());
        poker.vote(code, ali.participantId(), "3");
        poker.reveal(code, mod.participantId());
        poker.finalizeEstimate(code, mod.participantId(), "5");
        poker.nextTicket(code, mod.participantId());
        assertThat(state().currentTicketId()).isNull(); // hepsi tahmin edildi
    }

    @Test
    void ticketValidation() {
        for (var bad : List.of(new NewTicket("", null, null), new NewTicket("x".repeat(121), null, null),
                new NewTicket("ok", "javascript:alert(1)", null), new NewTicket("ok", "ftp://x", null))) {
            assertThatThrownBy(() -> poker.addTickets(code, mod.participantId(), List.of(bad))).extracting("code")
                    .isEqualTo(ErrorCode.INVALID_TICKET);
        }
        // Toplu eklemede biri geçersizse hiçbiri eklenmez
        assertThatThrownBy(() -> poker.addTickets(code, mod.participantId(),
                List.of(new NewTicket("iyi", null, null), new NewTicket(" ", null, null))))
                .extracting("code").isEqualTo(ErrorCode.INVALID_TICKET);
        assertThat(state().tickets()).isEmpty();
    }

    @Test
    void observerSwitchBySelfOrModeratorButNotAfterVoting() {
        poker.setObserver(code, ali.participantId(), null, true);
        assertThat(state().participants()).filteredOn(p -> p.id().equals(ali.participantId()))
                .allMatch(RoomViews.ParticipantView::observer);

        poker.vote(code, bora.participantId(), "5");
        assertThatThrownBy(() -> poker.setObserver(code, mod.participantId(), bora.participantId(), true))
                .extracting("code").isEqualTo(ErrorCode.ALREADY_VOTED);
        assertThatThrownBy(() -> poker.setObserver(code, ali.participantId(), bora.participantId(), true))
                .extracting("code").isEqualTo(ErrorCode.FORBIDDEN);

        poker.setObserver(code, mod.participantId(), ali.participantId(), false);
        assertThat(state().participants()).filteredOn(p -> p.id().equals(ali.participantId()))
                .noneMatch(RoomViews.ParticipantView::observer);
    }

    @Test
    void timerCountsDownFromServerClock() {
        assertThatThrownBy(() -> poker.startTimer(code, mod.participantId(), 5)).extracting("code")
                .isEqualTo(ErrorCode.INVALID_INPUT);
        poker.startTimer(code, mod.participantId(), 120);
        assertThat(state().timer().remainingMs()).isEqualTo(120_000);
        clock.advance(Duration.ofSeconds(30));
        rooms.sync(code, ali.participantId());
        var snap = (RoomSnapshot) events.events.getLast().data();
        assertThat(snap.room().timer().remainingMs()).isEqualTo(90_000);
        poker.stopTimer(code, mod.participantId());
        assertThat(state().timer()).isNull();
    }

    @Test
    void consensusIsReported() {
        poker.vote(code, ali.participantId(), "8");
        poker.vote(code, bora.participantId(), "8");
        poker.reveal(code, mod.participantId());
        assertThat(state().round().stats().consensus()).isEqualTo(Consensus.UNANIMOUS);
    }
}
