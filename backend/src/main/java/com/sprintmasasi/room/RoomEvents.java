package com.sprintmasasi.room;

import com.sprintmasasi.room.RoomViews.RoomSnapshot;
import com.sprintmasasi.room.RoomViews.RoomState;

/** Oda olaylarını istemcilere ileten taraf (WebSocket uygulaması: StompRoomEvents). */
public interface RoomEvents {

    void state(String code, RoomState state);

    void snapshot(String code, String participantId, RoomSnapshot snapshot);

    void participantJoined(String code, String participantId);

    void participantLeft(String code, String participantId);

    void closed(String code, String reason);

    void error(String code, String participantId, ErrorCode error);
}
