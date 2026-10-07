package com.sprintmasasi.room;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sprintmasasi.poker.VoteStatistics;
import java.util.List;

/**
 * İstemciye giden görünümler. Burada asla token, şifre veya şifre hash'i bulunmaz.
 * Açılmamış turun oy değerleri de yoktur: VOTING durumunda RoundView yalnızca votedIds taşır.
 * (Sızıntı testleri: RoomServiceTest#serializedStateNeverContainsSecrets, PokerServiceTest#unrevealedVotesNeverLeak)
 */
public final class RoomViews {

    private RoomViews() {}

    public record ParticipantView(String id, String nickname, String avatar, boolean moderator, boolean observer,
                                  boolean online) {}

    /**
     * @param deck        etkin destenin kimliği
     * @param deckCards   etkin destenin kartları (sırasıyla)
     * @param customDeck  odada kaydedilmiş özel deste (başka desteye geçilse de saklanır)
     */
    public record RoomState(String code, String name, String deck, List<String> deckCards, List<String> customDeck,
                            boolean passwordProtected, int maxParticipants, List<ParticipantView> participants,
                            List<TicketView> tickets, String currentTicketId, RoundView round, TimerView timer) {}

    /** Kişiye özel tam durum: yeniden bağlanınca gönderilir. yourVote yalnızca bu kişinin oyu. */
    public record RoomSnapshot(String youId, RoomState room, YourVote yourVote) {}

    /** Kişinin kendi oyu (yalnızca kendisine gider). card null ise oy geri çekildi. */
    public record YourVote(long roundId, String card) {}

    /**
     * Etkin tur. votes ve stats yalnızca REVEALED/FINALIZED durumunda dolu; VOTING'de null (JSON'a hiç yazılmaz).
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record RoundView(long id, int number, String ticketId, String state, List<String> votedIds,
                            List<VoteView> votes, VoteStatistics.Result stats, String finalEstimate) {}

    /** Açılmış bir oy. left: oy verdikten sonra odadan çıktı. excluded: moderatör sayımdan çıkardı. */
    public record VoteView(String participantId, String nickname, String avatar, String card, boolean excluded,
                           boolean left) {}

    public record RoundRecordView(int number, List<VoteView> votes, VoteStatistics.Result stats,
                                  String finalEstimate) {}

    public record TicketView(String id, String title, String link, String note, String status, String finalEstimate,
                             List<RoundRecordView> history) {}

    /** remainingMs gönderim anındaki kalan süre; istemci kendi saatiyle geri sayar (saat farkından etkilenmez). */
    public record TimerView(int durationSeconds, long remainingMs) {}

    public record RoomInfo(String code, String name, boolean passwordProtected) {}

    public record CreateRoomResult(String code, String claimToken) {}

    public record JoinResult(String code, String participantId, String token, String nickname, boolean rejoined) {}
}
