package com.sprintmasasi.room;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.stereotype.Repository;

@Repository
public class InMemoryRoomRepository implements RoomRepository {

    private final ConcurrentMap<String, Room> rooms = new ConcurrentHashMap<>();
    private final Clock clock;

    public InMemoryRoomRepository(Clock clock) {
        this.clock = clock;
    }

    @Override
    public Optional<Room> find(String code) {
        return Optional.ofNullable(rooms.get(code));
    }

    @Override
    public boolean saveIfAbsent(Room room) {
        return rooms.putIfAbsent(room.code(), room) == null;
    }

    @Override
    public void save(Room room) {
        rooms.put(room.code(), room);
    }

    @Override
    public void delete(String code) {
        rooms.remove(code);
    }

    @Override
    public List<String> expireIdle(Duration maxIdle) {
        Instant cutoff = clock.instant().minus(maxIdle);
        List<String> removed = new ArrayList<>();
        rooms.values().forEach(room -> {
            boolean idle = room.withLock(() -> room.lastActivity().isBefore(cutoff)
                    && room.participants().stream().noneMatch(Participant::online));
            if (idle && rooms.remove(room.code(), room)) {
                removed.add(room.code());
            }
        });
        return removed;
    }

    public int size() {
        return rooms.size();
    }
}
