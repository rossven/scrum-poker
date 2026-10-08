package com.sprintmasasi.room;

/** İstemciye giden hata kodları. Arayüz bunları çeviri anahtarına eşler. */
public enum ErrorCode {
    ROOM_NOT_FOUND(404),
    INVALID_INPUT(400),
    INVALID_NICKNAME(400),
    INVALID_AVATAR(400),
    INVALID_PASSWORD(400),
    INVALID_DECK(400),
    INVALID_TICKET(400),
    PASSWORD_REQUIRED(401),
    WRONG_PASSWORD(401),
    INVALID_TOKEN(401),
    FORBIDDEN(403),
    ROOM_FULL(409),
    /** Niyet turun şu anki durumunda geçersiz (ör. açılmış turda oy vermek). */
    WRONG_PHASE(409),
    /** Oy vermiş kişi tur bitmeden gözlemciye geçemez. */
    ALREADY_VOTED(409),
    /** Hiç oy yokken kartlar açılamaz. */
    NO_VOTES(409),
    TICKET_LIMIT(409),
    /** Özellik bu odada kapalı (ör. ticket listesi kapalıyken ticket.* niyetleri). */
    FEATURE_DISABLED(409),
    /** Aynı isimde çevrimdışı bir koltuk var: istemci "Devral / Yeni koltuk aç" diye sorar (M3). */
    SEAT_TAKEOVER(409),
    /** Krupiye bu kişiyi masadan attı; eski token'la bağlanılamaz (M3). */
    KICKED(403),
    TOO_MANY_ATTEMPTS(429),
    RATE_LIMITED(429);

    private final int httpStatus;

    ErrorCode(int httpStatus) {
        this.httpStatus = httpStatus;
    }

    public int httpStatus() {
        return httpStatus;
    }
}
