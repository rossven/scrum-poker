package com.sprintmasasi.ws;

import java.security.Principal;

/** WebSocket oturumunun kimliği: hangi odada hangi koltuk. */
public record RoomPrincipal(String roomCode, String participantId) implements Principal {

    @Override
    public String getName() {
        return roomCode + ":" + participantId;
    }
}
