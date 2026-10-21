package com.sprintmasasi.room;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sprintmasasi.config.AppProperties;
import com.sprintmasasi.games.HorseRaceGame;
import com.sprintmasasi.games.WheelGame;
import com.sprintmasasi.room.RoomViews.JoinResult;
import com.sprintmasasi.room.RoomViews.RetroCardView;
import com.sprintmasasi.room.RoomViews.RetroView;
import com.sprintmasasi.room.RoomViews.YourRetro;
import com.sprintmasasi.stats.UsageStats;
import java.security.SecureRandom;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class RetroServiceTest {

    private static final String IP = "10.0.0.1";

    private MutableClock clock;
    private RecordingEvents events;
    private RoomService rooms;
    private RetroService retro;
    private AssignmentService assign;
    private String code;
    private JoinResult mod;
    private JoinResult ali;
    private JoinResult bora;

    @BeforeEach
    void setUp() {
        clock = new MutableClock();
        events = new RecordingEvents();
        var stats = new UsageStats();
        var props = new AppProperties(50, 7, 20, "", 3, 300, 100, 20);
        var ids = new SecureIds();
        rooms = new RoomService(new InMemoryRoomRepository(clock), events, ids, new BCryptPasswordEncoder(4), props,
                clock, mock(TaskScheduler.class), stats);
        retro = new RetroService(rooms, events, ids, clock);
        assign = new AssignmentService(rooms, ids, clock, mock(TaskScheduler.class), stats, new SecureRandom(),
                List.of(new HorseRaceGame(), new WheelGame()));
        var room = rooms.create("Sprint", null, null, null, true, IP);
        code = room.code();
        mod = rooms.join(code, "Ayşe", "s", false, null, null, room.claimToken(), IP);
        ali = rooms.join(code, "Ali", "s", false, null, null, null, IP);
        bora = rooms.join(code, "Bora", "s", false, null, null, null, IP);
    }

    private RetroView view() {
        return events.lastState().retro();
    }

    private void expectError(ErrorCode expected, Runnable action) {
        assertThatThrownBy(action::run).isInstanceOf(RoomException.class).extracting("code").isEqualTo(expected);
    }

    private String add(JoinResult who, int column, String text) {
        retro.addCard(code, who.participantId(), column, text, null);
        return view().cards().stream().filter(c -> c.text().equals(text.strip())).findFirst().orElseThrow().id();
    }

    private YourRetro lastMine(JoinResult who) {
        return events.events.stream()
                .filter(e -> e.type().equals("retro.your_cards") && who.participantId().equals(e.participantId()))
                .map(e -> (YourRetro) e.data()).reduce((a, b) -> b).orElseThrow();
    }

    @Test
    void onlyModeratorStartsAndOnlyOneActiveRetro() {
        expectError(ErrorCode.FORBIDDEN, () -> retro.start(code, ali.participantId(), true, 480));
        expectError(ErrorCode.INVALID_INPUT, () -> retro.start(code, mod.participantId(), true, 5));
        assertThat(events.lastState().retro()).isNull();
        retro.start(code, mod.participantId(), true, 480);
        assertThat(view().phase()).isEqualTo("WRITING");
        assertThat(view().anonymous()).isTrue();
        assertThat(view().timer().durationSeconds()).isEqualTo(480);
        expectError(ErrorCode.WRONG_PHASE, () -> retro.start(code, mod.participantId(), false, 0));
    }

    @Test
    void everyoneSeesEveryCardAndAnonymousHidesAuthors() {
        retro.start(code, mod.participantId(), true, 0);
        add(ali, 0, "Stand-up iyiydi");
        add(bora, 1, "Toplantılar uzun");
        assertThat(view().cards()).hasSize(2);
        assertThat(view().cards()).allMatch(c -> c.author() == null);
        assertThat(view().timer()).isNull();
        // Yazar bilgisi odaya gitmez; kişi kendi kartlarını özel olaydan bilir.
        assertThat(lastMine(ali).cardIds()).hasSize(1);
        assertThat(lastMine(bora).cardIds()).hasSize(1);
        assertThat(lastMine(ali).cardIds()).isNotEqualTo(lastMine(bora).cardIds());
    }

    @Test
    void namedBoardShowsAuthorsAndJsonNeverLeaksTokens() throws Exception {
        retro.start(code, mod.participantId(), false, 0);
        add(ali, 0, "Eşli programlama");
        assertThat(view().cards().getFirst().author().nickname()).isEqualTo("Ali");
        String json = new ObjectMapper().writeValueAsString(events.lastState());
        assertThat(json).doesNotContain("token");
    }

    @Test
    void anonymousStateDoesNotContainAuthorIdsAnywhere() throws Exception {
        retro.start(code, mod.participantId(), true, 0);
        add(ali, 0, "Gizli yazar");
        String json = new ObjectMapper().writeValueAsString(events.lastState().retro());
        assertThat(json).doesNotContain(ali.participantId()).doesNotContain("Ali");
    }

    @Test
    void onlyTheAuthorEditsOrDeletesEvenModeratorCannotDeleteOthers() {
        retro.start(code, mod.participantId(), true, 0);
        String id = add(ali, 0, "İlk hali");
        expectError(ErrorCode.FORBIDDEN, () -> retro.editCard(code, bora.participantId(), id, "ele geçir"));
        expectError(ErrorCode.FORBIDDEN, () -> retro.deleteCard(code, bora.participantId(), id));
        expectError(ErrorCode.FORBIDDEN, () -> retro.deleteCard(code, mod.participantId(), id));
        retro.editCard(code, ali.participantId(), id, "Düzenlendi");
        assertThat(view().cards().getFirst().text()).isEqualTo("Düzenlendi");
        retro.deleteCard(code, ali.participantId(), id);
        assertThat(view().cards()).isEmpty();
        assertThat(lastMine(ali).cardIds()).isEmpty();
    }

    @Test
    void textIsValidated() {
        retro.start(code, mod.participantId(), true, 0);
        expectError(ErrorCode.INVALID_INPUT, () -> retro.addCard(code, ali.participantId(), 0, "   ", null));
        expectError(ErrorCode.INVALID_INPUT, () -> retro.addCard(code, ali.participantId(), 0, "x".repeat(201), null));
        expectError(ErrorCode.INVALID_INPUT, () -> retro.addCard(code, ali.participantId(), 5, "ok", null));
        expectError(ErrorCode.INVALID_INPUT, () -> retro.addCard(code, ali.participantId(), 0, "a\u0007b", null));
        retro.addCard(code, ali.participantId(), 0, "x".repeat(200), null);
        retro.addCard(code, ali.participantId(), 0, "iki\nsatır", null);
    }

    @Test
    void likesAreCountsOnlyAndToggle() {
        retro.start(code, mod.participantId(), true, 0);
        String id = add(ali, 0, "İyi iş");
        retro.like(code, bora.participantId(), id, true);
        retro.like(code, mod.participantId(), id, true);
        retro.like(code, mod.participantId(), id, true); // aynı kişi iki kez beğenemez
        assertThat(view().cards().getFirst().likes()).isEqualTo(2);
        assertThat(lastMine(bora).likedIds()).containsExactly(id);
        retro.like(code, bora.participantId(), id, false);
        assertThat(view().cards().getFirst().likes()).isEqualTo(1);
        assertThat(lastMine(bora).likedIds()).isEmpty();
    }

    @Test
    void discussionGoesLeftToRightAndLikesAreFrozenThere() {
        retro.start(code, mod.participantId(), true, 0);
        String good1 = add(ali, 0, "Az beğenilen iyi");
        String good2 = add(ali, 0, "Çok beğenilen iyi");
        String bad = add(bora, 1, "Geliştirilebilir bir şey");
        String act = add(mod, 2, "Bir aksiyon");
        retro.like(code, bora.participantId(), good2, true);
        retro.like(code, mod.participantId(), good2, true);
        retro.like(code, mod.participantId(), good1, true);
        expectError(ErrorCode.FORBIDDEN, () -> retro.startDiscussion(code, ali.participantId()));
        retro.startDiscussion(code, mod.participantId());
        assertThat(view().order()).containsExactly(good2, good1, bad, act);
        assertThat(view().focusId()).isEqualTo(good2);
        expectError(ErrorCode.WRONG_PHASE, () -> retro.like(code, ali.participantId(), bad, true));
        retro.step(code, mod.participantId(), 1);
        assertThat(view().focusId()).isEqualTo(good1);
        retro.step(code, mod.participantId(), -1);
        retro.step(code, mod.participantId(), -1);
        assertThat(view().focusId()).isEqualTo(good2);
        retro.focus(code, mod.participantId(), act);
        assertThat(view().focusId()).isEqualTo(act);
        retro.step(code, mod.participantId(), 1);
        assertThat(view().focusId()).isEqualTo(act); // sonda durur
        expectError(ErrorCode.INVALID_INPUT, () -> retro.step(code, mod.participantId(), 5));
        expectError(ErrorCode.INVALID_INPUT, () -> retro.focus(code, mod.participantId(), "yok"));
    }

    @Test
    void duringDiscussionOnlyModeratorAddsActionsLinkedToTheTopic() {
        retro.start(code, mod.participantId(), true, 0);
        String topic = add(ali, 1, "Sürpriz işler");
        retro.startDiscussion(code, mod.participantId());
        expectError(ErrorCode.FORBIDDEN, () -> retro.addCard(code, ali.participantId(), 2, "Aksiyon", topic));
        expectError(ErrorCode.FORBIDDEN, () -> retro.addCard(code, mod.participantId(), 0, "Yeni iyi", null));
        retro.addCard(code, mod.participantId(), 2, "Planlamayı yeniden aç", topic);
        RetroCardView action = view().cards().stream().filter(c -> c.column() == 2).findFirst().orElseThrow();
        assertThat(action.sourceId()).isEqualTo(topic);
        assertThat(action.sourceText()).isEqualTo("Sürpriz işler");
        assertThat(view().order()).endsWith(action.id());
        expectError(ErrorCode.INVALID_INPUT, () -> retro.addCard(code, mod.participantId(), 2, "x", action.id()));
        expectError(ErrorCode.FORBIDDEN, () -> retro.addCard(code, mod.participantId(), 1, "x", topic));
    }

    @Test
    void moderatorSetsOwnerAndDueOnActionsOnly() {
        retro.start(code, mod.participantId(), true, 0);
        String topic = add(ali, 0, "Konu");
        String action = add(bora, 2, "Yapılacak");
        retro.startDiscussion(code, mod.participantId());
        expectError(ErrorCode.FORBIDDEN, () -> retro.setAction(code, ali.participantId(), action, ali.participantId(), null));
        expectError(ErrorCode.INVALID_INPUT, () -> retro.setAction(code, mod.participantId(), topic, ali.participantId(), null));
        expectError(ErrorCode.INVALID_INPUT, () -> retro.setAction(code, mod.participantId(), action, "yok", null));
        expectError(ErrorCode.INVALID_INPUT, () -> retro.setAction(code, mod.participantId(), action, null, "x".repeat(31)));
        retro.setAction(code, mod.participantId(), action, ali.participantId(), "12 Kasım");
        RetroCardView v = view().cards().stream().filter(c -> c.id().equals(action)).findFirst().orElseThrow();
        assertThat(v.owner().nickname()).isEqualTo("Ali");
        assertThat(v.due()).isEqualTo("12 Kasım");
        retro.setAction(code, mod.participantId(), action, null, null);
        v = view().cards().stream().filter(c -> c.id().equals(action)).findFirst().orElseThrow();
        assertThat(v.owner()).isNull();
        assertThat(v.due()).isNull();
    }

    @Test
    void deletingTheFocusedCardMovesFocusOn() {
        retro.start(code, mod.participantId(), true, 0);
        String a = add(ali, 0, "Birinci");
        String b = add(ali, 0, "İkinci");
        retro.startDiscussion(code, mod.participantId());
        assertThat(view().focusId()).isEqualTo(a);
        retro.deleteCard(code, ali.participantId(), a);
        assertThat(view().focusId()).isEqualTo(b);
        retro.deleteCard(code, ali.participantId(), b);
        assertThat(view().focusId()).isNull();
    }

    @Test
    void finishReopenAndCloseFollowThePhases() {
        retro.start(code, mod.participantId(), true, 0);
        expectError(ErrorCode.WRONG_PHASE, () -> retro.finish(code, mod.participantId()));
        retro.startDiscussion(code, mod.participantId());
        retro.backToWriting(code, mod.participantId());
        assertThat(view().phase()).isEqualTo("WRITING");
        retro.startDiscussion(code, mod.participantId());
        retro.finish(code, mod.participantId());
        assertThat(view().phase()).isEqualTo("DONE");
        String late = "yok";
        expectError(ErrorCode.WRONG_PHASE, () -> retro.addCard(code, ali.participantId(), 0, late, null));
        retro.reopen(code, mod.participantId());
        assertThat(view().phase()).isEqualTo("DISCUSSING");
        retro.finish(code, mod.participantId());
        expectError(ErrorCode.FORBIDDEN, () -> retro.close(code, ali.participantId()));
        retro.close(code, mod.participantId());
        assertThat(events.lastState().retro()).isNull();
        // Özetten sonra yeni retro açılabilir.
        retro.start(code, mod.participantId(), false, 0);
        assertThat(view().anonymous()).isFalse();
    }

    @Test
    void cardLimitsAndRateLimitApply() {
        retro.start(code, mod.participantId(), true, 0);
        for (int i = 0; i < RetroService.CARD_BURST; i++) {
            retro.addCard(code, ali.participantId(), 0, "kart " + i, null);
        }
        expectError(ErrorCode.RATE_LIMITED, () -> retro.addCard(code, ali.participantId(), 0, "fazla", null));
        clock.advance(java.time.Duration.ofSeconds(11));
        for (int i = 8; i < RetroService.MAX_CARDS_PER_PERSON; i += RetroService.CARD_BURST) {
            for (int j = 0; j < RetroService.CARD_BURST && i + j < RetroService.MAX_CARDS_PER_PERSON; j++) {
                retro.addCard(code, ali.participantId(), 0, "kart " + (i + j), null);
            }
            clock.advance(java.time.Duration.ofSeconds(11));
        }
        expectError(ErrorCode.RETRO_LIMIT, () -> retro.addCard(code, ali.participantId(), 0, "kırk bir", null));
    }

    @Test
    void snapshotCarriesYourCardsAndLeavingKeepsCards() {
        retro.start(code, mod.participantId(), true, 0);
        add(ali, 0, "Benim");
        rooms.sync(code, ali.participantId());
        var snap = events.events.stream().filter(e -> e.type().equals("room.state_snapshot")).reduce((a, b) -> b).orElseThrow();
        var data = (RoomViews.RoomSnapshot) snap.data();
        assertThat(data.yourRetro().cardIds()).hasSize(1);
        rooms.leave(code, ali.participantId());
        assertThat(view().cards()).hasSize(1);
    }

    @Test
    void whoGetsTheActionViaKimAlacakBecomesItsOwner() {
        retro.start(code, mod.participantId(), true, 0);
        String action = add(bora, 2, "Staging'i düzelt");
        retro.startDiscussion(code, mod.participantId());
        expectError(ErrorCode.INVALID_INPUT, () -> assign.start(code, mod.participantId(), 0, "yok"));
        assign.start(code, mod.participantId(), 0, action);
        assertThat(events.lastState().assignment().title()).isEqualTo("Staging'i düzelt");
        assign.volunteer(code, ali.participantId(), true);
        assign.closeVolunteering(code, mod.participantId());
        RetroCardView v = view().cards().stream().filter(c -> c.id().equals(action)).findFirst().orElseThrow();
        assertThat(v.owner().nickname()).isEqualTo("Ali");
        assign.undo(code, mod.participantId());
        v = view().cards().stream().filter(c -> c.id().equals(action)).findFirst().orElseThrow();
        assertThat(v.owner()).isNull();
    }
}
