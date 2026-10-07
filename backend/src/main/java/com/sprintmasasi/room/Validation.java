package com.sprintmasasi.room;

import java.util.Set;
import java.util.regex.Pattern;

/** Kullanıcı girdisi kuralları. Tüm metinler arayüzde ayrıca kaçışlanarak gösterilir. */
public final class Validation {

    public static final int NICKNAME_MAX = 24;
    public static final int ROOM_NAME_MAX = 60;
    public static final int PASSWORD_MAX = 64;

    public static final Set<String> DECKS = Set.of("modified-fibonacci", "fibonacci", "tshirt");
    public static final String DEFAULT_DECK = "modified-fibonacci";

    private static final Pattern AVATAR = Pattern.compile("[A-Za-z0-9_-]{1,32}");
    private static final Pattern CONTROL = Pattern.compile("[\\p{Cc}\\p{Cf}&&[^\\u200D]]");

    private Validation() {}

    public static String nickname(String raw) {
        String v = raw == null ? "" : raw.strip();
        if (v.isEmpty() || v.codePointCount(0, v.length()) > NICKNAME_MAX || v.length() > NICKNAME_MAX * 2
                || CONTROL.matcher(v).find()) {
            throw new RoomException(ErrorCode.INVALID_NICKNAME);
        }
        return v;
    }

    public static String avatar(String raw) {
        if (raw == null || !AVATAR.matcher(raw).matches()) {
            throw new RoomException(ErrorCode.INVALID_AVATAR);
        }
        return raw;
    }

    public static String roomName(String raw) {
        String v = raw == null ? "" : raw.strip();
        if (v.isEmpty()) {
            return null;
        }
        if (v.length() > ROOM_NAME_MAX || CONTROL.matcher(v).find()) {
            throw new RoomException(ErrorCode.INVALID_INPUT);
        }
        return v;
    }

    public static String deck(String raw) {
        if (raw == null || raw.isBlank()) {
            return DEFAULT_DECK;
        }
        if (!DECKS.contains(raw)) {
            throw new RoomException(ErrorCode.INVALID_INPUT);
        }
        return raw;
    }

    /** Boş/null şifre "şifre yok" demektir. */
    public static String password(String raw) {
        if (raw == null || raw.isEmpty()) {
            return null;
        }
        if (raw.length() > PASSWORD_MAX) {
            throw new RoomException(ErrorCode.INVALID_PASSWORD);
        }
        return raw;
    }
}
