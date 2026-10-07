package com.sprintmasasi.room;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sprintmasasi.config.AppProperties;
import com.sprintmasasi.room.RoomViews.CreateRoomResult;
import com.sprintmasasi.room.RoomViews.JoinResult;
import com.sprintmasasi.room.RoomViews.ParticipantView;
import com.sprintmasasi.room.RoomViews.RoomState;
import com.sprintmasasi.stats.UsageStats;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class RoomServiceTest {

    private static final String IP = "10.0.0.1";
    private static final String SECRET = "gizli-sifre-123";

    private MutableClock clock;
    private RecordingEvents events;
    private InMemoryRoomRepository repository;
    private RoomService service;

    @BeforeEach
    void setUp() {
        clock = new MutableClock();
        events = new RecordingEvents();
        repository = new InMemoryRoomRepository(clock);
        var props = new AppProperties(5, 7, 20, "", 3, 300, 100, 20);
        service = new RoomService(repository, events, new SecureIds(), new BCryptPasswordEncoder(4), props, clock,
                mock(TaskScheduler.class), new UsageStats());
    }

    private JoinResult join(CreateRoomResult room, String nick, String claim) {
        return service.join(room.code(), nick, "seed1", false, null, null, claim, IP);
    }

    private ParticipantView view(String participantId) {
        return events.lastState().participants().stream().filter(p -> p.id().equals(participantId)).findFirst()
                .orElseThrow();
    }

    @Test
    void roomCodeIsEightUnambiguousCharacters() {
        var room = service.create(null, null, null, IP);
        assertThat(room.code()).matches("[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}");
    }

    @Test
    void creatorBecomesModeratorOthersDoNot() {
        var room = service.create("Sprint 42", null, null, IP);
        var mod = join(room, "Ayşe", room.claimToken());
        var other = join(room, "Mehmet", room.claimToken()); // tek kullanımlık anahtar ikinci kez işe yaramaz

        assertThat(view(mod.participantId()).moderator()).isTrue();
        assertThat(view(other.participantId()).moderator()).isFalse();
    }

    @Test
    void nonModeratorCannotPromoteAndStateDoesNotChange() {
        var room = service.create(null, null, null, IP);
        var mod = join(room, "Ayşe", room.claimToken());
        var a = join(room, "Ali", null);
        var b = join(room, "Bora", null);
        RoomState before = events.lastState();
        int eventCount = events.events.size();

        assertThatThrownBy(() -> service.promote(room.code(), a.participantId(), b.participantId()))
                .isInstanceOf(RoomException.class).extracting("code").isEqualTo(ErrorCode.FORBIDDEN);

        assertThat(events.events).hasSize(eventCount); // hiçbir şey yayınlanmadı
        service.sync(room.code(), mod.participantId());
        var snapshot = (RoomViews.RoomSnapshot) events.events.getLast().data();
        assertThat(snapshot.room()).isEqualTo(before);
    }

    @Test
    void nonModeratorCannotChangePasswordOrCloseRoom() {
        var room = service.create(null, null, null, IP);
        join(room, "Ayşe", room.claimToken());
        var a = join(room, "Ali", null);

        assertThatThrownBy(() -> service.setPassword(room.code(), a.participantId(), "x"))
                .extracting("code").isEqualTo(ErrorCode.FORBIDDEN);
        assertThatThrownBy(() -> service.close(room.code(), a.participantId()))
                .extracting("code").isEqualTo(ErrorCode.FORBIDDEN);
        assertThat(service.info(room.code()).passwordProtected()).isFalse();
    }

    @Test
    void moderatorCanPromote() {
        var room = service.create(null, null, null, IP);
        var mod = join(room, "Ayşe", room.claimToken());
        var a = join(room, "Ali", null);

        service.promote(room.code(), mod.participantId(), a.participantId());

        assertThat(view(a.participantId()).moderator()).isTrue();
    }

    @Test
    void passwordProtectedRoomRejectsMissingAndWrongPassword() {
        var room = service.create(null, null, SECRET, IP);

        assertThatThrownBy(() -> service.join(room.code(), "Ali", "s", false, null, null, null, IP))
                .extracting("code").isEqualTo(ErrorCode.PASSWORD_REQUIRED);
        assertThatThrownBy(() -> service.join(room.code(), "Ali", "s", false, "yanlis", null, null, IP))
                .extracting("code").isEqualTo(ErrorCode.WRONG_PASSWORD);
        assertThat(events.events).isEmpty();
    }

    @Test
    void correctPasswordJoinsAndTokenRejoinNeedsNoPassword() {
        var room = service.create(null, null, SECRET, IP);
        var first = service.join(room.code(), "Ali", "s", false, SECRET, null, null, IP);

        // Sayfa yenilendi: aynı token, şifre yok -> aynı koltuk
        var again = service.join(room.code(), "Ali", "s", false, null, first.token(), null, IP);

        assertThat(again.rejoined()).isTrue();
        assertThat(again.participantId()).isEqualTo(first.participantId());
        assertThat(events.lastState().participants()).hasSize(1);
    }

    @Test
    void wrongPasswordAttemptsAreLimitedPerIpAndRoom() {
        var room = service.create(null, null, SECRET, IP);
        for (int i = 0; i < 3; i++) {
            assertThatThrownBy(() -> service.join(room.code(), "Ali", "s", false, "yanlis", null, null, IP))
                    .extracting("code").isEqualTo(ErrorCode.WRONG_PASSWORD);
        }
        // Doğru şifre bile artık bu IP'den kabul edilmez
        assertThatThrownBy(() -> service.join(room.code(), "Ali", "s", false, SECRET, null, null, IP))
                .extracting("code").isEqualTo(ErrorCode.TOO_MANY_ATTEMPTS);
        // Başka IP etkilenmez
        assertThat(service.join(room.code(), "Ali", "s", false, SECRET, null, null, "10.0.0.2").rejoined()).isFalse();
        // Pencere dolunca tekrar denenebilir
        clock.advance(Duration.ofSeconds(301));
        assertThat(service.join(room.code(), "Veli", "s", false, SECRET, null, null, IP).rejoined()).isFalse();
    }

    @Test
    void moderatorCanChangeAndRemovePassword() {
        var room = service.create(null, null, null, IP);
        var mod = join(room, "Ayşe", room.claimToken());

        service.setPassword(room.code(), mod.participantId(), SECRET);
        assertThat(service.info(room.code()).passwordProtected()).isTrue();
        assertThatThrownBy(() -> service.join(room.code(), "Ali", "s", false, null, null, null, IP))
                .extracting("code").isEqualTo(ErrorCode.PASSWORD_REQUIRED);

        service.setPassword(room.code(), mod.participantId(), "");
        assertThat(service.info(room.code()).passwordProtected()).isFalse();
    }

    @Test
    void serializedOutputNeverContainsPasswordHashOrOtherTokens() throws Exception {
        var room = service.create("Oda", null, SECRET, IP);
        var mod = service.join(room.code(), "Ayşe", "s", false, SECRET, null, room.claimToken(), IP);
        var other = service.join(room.code(), "Ali", "s", false, SECRET, null, null, IP);
        service.connected(room.code(), mod.participantId());
        service.setPassword(room.code(), mod.participantId(), SECRET + "-yeni");
        service.sync(room.code(), other.participantId());
        String hash = repository.find(room.code()).orElseThrow().passwordHash();

        var mapper = new ObjectMapper();
        List<Object> everythingSent = new ArrayList<>();
        everythingSent.add(service.info(room.code()));
        events.events.forEach(e -> everythingSent.add(e.data()));
        String json = mapper.writeValueAsString(everythingSent);

        assertThat(json).doesNotContain(SECRET).doesNotContain(hash).doesNotContain("$2a$")
                .doesNotContain(mod.token()).doesNotContain(other.token()).doesNotContain(room.claimToken());
        // Katılım yanıtı yalnızca kişinin kendi token'ını içerir
        assertThat(mapper.writeValueAsString(other)).doesNotContain(SECRET).doesNotContain(mod.token());
    }

    @Test
    void duplicateNicknamesGetANumberSuffix() {
        var room = service.create(null, null, null, IP);
        var a = join(room, "Ayşe", null);
        var b = join(room, "ayşe", null);
        var c = join(room, "AYŞE", null);

        assertThat(a.nickname()).isEqualTo("Ayşe");
        assertThat(b.nickname()).isEqualTo("ayşe 2");
        assertThat(c.nickname()).isEqualTo("AYŞE 3");
    }

    @Test
    void nicknameSuffixRespectsMaxLength() {
        var room = service.create(null, null, null, IP);
        String longName = "x".repeat(24);
        join(room, longName, null);
        var second = join(room, longName, null);

        assertThat(second.nickname()).hasSize(24).endsWith(" 2");
    }

    @Test
    void invalidNicknamesAreRejected() {
        var room = service.create(null, null, null, IP);
        for (String bad : new String[] {"", "   ", "x".repeat(25), "a\u0000b"}) {
            assertThatThrownBy(() -> join(room, bad, null)).extracting("code").isEqualTo(ErrorCode.INVALID_NICKNAME);
        }
    }

    @Test
    void leavingModeratorHandsOverToOldestOnlineParticipant() {
        var room = service.create(null, null, null, IP);
        var mod = join(room, "Ayşe", room.claimToken());
        var observer = service.join(room.code(), "İzleyici", "s", true, null, null, null, IP);
        var older = join(room, "Ali", null);
        var newer = join(room, "Bora", null);
        List.of(mod, observer, older, newer).forEach(p -> service.connected(room.code(), p.participantId()));

        service.leave(room.code(), mod.participantId());

        // Gözlemci daha eski olsa da oy verebilen katılımcı tercih edilir
        assertThat(view(older.participantId()).moderator()).isTrue();
        assertThat(view(newer.participantId()).moderator()).isFalse();
        assertThat(view(observer.participantId()).moderator()).isFalse();
    }

    @Test
    void disconnectedModeratorKeepsRoleUntilGracePeriodEnds() {
        var room = service.create(null, null, null, IP);
        var mod = join(room, "Ayşe", room.claimToken());
        var ali = join(room, "Ali", null);
        service.connected(room.code(), mod.participantId());
        service.connected(room.code(), ali.participantId());

        service.disconnected(room.code(), mod.participantId());
        assertThat(view(mod.participantId()).moderator()).isTrue();
        assertThat(view(mod.participantId()).online()).isFalse();

        // Bekleme süresi dolmadan devir olmaz
        clock.advance(Duration.ofSeconds(10));
        service.handOverIfStillMissing(room.code());
        assertThat(view(mod.participantId()).moderator()).isTrue();

        // Bekleme süresi doldu ve moderatör geri gelmedi
        clock.advance(Duration.ofSeconds(11));
        service.handOverIfStillMissing(room.code());
        assertThat(view(mod.participantId()).moderator()).isFalse();
        assertThat(view(ali.participantId()).moderator()).isTrue();
    }

    @Test
    void moderatorReconnectingWithinGraceKeepsRole() {
        var room = service.create(null, null, null, IP);
        var mod = join(room, "Ayşe", room.claimToken());
        var ali = join(room, "Ali", null);
        service.connected(room.code(), mod.participantId());
        service.connected(room.code(), ali.participantId());

        service.disconnected(room.code(), mod.participantId());
        clock.advance(Duration.ofSeconds(5));
        service.connected(room.code(), mod.participantId());
        clock.advance(Duration.ofSeconds(30));
        service.handOverIfStillMissing(room.code());

        assertThat(view(mod.participantId()).moderator()).isTrue();
        assertThat(view(ali.participantId()).moderator()).isFalse();
    }

    @Test
    void creatorKeepsModeratorWhenOthersConnectFirst() {
        var room = service.create(null, null, null, IP);
        var mod = join(room, "Ayşe", room.claimToken());
        var ali = join(room, "Ali", null);

        service.connected(room.code(), ali.participantId()); // Ayşe henüz bağlanmadı

        assertThat(view(mod.participantId()).moderator()).isTrue();
        assertThat(view(ali.participantId()).moderator()).isFalse();
    }

    @Test
    void longGoneModeratorIsReplacedWhenSomeoneConnects() {
        var room = service.create(null, null, null, IP);
        var mod = join(room, "Ayşe", room.claimToken());
        var ali = join(room, "Ali", null);
        service.connected(room.code(), mod.participantId());
        service.disconnected(room.code(), mod.participantId());
        // Kimse yokken bekleme süresi doldu; sonra Ali gelir
        clock.advance(Duration.ofMinutes(5));
        service.handOverIfStillMissing(room.code());
        service.connected(room.code(), ali.participantId());

        assertThat(view(ali.participantId()).moderator()).isTrue();
        assertThat(view(mod.participantId()).moderator()).isFalse();
    }

    @Test
    void roomHasASafetyCapOnSeats() {
        var room = service.create(null, null, null, IP);
        for (int i = 0; i < 5; i++) {
            join(room, "Kişi " + i, null);
        }
        assertThatThrownBy(() -> join(room, "Fazla", null)).extracting("code").isEqualTo(ErrorCode.ROOM_FULL);
    }

    @Test
    void closingRoomNotifiesAndDeletesIt() {
        var room = service.create(null, null, null, IP);
        var mod = join(room, "Ayşe", room.claimToken());

        service.close(room.code(), mod.participantId());

        assertThat(events.events.getLast().type()).isEqualTo("room.closed");
        assertThatThrownBy(() -> service.info(room.code())).extracting("code").isEqualTo(ErrorCode.ROOM_NOT_FOUND);
    }

    @Test
    void idleRoomsExpireButActiveOnesStay() {
        var idle = service.create(null, null, null, IP);
        clock.advance(Duration.ofDays(6));
        var fresh = service.create(null, null, null, IP);
        clock.advance(Duration.ofDays(2));

        assertThat(service.expireIdle()).containsExactly(idle.code());
        assertThat(service.info(fresh.code())).isNotNull();
    }

    @Test
    void roomCodeLookupIsCaseInsensitive() {
        var room = service.create(null, null, null, IP);
        assertThat(service.info(room.code().toLowerCase()).code()).isEqualTo(room.code());
    }

    @Test
    void unknownRoomIsReported() {
        assertThatThrownBy(() -> service.info("YOKBOYLE")).extracting("code").isEqualTo(ErrorCode.ROOM_NOT_FOUND);
    }
}
