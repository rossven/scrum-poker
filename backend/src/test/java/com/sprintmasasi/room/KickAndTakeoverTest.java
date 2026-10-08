package com.sprintmasasi.room;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import com.sprintmasasi.config.AppProperties;
import com.sprintmasasi.room.RoomViews.CreateRoomResult;
import com.sprintmasasi.room.RoomViews.JoinResult;
import com.sprintmasasi.room.RoomViews.ParticipantView;
import com.sprintmasasi.room.RoomViews.RoomState;
import com.sprintmasasi.stats.UsageStats;
import java.time.Duration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/** M3: krupiyenin masadan atma yetkisi ve çevrimdışı koltuğu isimle devralma. */
class KickAndTakeoverTest {

    private static final String IP = "10.0.0.1";

    private MutableClock clock;
    private RecordingEvents events;
    private RoomService rooms;
    private PokerService poker;
    private CreateRoomResult room;
    private String code;
    private JoinResult mod;
    private JoinResult ali;

    @BeforeEach
    void setUp() {
        clock = new MutableClock();
        events = new RecordingEvents();
        var stats = new UsageStats();
        var props = new AppProperties(50, 7, 20, "", 3, 300, 100, 20);
        var ids = new SecureIds();
        rooms = new RoomService(new InMemoryRoomRepository(clock), events, ids, new BCryptPasswordEncoder(4), props,
                clock, mock(TaskScheduler.class), stats);
        poker = new PokerService(rooms, events, ids, clock, stats);
        room = rooms.create("Sprint", null, null, null, IP);
        code = room.code();
        mod = rooms.join(code, "Ayşe", "s", false, null, null, room.claimToken(), IP);
        ali = rooms.join(code, "Ali", "s", false, null, null, null, IP);
        rooms.connected(code, mod.participantId());
        rooms.connected(code, ali.participantId());
    }

    private RoomState state() {
        return events.lastState();
    }

    private ParticipantView person(String id) {
        return state().participants().stream().filter(p -> p.id().equals(id)).findFirst().orElse(null);
    }

    private JoinResult join(String nick, Boolean takeover) {
        return rooms.join(code, nick, "yeni", false, null, null, null, takeover, IP);
    }

    private void expectError(ErrorCode error, Runnable action) {
        assertThatThrownBy(action::run).isInstanceOf(RoomException.class).extracting("code").isEqualTo(error);
    }

    // ---------------------------------------------------------------- masadan atma

    @Test
    void moderatorKicksSomeoneTheirTokenStopsWorking() {
        rooms.kick(code, mod.participantId(), ali.participantId());

        assertThat(person(ali.participantId())).isNull();
        assertThat(events.events).anyMatch(e -> e.type().equals("room.kicked")
                && e.participantId().equals(ali.participantId()));
        assertThat(events.events).anyMatch(e -> e.type().equals("room.participant_kicked") && "Ali".equals(e.data()));
        expectError(ErrorCode.KICKED, () -> rooms.authenticate(code, ali.token()));

        // Linkle yeniden katılabilir (kalıcı engel yok); eski token yine çalışmaz.
        var again = rooms.join(code, "Ali", "s", false, null, ali.token(), null, IP);
        assertThat(again.rejoined()).isFalse();
        assertThat(again.participantId()).isNotEqualTo(ali.participantId());
        assertThat(rooms.authenticate(code, again.token())).isEqualTo(again.participantId());
    }

    @Test
    void nonModeratorCannotKickAndNobodyCanKickThemselves() {
        int before = events.events.size();
        expectError(ErrorCode.FORBIDDEN, () -> rooms.kick(code, ali.participantId(), mod.participantId()));
        expectError(ErrorCode.INVALID_INPUT, () -> rooms.kick(code, mod.participantId(), mod.participantId()));
        assertThat(events.events).hasSize(before);
        assertThat(rooms.authenticate(code, ali.token())).isEqualTo(ali.participantId());
    }

    @Test
    void kickedPersonsUnrevealedVoteIsRemoved() {
        poker.vote(code, ali.participantId(), "5");
        poker.vote(code, mod.participantId(), "3");
        rooms.kick(code, mod.participantId(), ali.participantId());
        assertThat(state().round().votedIds()).containsExactly(mod.participantId());
    }

    @Test
    void kickingAnotherModeratorKeepsTheActorAsModerator() {
        rooms.promote(code, mod.participantId(), ali.participantId());
        rooms.kick(code, mod.participantId(), ali.participantId());
        assertThat(person(mod.participantId()).moderator()).isTrue();
    }

    @Test
    void observersAndOfflineSeatsCanBeKicked() {
        var watcher = rooms.join(code, "İzleyen", "s", true, null, null, null, IP);
        rooms.kick(code, mod.participantId(), watcher.participantId());
        assertThat(person(watcher.participantId())).isNull();
    }

    // ---------------------------------------------------------------- koltuk devralma

    @Test
    void sameNameAsOfflineSeatAsksFirstThenTakesOverWithoutANewSeat() {
        poker.vote(code, ali.participantId(), "8");
        rooms.disconnected(code, ali.participantId());

        expectError(ErrorCode.SEAT_TAKEOVER, () -> join("ali", null)); // büyük/küçük harf duyarsız
        var taken = join("ali", true);

        assertThat(taken.takenOver()).isTrue();
        assertThat(taken.participantId()).isEqualTo(ali.participantId());
        assertThat(taken.nickname()).isEqualTo("Ali");
        assertThat(state().participants()).hasSize(2); // "Ali 2" oluşmadı
        assertThat(person(ali.participantId()).avatar()).isEqualTo("s"); // avatar korunur
        assertThat(state().round().votedIds()).contains(ali.participantId()); // oy korunur
        assertThat(rooms.authenticate(code, taken.token())).isEqualTo(ali.participantId());
        expectError(ErrorCode.INVALID_TOKEN, () -> rooms.authenticate(code, ali.token())); // eski token geçersiz
    }

    @Test
    void choosingANewSeatAddsANumber() {
        rooms.disconnected(code, ali.participantId());
        var fresh = join("Ali", false);
        assertThat(fresh.takenOver()).isFalse();
        assertThat(fresh.nickname()).isEqualTo("Ali 2");
    }

    @Test
    void onlineSeatCannotBeTakenOver() {
        var fresh = join("Ali", null); // soru yok
        assertThat(fresh.nickname()).isEqualTo("Ali 2");
        var again = join("Ali", true); // istese de devralamaz
        assertThat(again.takenOver()).isFalse();
        assertThat(again.nickname()).isNotEqualTo("Ali");
        assertThat(person(ali.participantId())).isNotNull();
    }

    @Test
    void takeoverNeedsThePasswordToo() {
        var locked = rooms.create(null, null, "gizli", IP);
        var owner = rooms.join(locked.code(), "Ayşe", "s", false, "gizli", null, locked.claimToken(), IP);
        expectError(ErrorCode.WRONG_PASSWORD,
                () -> rooms.join(locked.code(), "Ayşe", "s", false, "yanlis", null, null, true, IP));
        var taken = rooms.join(locked.code(), "Ayşe", "s", false, "gizli", null, null, true, IP);
        assertThat(taken.participantId()).isEqualTo(owner.participantId());
    }

    /** Biri sadece krupiyenin ismini yazarak krupiye olamaz: krupiyelik bağlı en eski kişiye geçer. */
    @Test
    void takingOverTheModeratorsSeatDoesNotGiveModeratorRights() {
        rooms.disconnected(code, mod.participantId());
        var taken = join("Ayşe", true);
        assertThat(taken.participantId()).isEqualTo(mod.participantId());
        assertThat(person(mod.participantId()).moderator()).isFalse();
        assertThat(person(ali.participantId()).moderator()).isTrue();

        rooms.connected(code, mod.participantId());
        assertThat(person(mod.participantId()).moderator()).isFalse();
    }

    @Test
    void moderatorCanRestoreRightsAfterTakeover() {
        var bora = rooms.join(code, "Bora", "s", false, null, null, null, IP);
        rooms.connected(code, bora.participantId());
        rooms.promote(code, mod.participantId(), bora.participantId());
        rooms.disconnected(code, mod.participantId());
        clock.advance(Duration.ofSeconds(1));
        join("Ayşe", true);
        assertThat(person(mod.participantId()).moderator()).isFalse();
        assertThat(person(bora.participantId()).moderator()).isTrue(); // başka krupiye vardı, devir gerekmedi
        rooms.promote(code, bora.participantId(), mod.participantId());
        assertThat(person(mod.participantId()).moderator()).isTrue();
    }
}
