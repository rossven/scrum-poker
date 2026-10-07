package com.sprintmasasi.room;

import com.sprintmasasi.poker.Deck;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Supplier;

/**
 * Bir odanın tüm durumu. Tüm okuma/yazmalar {@link #withLock} içinde yapılır;
 * böylece oda başına tek seferde tek değişiklik olur.
 */
public class Room {

    private final ReentrantLock lock = new ReentrantLock();
    private final String code;
    private final Instant createdAt;
    private final Map<String, Participant> participants = new LinkedHashMap<>();
    private String name;
    private Deck deck;
    /** Moderatörün oluşturduğu özel deste; başka desteye geçilse de oda boyunca saklanır. */
    private Deck customDeck;
    private final List<Ticket> tickets = new ArrayList<>();
    private String currentTicketId;
    private PokerRound round;
    private long roundCounter;
    private Instant timerEndsAt;
    private int timerSeconds;
    private String passwordHash;
    private String creatorClaimToken;
    private Instant lastActivity;
    private long joinCounter;
    private boolean closed;

    public Room(String code, String name, Deck deck, String passwordHash, String creatorClaimToken, Instant now) {
        this.code = code;
        this.name = name;
        this.deck = deck;
        this.customDeck = Deck.CUSTOM.equals(deck.id()) ? deck : null;
        this.round = new PokerRound(++roundCounter, 1, null);
        this.passwordHash = passwordHash;
        this.creatorClaimToken = creatorClaimToken;
        this.createdAt = now;
        this.lastActivity = now;
    }

    public <T> T withLock(Supplier<T> action) {
        lock.lock();
        try {
            return action.get();
        } finally {
            lock.unlock();
        }
    }

    public void withLock(Runnable action) {
        withLock(() -> {
            action.run();
            return null;
        });
    }

    public String code() { return code; }
    public Instant createdAt() { return createdAt; }
    public String name() { return name; }
    public String deckId() { return deck.id(); }
    Deck deck() { return deck; }
    Deck customDeck() { return customDeck; }
    List<Ticket> tickets() { return tickets; }
    String currentTicketId() { return currentTicketId; }
    PokerRound round() { return round; }
    Instant timerEndsAt() { return timerEndsAt; }
    int timerSeconds() { return timerSeconds; }

    void setDeck(Deck deck) {
        this.deck = deck;
        if (Deck.CUSTOM.equals(deck.id())) {
            this.customDeck = deck;
        }
    }

    Optional<Ticket> ticket(String id) {
        return tickets.stream().filter(t -> t.id().equals(id)).findFirst();
    }

    Optional<Ticket> currentTicket() {
        return currentTicketId == null ? Optional.empty() : ticket(currentTicketId);
    }

    /** Yeni oylama turu başlatır; önceki tur artık geçersizdir (oyları istemciye hiç gitmeyecek). */
    PokerRound startRound(String ticketId, int number) {
        this.currentTicketId = ticketId;
        this.round = new PokerRound(++roundCounter, number, ticketId);
        return round;
    }

    void startTimer(int seconds, Instant now) {
        this.timerSeconds = seconds;
        this.timerEndsAt = now.plusSeconds(seconds);
    }

    void stopTimer() {
        this.timerSeconds = 0;
        this.timerEndsAt = null;
    }
    String passwordHash() { return passwordHash; }
    public boolean passwordProtected() { return passwordHash != null; }
    public Instant lastActivity() { return lastActivity; }
    public boolean closed() { return closed; }
    public Collection<Participant> participants() { return participants.values(); }

    void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    void touch(Instant now) { this.lastActivity = now; }
    void markClosed() { this.closed = true; }

    Optional<Participant> participant(String id) {
        return Optional.ofNullable(participants.get(id));
    }

    Optional<Participant> findByToken(String token) {
        if (token == null || token.isEmpty()) {
            return Optional.empty();
        }
        byte[] given = token.getBytes(StandardCharsets.UTF_8);
        return participants.values().stream()
                .filter(p -> MessageDigest.isEqual(given, p.token().getBytes(StandardCharsets.UTF_8)))
                .findFirst();
    }

    /** Oda açılırken verilen tek kullanımlık anahtarla gelen kişi moderatör olur. */
    boolean consumeClaimToken(String claim) {
        if (creatorClaimToken == null || claim == null) {
            return false;
        }
        boolean ok = MessageDigest.isEqual(
                creatorClaimToken.getBytes(StandardCharsets.UTF_8), claim.getBytes(StandardCharsets.UTF_8));
        if (ok) {
            creatorClaimToken = null;
        }
        return ok;
    }

    boolean creatorClaimed() {
        return creatorClaimToken == null;
    }

    Participant addParticipant(String id, String token, String nickname, String avatar, boolean observer, Instant now) {
        var p = new Participant(id, token, ++joinCounter, uniqueNickname(nickname), avatar, observer, now);
        participants.put(id, p);
        return p;
    }

    void removeParticipant(String id) {
        participants.remove(id);
    }

    /** İsim çakışırsa sonuna numara ekler: "Ayşe", "Ayşe 2", "Ayşe 3"... */
    private String uniqueNickname(String wanted) {
        if (!nicknameTaken(wanted)) {
            return wanted;
        }
        for (int n = 2; ; n++) {
            String suffix = " " + n;
            int maxBase = Validation.NICKNAME_MAX - suffix.length();
            String base = wanted.codePointCount(0, wanted.length()) > maxBase
                    ? wanted.substring(0, wanted.offsetByCodePoints(0, maxBase)).stripTrailing()
                    : wanted;
            String candidate = base + suffix;
            if (!nicknameTaken(candidate)) {
                return candidate;
            }
        }
    }

    private boolean nicknameTaken(String nickname) {
        String key = nickname.toLowerCase(Locale.ROOT);
        return participants.values().stream().anyMatch(p -> p.nickname().toLowerCase(Locale.ROOT).equals(key));
    }

    boolean hasOnlineModerator() {
        return participants.values().stream().anyMatch(p -> p.moderator() && p.online());
    }

    boolean hasModerator() {
        return participants.values().stream().anyMatch(Participant::moderator);
    }

    /**
     * Bağlı moderatör yoksa moderatörlüğü en eski bağlı kişiye devreder
     * (oy verebilen katılımcılar gözlemcilere tercih edilir).
     * Kısa süre önce kopan bir moderatör (offlineCutoff'tan sonra) varsa beklenir;
     * böylece sayfa yenileme moderatörlüğü kaybettirmez.
     * @return devir yapıldıysa true
     */
    boolean handOverModeratorIfNeeded(Instant offlineCutoff) {
        if (hasOnlineModerator()) {
            return false;
        }
        boolean moderatorInGrace = participants.values().stream()
                .anyMatch(p -> p.moderator() && p.offlineSince() != null && p.offlineSince().isAfter(offlineCutoff));
        if (moderatorInGrace) {
            return false;
        }
        Comparator<Participant> byPriority = Comparator
                .comparing(Participant::observer)
                .thenComparingLong(Participant::joinOrder);
        Optional<Participant> next = participants.values().stream()
                .filter(Participant::online)
                .min(byPriority);
        if (next.isEmpty()) {
            return false;
        }
        participants.values().forEach(p -> p.setModerator(false));
        next.get().setModerator(true);
        return true;
    }

    int seatCount() {
        return participants.size();
    }

    List<Participant> participantList() {
        return new ArrayList<>(participants.values());
    }
}
