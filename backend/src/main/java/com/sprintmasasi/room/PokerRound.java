package com.sprintmasasi.room;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Bir oylama turu: VOTING → REVEALED → (yeni tur | FINALIZED).
 * Oylar yalnızca sunucuda tutulur; REVEALED olmadan istemciye sadece kimlerin oy verdiği gider.
 * Room kilidi altında değiştirilir.
 */
class PokerRound {

    enum State { VOTING, REVEALED, FINALIZED }

    /** Oy anındaki isim/avatar saklanır: oy verip odadan çıkan kişinin oyu açılışta yine görünür. */
    record Vote(String card, String nickname, String avatar) {}

    private final long id;
    private final int number;
    private final String ticketId;
    private final Map<String, Vote> votes = new LinkedHashMap<>();
    private final Set<String> excluded = new HashSet<>();
    private State state = State.VOTING;
    private String finalEstimate;
    private boolean archived;

    PokerRound(long id, int number, String ticketId) {
        this.id = id;
        this.number = number;
        this.ticketId = ticketId;
    }

    long id() { return id; }
    int number() { return number; }
    String ticketId() { return ticketId; }
    State state() { return state; }
    Map<String, Vote> votes() { return votes; }
    Set<String> excluded() { return excluded; }
    String finalEstimate() { return finalEstimate; }
    boolean archived() { return archived; }

    boolean isVoting() { return state == State.VOTING; }

    boolean hasVoted(String participantId) {
        return votes.containsKey(participantId);
    }

    void vote(String participantId, Vote vote) {
        votes.put(participantId, vote);
    }

    void withdraw(String participantId) {
        votes.remove(participantId);
    }

    void reveal() {
        state = State.REVEALED;
    }

    void finalizeWith(String estimate) {
        state = State.FINALIZED;
        finalEstimate = estimate;
    }

    void setExcluded(String participantId, boolean exclude) {
        if (exclude) {
            excluded.add(participantId);
        } else {
            excluded.remove(participantId);
        }
    }

    void markArchived() { archived = true; }
}
