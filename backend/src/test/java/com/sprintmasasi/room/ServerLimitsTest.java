package com.sprintmasasi.room;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import com.sprintmasasi.config.AppProperties;
import com.sprintmasasi.stats.UsageStats;
import java.time.Duration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/** Sunucu geneli sınırlar: toplam oda tavanı ve IP başına yeni koltuk sınırı. */
class ServerLimitsTest {

    private MutableClock clock;
    private InMemoryRoomRepository repository;
    private UsageStats stats;
    private RoomService service;

    @BeforeEach
    void setUp() {
        clock = new MutableClock();
        repository = new InMemoryRoomRepository(clock);
        stats = new UsageStats();
        // maxRooms 2, joinsPerMinute 3
        var props = new AppProperties(50, 7, 20, "", 3, 300, 100, 20, 2, 3, 100);
        service = new RoomService(repository, new RecordingEvents(), new SecureIds(), new BCryptPasswordEncoder(4),
                props, clock, mock(TaskScheduler.class), stats);
    }

    @Test
    void roomCapRejectsNewRoomsUntilOneIsRemoved() {
        var first = service.create(null, null, null, "10.0.0.1");
        service.create(null, null, null, "10.0.0.2");

        assertThatThrownBy(() -> service.create(null, null, null, "10.0.0.3"))
                .isInstanceOf(RoomException.class).extracting("code").isEqualTo(ErrorCode.SERVER_BUSY);

        var mod = service.join(first.code(), "Ayşe", "seed1", false, null, null, first.claimToken(), "10.0.0.1");
        service.close(first.code(), mod.participantId());
        assertThat(service.create(null, null, null, "10.0.0.3").code()).isNotBlank();
    }

    @Test
    void newSeatsAreRateLimitedPerIpButTokenRejoinIsNot() {
        var room = service.create(null, null, null, "10.0.0.1");
        var ayse = service.join(room.code(), "Ayşe", "seed1", false, null, null, room.claimToken(), "10.0.0.1");
        service.join(room.code(), "Ali", "seed1", false, null, null, null, "10.0.0.1");
        service.join(room.code(), "Bora", "seed1", false, null, null, null, "10.0.0.1");

        assertThatThrownBy(() -> service.join(room.code(), "Cem", "seed1", false, null, null, null, "10.0.0.1"))
                .isInstanceOf(RoomException.class).extracting("code").isEqualTo(ErrorCode.RATE_LIMITED);
        // Başka IP etkilenmez; aynı kişi token'ıyla geri dönebilir.
        service.join(room.code(), "Cem", "seed1", false, null, null, null, "10.0.0.2");
        var back = service.join(room.code(), "Ayşe", "seed1", false, null, ayse.token(), null, "10.0.0.1");
        assertThat(back.participantId()).isEqualTo(ayse.participantId());

        clock.advance(Duration.ofMinutes(1));
        service.join(room.code(), "Cem 2", "seed1", false, null, null, null, "10.0.0.1");
    }

    @Test
    void removedRoomsLeaveOnlyTotalsInStats() {
        var room = service.create(null, null, null, "10.0.0.1");
        var mod = service.join(room.code(), "Ayşe", "seed1", false, null, null, room.claimToken(), "10.0.0.1");
        service.connected(room.code(), mod.participantId());
        clock.advance(Duration.ofMinutes(30));
        service.disconnected(room.code(), mod.participantId());

        service.close(room.code(), mod.participantId());

        var snapshot = stats.snapshot();
        assertThat(snapshot).containsEntry("roomsCreated", 1L).containsEntry("roomsWithActivity", 1L)
                .containsEntry("averagePeakParticipants", 1.0).containsEntry("averageSessionMinutes", 30.0);
        assertThat(stats.trackedRooms()).isZero();
    }
}
