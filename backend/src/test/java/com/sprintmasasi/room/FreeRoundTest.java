package com.sprintmasasi.room;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import com.sprintmasasi.config.AppProperties;
import com.sprintmasasi.room.PokerService.NewTicket;
import com.sprintmasasi.room.RoomViews.JoinResult;
import com.sprintmasasi.room.RoomViews.RoomState;
import com.sprintmasasi.stats.UsageStats;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/** M2.5: isteğe bağlı ticket listesi, serbest tur ve oturum geçmişi, dürtme, emoji, avatar aksesuarları. */
class FreeRoundTest {

    private static final String IP = "10.0.0.1";

    private MutableClock clock;
    private RecordingEvents events;
    private RoomService rooms;
    private PokerService poker;
    private UsageStats stats;
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
        var room = rooms.create("Sprint", null, null, IP); // varsayılan: ticket listesi kapalı
        code = room.code();
        mod = rooms.join(code, "Ayşe", "s", false, null, null, room.claimToken(), IP);
        ali = rooms.join(code, "Ali", "s", false, null, null, null, IP);
        bora = rooms.join(code, "Bora", "s", false, null, null, null, IP);
    }

    private RoomState state() {
        return events.lastState();
    }

    private void voteAndReveal(String a, String b) {
        poker.vote(code, ali.participantId(), a);
        poker.vote(code, bora.participantId(), b);
        poker.reveal(code, mod.participantId());
    }

    // ---------------------------------------------------------------- ticket kapalı (varsayılan)

    @Test
    void newRoomHasTicketsDisabledAndTicketIntentsAreRejected() {
        assertThat(state().ticketsEnabled()).isFalse();
        var me = mod.participantId();
        List<Runnable> intents = List.of(
                () -> poker.addTickets(code, me, List.of(new NewTicket("A", null, null))),
                () -> poker.updateTicket(code, me, "x", new NewTicket("A", null, null)),
                () -> poker.removeTicket(code, me, "x"),
                () -> poker.moveTicket(code, me, "x", 0),
                () -> poker.selectTicket(code, me, "x"),
                () -> poker.nextTicket(code, me));
        for (Runnable intent : intents) {
            assertThatThrownBy(intent::run).extracting("code").isEqualTo(ErrorCode.FEATURE_DISABLED);
        }
    }

    @Test
    void freeRoundVoteRevealFinalGoesToSessionHistoryWithTopic() {
        poker.setTopic(code, mod.participantId(), "  Giriş sayfası tasarımı  ");
        assertThat(state().round().topic()).isEqualTo("Giriş sayfası tasarımı");

        voteAndReveal("3", "5");
        poker.finalizeEstimate(code, mod.participantId(), "5");

        assertThat(state().round().state()).isEqualTo("FINALIZED");
        assertThat(state().round().finalEstimate()).isEqualTo("5");
        var history = state().sessionHistory();
        assertThat(history).hasSize(1);
        assertThat(history.getFirst().topic()).isEqualTo("Giriş sayfası tasarımı");
        assertThat(history.getFirst().finalEstimate()).isEqualTo("5");
        assertThat(history.getFirst().votes()).extracting(RoomViews.VoteView::card).containsExactlyInAnyOrder("3", "5");

        // Finallenmiş serbest turdan sonra yeni tur: temiz konu, 1. tur
        poker.newRound(code, mod.participantId());
        assertThat(state().round().topic()).isNull();
        assertThat(state().round().number()).isEqualTo(1);
        assertThat(state().sessionHistory()).hasSize(1); // aynı tur iki kez yazılmaz
    }

    @Test
    void revoteInFreeRoundKeepsTopicAndRecordsRevealedRound() {
        poker.setTopic(code, mod.participantId(), "Arama");
        voteAndReveal("2", "13");
        poker.newRound(code, mod.participantId());

        assertThat(state().round().topic()).isEqualTo("Arama");
        assertThat(state().round().number()).isEqualTo(2);
        assertThat(state().sessionHistory()).singleElement()
                .satisfies(r -> assertThat(r.finalEstimate()).isNull());
    }

    @Test
    void unrevealedFreeRoundIsNotRecorded() {
        poker.vote(code, ali.participantId(), "3");
        poker.newRound(code, mod.participantId());
        assertThat(state().sessionHistory()).isEmpty();
    }

    @Test
    void sessionHistoryKeepsLast20Rounds() {
        for (int i = 0; i < 25; i++) {
            poker.setTopic(code, mod.participantId(), "Konu " + i);
            voteAndReveal("1", "2");
            poker.finalizeEstimate(code, mod.participantId(), "2");
            poker.newRound(code, mod.participantId());
        }
        assertThat(state().sessionHistory()).hasSize(20);
        assertThat(state().sessionHistory().getFirst().topic()).isEqualTo("Konu 5");
        assertThat(state().sessionHistory().getLast().topic()).isEqualTo("Konu 24");
    }

    @Test
    void topicRulesAndPermissions() {
        assertThatThrownBy(() -> poker.setTopic(code, mod.participantId(), "x".repeat(121))).extracting("code")
                .isEqualTo(ErrorCode.INVALID_INPUT);
        assertThatThrownBy(() -> poker.setTopic(code, ali.participantId(), "Konu")).extracting("code")
                .isEqualTo(ErrorCode.FORBIDDEN);
        poker.setTopic(code, mod.participantId(), "x".repeat(120));
        poker.setTopic(code, mod.participantId(), "   ");
        assertThat(state().round().topic()).isNull();

        // Masada ticket varken konu yazılmaz
        poker.setTicketsEnabled(code, mod.participantId(), true);
        poker.addTickets(code, mod.participantId(), List.of(new NewTicket("A", null, null)));
        assertThatThrownBy(() -> poker.setTopic(code, mod.participantId(), "Konu")).extracting("code")
                .isEqualTo(ErrorCode.WRONG_PHASE);
    }

    // ---------------------------------------------------------------- aç/kapa

    @Test
    void togglingTicketsKeepsThemAndArchivesTheRoundOnTheTable() {
        assertThatThrownBy(() -> poker.setTicketsEnabled(code, ali.participantId(), true)).extracting("code")
                .isEqualTo(ErrorCode.FORBIDDEN);
        poker.setTicketsEnabled(code, mod.participantId(), true);
        assertThat(state().ticketsEnabled()).isTrue();
        assertThat(stats.snapshot()).containsEntry("ticketsEnabledRooms", 1L);

        poker.addTickets(code, mod.participantId(), List.of(new NewTicket("A", null, null), new NewTicket("B", null, null)));
        String a = state().currentTicketId();
        assertThat(a).isNotNull();
        voteAndReveal("3", "8");

        poker.setTicketsEnabled(code, mod.participantId(), false);
        assertThat(state().ticketsEnabled()).isFalse();
        assertThat(state().tickets()).isEmpty(); // gizli, silinmedi
        assertThat(state().currentTicketId()).isNull();
        assertThat(state().round().state()).isEqualTo("VOTING");
        assertThat(state().round().ticketId()).isNull();

        // Serbest turda final ticket'a değil oturum geçmişine yazılır
        voteAndReveal("5", "5");
        poker.finalizeEstimate(code, mod.participantId(), "5");
        assertThat(state().sessionHistory()).hasSize(1);

        poker.newRound(code, mod.participantId());
        poker.setTicketsEnabled(code, mod.participantId(), true);
        assertThat(state().tickets()).extracting(RoomViews.TicketView::title).containsExactly("A", "B");
        var ticketA = state().tickets().getFirst();
        assertThat(ticketA.history()).hasSize(1); // kapatırken açık tur geçmişe yazıldı
        assertThat(ticketA.status()).isEqualTo("PENDING");
        // Masa boştu: sıradaki tahmin edilmemiş ticket geri geldi
        assertThat(state().currentTicketId()).isEqualTo(a);
        // Sayaç oda başına bir kez
        assertThat(stats.snapshot()).containsEntry("ticketsEnabledRooms", 1L);
    }

    @Test
    void roomCanBeCreatedWithTicketsEnabled() {
        var room = rooms.create(null, null, null, null, true, "10.0.0.2");
        var creator = rooms.join(room.code(), "Can", "s", false, null, null, room.claimToken(), IP);
        poker.addTickets(room.code(), creator.participantId(), List.of(new NewTicket("A", null, null)));
        assertThat(state().ticketsEnabled()).isTrue();
        assertThat(state().tickets()).hasSize(1);
        assertThat(stats.snapshot()).containsEntry("ticketsEnabledRooms", 1L);
    }

    // ---------------------------------------------------------------- dürtme ve emoji

    @Test
    void dealerCanNudgeNonVotersEvery30Seconds() {
        poker.vote(code, ali.participantId(), "3");
        assertThatThrownBy(() -> poker.nudge(code, bora.participantId(), mod.participantId())).extracting("code")
                .isEqualTo(ErrorCode.FORBIDDEN);
        assertThatThrownBy(() -> poker.nudge(code, mod.participantId(), ali.participantId())).extracting("code")
                .isEqualTo(ErrorCode.WRONG_PHASE); // oy vermiş
        assertThatThrownBy(() -> poker.nudge(code, mod.participantId(), mod.participantId())).extracting("code")
                .isEqualTo(ErrorCode.INVALID_INPUT);

        poker.nudge(code, mod.participantId(), bora.participantId());
        assertThat(events.events).filteredOn(e -> e.type().equals("poker.nudged"))
                .singleElement().satisfies(e -> assertThat(e.participantId()).isEqualTo(bora.participantId()));

        assertThatThrownBy(() -> poker.nudge(code, mod.participantId(), bora.participantId())).extracting("code")
                .isEqualTo(ErrorCode.RATE_LIMITED);
        clock.advance(Duration.ofSeconds(30));
        poker.nudge(code, mod.participantId(), bora.participantId());
        assertThat(events.events).filteredOn(e -> e.type().equals("poker.nudged")).hasSize(2);
    }

    @Test
    void emojiIsValidatedAndRateLimited() {
        assertThatThrownBy(() -> poker.throwEmoji(code, ali.participantId(), "<b>")).extracting("code")
                .isEqualTo(ErrorCode.INVALID_INPUT);
        var observer = rooms.join(code, "İzleyici", "s", true, null, null, null, IP);
        poker.throwEmoji(code, observer.participantId(), "🎉");
        for (int i = 0; i < PokerService.EMOJI_BURST; i++) {
            poker.throwEmoji(code, ali.participantId(), "👍");
        }
        assertThatThrownBy(() -> poker.throwEmoji(code, ali.participantId(), "👍")).extracting("code")
                .isEqualTo(ErrorCode.RATE_LIMITED);
        assertThat(events.events).filteredOn(e -> e.type().equals("table.emoji")).hasSize(1 + PokerService.EMOJI_BURST);
        clock.advance(PokerService.EMOJI_WINDOW);
        poker.throwEmoji(code, ali.participantId(), "🤔");
    }

    // ---------------------------------------------------------------- avatar

    @Test
    void avatarWithAccessoriesIsAcceptedUnknownCodesAreRejected() {
        assertThat(Validation.avatar("abc123")).isEqualTo("abc123");
        assertThat(Validation.avatar("abc123.4337")).isEqualTo("abc123.4337");
        assertThat(Validation.avatar("Ab_-9.0000")).isEqualTo("Ab_-9.0000");
        for (String bad : List.of("abc.5000", "abc.0400", "abc.0040", "abc.0008", "abc.123", "abc.12345", "abc.",
                ".1234", "abc.12a4", "abc.1234.1234", "<svg>", "")) {
            assertThatThrownBy(() -> Validation.avatar(bad)).as(bad).extracting("code")
                    .isEqualTo(ErrorCode.INVALID_AVATAR);
        }
        var joined = rooms.join(code, "Şapkalı", "seed.1203", false, null, null, null, IP);
        assertThat(state().participants()).anyMatch(p -> p.id().equals(joined.participantId())
                && p.avatar().equals("seed.1203"));
        assertThatThrownBy(() -> rooms.join(code, "Kötü", "seed.9999", false, null, null, null, IP))
                .extracting("code").isEqualTo(ErrorCode.INVALID_AVATAR);
    }
}
