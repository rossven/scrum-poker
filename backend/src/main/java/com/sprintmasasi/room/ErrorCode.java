package com.sprintmasasi.room;

/** İstemciye giden hata kodları. Arayüz bunları çeviri anahtarına eşler. */
public enum ErrorCode {
    ROOM_NOT_FOUND(404),
    INVALID_INPUT(400),
    INVALID_NICKNAME(400),
    INVALID_AVATAR(400),
    INVALID_PASSWORD(400),
    PASSWORD_REQUIRED(401),
    WRONG_PASSWORD(401),
    INVALID_TOKEN(401),
    FORBIDDEN(403),
    ROOM_FULL(409),
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
