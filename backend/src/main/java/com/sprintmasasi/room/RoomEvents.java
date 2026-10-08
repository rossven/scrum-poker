package com.sprintmasasi.room;

import com.sprintmasasi.room.RoomViews.RoomSnapshot;
import com.sprintmasasi.room.RoomViews.RoomState;
import com.sprintmasasi.room.RoomViews.YourVote;

/** Oda olaylarını istemcilere ileten taraf (WebSocket uygulaması: StompRoomEvents). */
public interface RoomEvents {

    void state(String code, RoomState state);

    void snapshot(String code, String participantId, RoomSnapshot snapshot);

    /** Kişinin kendi oyu: yalnızca ona (tüm sekmelerine) gider, asla odanın konusuna değil. */
    void yourVote(String code, String participantId, YourVote vote);

    /** Deste değişti, mevcut turun oyları sıfırlandı (bilgilendirme için). */
    void deckChanged(String code, String deckId);

    /** Krupiye oy vermeyen birini dürttü (koltuğu kısa titrer). */
    void nudged(String code, String participantId);

    /** Biri masaya emoji fırlattı (saklanmaz, yalnızca anlık). */
    void emoji(String code, String participantId, String emoji);

    void participantJoined(String code, String participantId);

    void participantLeft(String code, String participantId);

    void closed(String code, String reason);

    void error(String code, String participantId, ErrorCode error);
}
