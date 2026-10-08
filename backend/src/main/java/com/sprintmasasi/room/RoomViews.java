package com.sprintmasasi.room;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sprintmasasi.poker.VoteStatistics;
import java.util.List;
import java.util.Map;

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
    /**
     * @param ticketsEnabled ticket listesi açık mı; kapalıyken tickets boş gider (ticket'lar sunucuda saklanır)
     * @param sessionHistory ticket'sız (serbest) turların kaydı, en eskiden yeniye
     */
    /**
     * @param fairRotation      dönüşümlü adalet modu açık mı (M3)
     * @param assignment        süren "Kim alacak?" akışı; yoksa null
     * @param assignmentHistory atama sonuçları, en eskiden yeniye (geri alınanlar dahil)
     * @param autoReveal        otomatik aç: bağlı herkes oy verince kartlar kendiliğinden açılır
     * @param volunteerSeconds  "Kim alacak?" gönüllü turunun oda ayarı (0 = süresiz)
     */
    public record RoomState(String code, String name, String deck, List<String> deckCards, List<String> customDeck,
                            boolean passwordProtected, int maxParticipants, List<ParticipantView> participants,
                            boolean ticketsEnabled, List<TicketView> tickets, String currentTicketId, RoundView round,
                            TimerView timer, List<SessionRoundView> sessionHistory, boolean fairRotation,
                            AssignmentView assignment, List<AssignmentRecordView> assignmentHistory,
                            boolean autoReveal, int volunteerSeconds) {}

    /** Kişiye özel tam durum: yeniden bağlanınca gönderilir. yourVote yalnızca bu kişinin oyu. */
    public record RoomSnapshot(String youId, RoomState room, YourVote yourVote) {}

    /** Kişinin kendi oyu (yalnızca kendisine gider). card null ise oy geri çekildi. */
    public record YourVote(long roundId, String card) {}

    /**
     * Etkin tur. votes ve stats yalnızca REVEALED/FINALIZED durumunda dolu; VOTING'de null (JSON'a hiç yazılmaz).
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record RoundView(long id, int number, String ticketId, String topic, String state, List<String> votedIds,
                            List<VoteView> votes, VoteStatistics.Result stats, String finalEstimate) {}

    /** Açılmış bir oy. left: oy verdikten sonra odadan çıktı. excluded: moderatör sayımdan çıkardı. */
    public record VoteView(String participantId, String nickname, String avatar, String card, boolean excluded,
                           boolean left) {}

    public record RoundRecordView(int number, List<VoteView> votes, VoteStatistics.Result stats,
                                  String finalEstimate) {}

    /** Oturum geçmişindeki ticket'sız bir tur. topic boş olabilir. */
    public record SessionRoundView(String topic, int number, List<VoteView> votes, VoteStatistics.Result stats,
                                   String finalEstimate) {}

    /** assignee: "Kim alacak?" sonucunda işi alan kişi (yoksa null). */
    public record TicketView(String id, String title, String link, String note, String status, String finalEstimate,
                             List<RoundRecordView> history, PersonView assignee) {}

    /** Bir kişinin o anki adı ve avatarı (geçmişte saklanır; kişi sonradan çıksa da görünür). */
    public record PersonView(String participantId, String nickname, String avatar) {}

    /**
     * Atama sonucu. game: "horse" | "wheel" | "volunteer" (tek gönüllü) | "direct" (tek aday).
     * at: ISO-8601 zaman damgası (sunucu). weighted: dönüşümlü adalet modu açıkken oynandı.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record AssignmentRecordView(String id, String ticketId, String title, String game, PersonView winner,
                                       List<PersonView> ranking, List<PersonView> candidates, boolean weighted,
                                       String at, boolean undone) {}

    /**
     * Oyunun canlı gösterimi. startsInMs: gönderim anından oyunun başlamasına kalan süre (negatifse başlayalı
     * geçen süre); istemci kendi saatiyle sayar, böylece herkes aynı anda başlatır. animation: oyuna özel.
     */
    public record GameView(String type, long startsInMs, int durationMs, Map<String, Object> animation) {}

    /**
     * Süren "Kim alacak?" akışı. phase: VOLUNTEERING | CANDIDATES | RESULT.
     * volunteerRemainingMs yalnızca süre sınırlı gönüllü turunda; result ve game yalnızca RESULT'ta.
     * passes: gönüllü turunda "pas" diyenler.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record AssignmentView(String id, String phase, String ticketId, String title, int volunteerSeconds,
                                 Long volunteerRemainingMs, List<String> volunteers, List<String> candidates,
                                 AssignmentRecordView result, GameView game, List<String> passes) {}

    /** remainingMs gönderim anındaki kalan süre; istemci kendi saatiyle geri sayar (saat farkından etkilenmez). */
    public record TimerView(int durationSeconds, long remainingMs) {}

    public record RoomInfo(String code, String name, boolean passwordProtected) {}

    public record CreateRoomResult(String code, String claimToken) {}

    /** takenOver: aynı isimli çevrimdışı koltuk devralındı (M3). */
    public record JoinResult(String code, String participantId, String token, String nickname, boolean rejoined,
                             boolean takenOver) {

        public JoinResult(String code, String participantId, String token, String nickname, boolean rejoined) {
            this(code, participantId, token, nickname, rejoined, false);
        }
    }
}
