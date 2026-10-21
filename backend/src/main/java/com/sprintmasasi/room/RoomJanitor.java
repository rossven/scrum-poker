package com.sprintmasasi.room;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
class RoomJanitor {

    private final RoomService rooms;
    private final PokerService poker;
    private final RetroService retro;

    RoomJanitor(RoomService rooms, PokerService poker, RetroService retro) {
        this.rooms = rooms;
        this.poker = poker;
        this.retro = retro;
    }

    @Scheduled(fixedDelayString = "PT15M", initialDelayString = "PT15M")
    void expireIdleRooms() {
        rooms.expireIdle();
        poker.purgeLimiters();
        retro.purgeLimiters();
    }
}
