package com.sprintmasasi.room;

import java.util.List;

/**
 * İstemciye giden görünümler. Burada asla token, şifre veya şifre hash'i bulunmaz.
 * (Sızıntı testi: RoomServiceTest#serializedStateNeverContainsSecrets)
 */
public final class RoomViews {

    private RoomViews() {}

    public record ParticipantView(String id, String nickname, String avatar, boolean moderator, boolean observer,
                                  boolean online) {}

    public record RoomState(String code, String name, String deck, boolean passwordProtected, int maxParticipants,
                            List<ParticipantView> participants) {}

    /** Kişiye özel tam durum: yeniden bağlanınca gönderilir. */
    public record RoomSnapshot(String youId, RoomState room) {}

    public record RoomInfo(String code, String name, boolean passwordProtected) {}

    public record CreateRoomResult(String code, String claimToken) {}

    public record JoinResult(String code, String participantId, String token, String nickname, boolean rejoined) {}
}
