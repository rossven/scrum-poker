package com.sprintmasasi.room;

import com.sprintmasasi.poker.Deck;
import java.util.List;
import java.util.regex.Pattern;

/** Kullanıcı girdisi kuralları. Tüm metinler arayüzde ayrıca kaçışlanarak gösterilir. */
public final class Validation {

    public static final int NICKNAME_MAX = 24;
    public static final int ROOM_NAME_MAX = 60;
    public static final int PASSWORD_MAX = 64;

    public static final int TICKET_TITLE_MAX = 120;
    public static final int TICKET_NOTE_MAX = 500;
    public static final int TICKET_LINK_MAX = 500;

    private static final Pattern AVATAR = Pattern.compile("[A-Za-z0-9_-]{1,32}");
    private static final Pattern CONTROL = Pattern.compile("[\\p{Cc}\\p{Cf}&&[^\\u200D]]");
    /** Notta satır sonu ve sekme serbest. */
    private static final Pattern CONTROL_EXCEPT_NEWLINE = Pattern.compile("[\\p{Cc}\\p{Cf}&&[^\\u200D\\n\\r\\t]]");
    /** Yalnızca http(s) linkleri: javascript: vb. şemalar arayüze hiç ulaşmaz. */
    private static final Pattern LINK = Pattern.compile("https?://[^\\s<>\"]+", Pattern.CASE_INSENSITIVE);

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

    /** Deste seçimi: hazır destelerden biri ya da "custom" + kart listesi. */
    public static Deck deck(String raw, List<String> customCards) {
        if (raw == null || raw.isBlank()) {
            return Deck.preset(Deck.DEFAULT_ID);
        }
        if (Deck.CUSTOM.equals(raw)) {
            return Deck.custom(customCards);
        }
        if (!Deck.isPreset(raw)) {
            throw new RoomException(ErrorCode.INVALID_DECK);
        }
        return Deck.preset(raw);
    }

    public static String ticketTitle(String raw) {
        String v = raw == null ? "" : raw.strip();
        if (v.isEmpty() || v.codePointCount(0, v.length()) > TICKET_TITLE_MAX || CONTROL.matcher(v).find()) {
            throw new RoomException(ErrorCode.INVALID_TICKET);
        }
        return v;
    }

    public static String ticketLink(String raw) {
        String v = raw == null ? "" : raw.strip();
        if (v.isEmpty()) {
            return null;
        }
        if (v.length() > TICKET_LINK_MAX || !LINK.matcher(v).matches()) {
            throw new RoomException(ErrorCode.INVALID_TICKET);
        }
        return v;
    }

    public static String ticketNote(String raw) {
        String v = raw == null ? "" : raw.strip();
        if (v.isEmpty()) {
            return null;
        }
        if (v.length() > TICKET_NOTE_MAX || CONTROL_EXCEPT_NEWLINE.matcher(v).find()) {
            throw new RoomException(ErrorCode.INVALID_TICKET);
        }
        return v;
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
