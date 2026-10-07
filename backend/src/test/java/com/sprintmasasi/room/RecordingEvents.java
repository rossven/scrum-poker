package com.sprintmasasi.room;

import com.sprintmasasi.room.RoomViews.RoomSnapshot;
import com.sprintmasasi.room.RoomViews.RoomState;
import com.sprintmasasi.room.RoomViews.YourVote;
import java.util.ArrayList;
import java.util.List;

/** Test için: yayınlanan her olayı kaydeder. */
class RecordingEvents implements RoomEvents {

    record Event(String type, String code, String participantId, Object data) {}

    final List<Event> events = new ArrayList<>();

    @Override
    public synchronized void state(String code, RoomState state) {
        events.add(new Event("room.state", code, null, state));
    }

    @Override
    public synchronized void snapshot(String code, String participantId, RoomSnapshot snapshot) {
        events.add(new Event("room.state_snapshot", code, participantId, snapshot));
    }

    @Override
    public synchronized void yourVote(String code, String participantId, YourVote vote) {
        events.add(new Event("poker.your_vote", code, participantId, vote));
    }

    @Override
    public synchronized void deckChanged(String code, String deckId) {
        events.add(new Event("poker.deck_changed", code, null, deckId));
    }

    @Override
    public synchronized void nudged(String code, String participantId) {
        events.add(new Event("poker.nudged", code, participantId, null));
    }

    @Override
    public synchronized void emoji(String code, String participantId, String emoji) {
        events.add(new Event("table.emoji", code, participantId, emoji));
    }

    @Override
    public synchronized void participantJoined(String code, String participantId) {
        events.add(new Event("room.participant_joined", code, participantId, null));
    }

    @Override
    public synchronized void participantLeft(String code, String participantId) {
        events.add(new Event("room.participant_left", code, participantId, null));
    }

    @Override
    public synchronized void closed(String code, String reason) {
        events.add(new Event("room.closed", code, null, reason));
    }

    @Override
    public synchronized void error(String code, String participantId, ErrorCode error) {
        events.add(new Event("error", code, participantId, error));
    }

    synchronized RoomState lastState() {
        for (int i = events.size() - 1; i >= 0; i--) {
            if (events.get(i).data() instanceof RoomState s) {
                return s;
            }
        }
        throw new AssertionError("Hiç room.state yayınlanmadı");
    }
}
