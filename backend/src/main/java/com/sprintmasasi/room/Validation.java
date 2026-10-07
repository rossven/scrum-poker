package com.sprintmasasi.room;

import com.sprintmasasi.poker.Deck;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/** Kullanıcı girdisi kuralları. Tüm metinler arayüzde ayrıca kaçışlanarak gösterilir. */
public final class Validation {

    public static final int NICKNAME_MAX = 24;
    public static final int ROOM_NAME_MAX = 60;
    public static final int PASSWORD_MAX = 64;

    public static final int TICKET_TITLE_MAX = 120;
    public static final int TICKET_NOTE_MAX = 500;
    public static final int TICKET_LINK_MAX = 500;

    public static final int TOPIC_MAX = 120;

    /**
     * Avatar: taban tohumu + isteğe bağlı aksesuar kodları ("tohum.HGBK").
     * H şapka 0-4, G gözlük 0-3, B bıyık/sakal 0-3, K kıyafet rengi 0-7. Yalnız tohum (M1/M2 avatarları) da geçerli.
     * Görsel tarayıcıda üretilir (frontend/src/lib/avatar.ts); bilinmeyen kod reddedilir.
     */
    private static final Pattern AVATAR = Pattern.compile("[A-Za-z0-9_-]{1,32}(\\.[0-4][0-3][0-3][0-7])?");

    /** Masaya fırlatılabilen emojiler (arayüzdeki listeyle aynı). */
    public static final Set<String> TABLE_EMOJIS = Set.of("👍", "🎉", "🤔", "😂", "😮", "👏", "🔥", "☕");
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

    /** Ticket'sız turun konusu: boş = konu yok. */
    public static String topic(String raw) {
        String v = raw == null ? "" : raw.strip();
        if (v.isEmpty()) {
            return null;
        }
        if (v.codePointCount(0, v.length()) > TOPIC_MAX || CONTROL.matcher(v).find()) {
            throw new RoomException(ErrorCode.INVALID_INPUT);
        }
        return v;
    }

    public static String tableEmoji(String raw) {
        if (raw == null || !TABLE_EMOJIS.contains(raw)) {
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
