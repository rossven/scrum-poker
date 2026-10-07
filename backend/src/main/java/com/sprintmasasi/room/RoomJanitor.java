package com.sprintmasasi.room;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
class RoomJanitor {

    private final RoomService rooms;

    RoomJanitor(RoomService rooms) {
        this.rooms = rooms;
    }

    @Scheduled(fixedDelayString = "PT15M", initialDelayString = "PT15M")
    void expireIdleRooms() {
        rooms.expireIdle();
    }
}
