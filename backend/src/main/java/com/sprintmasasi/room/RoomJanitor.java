package com.sprintmasasi.room;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
class RoomJanitor {

    private final RoomService rooms;
    private final PokerService poker;

    RoomJanitor(RoomService rooms, PokerService poker) {
        this.rooms = rooms;
        this.poker = poker;
    }

    @Scheduled(fixedDelayString = "PT15M", initialDelayString = "PT15M")
    void expireIdleRooms() {
        rooms.expireIdle();
        poker.purgeLimiters();
    }
}
