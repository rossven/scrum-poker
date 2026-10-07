package com.sprintmasasi.poker;

import com.sprintmasasi.room.ErrorCode;
import com.sprintmasasi.room.RoomException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Kart destesi. Hazır desteler sabittir; özel deste moderatörün girdiği listeden doğrulanarak oluşur.
 * Kart sırası önemlidir: en düşük/en yüksek oy ve uzlaşı deste sırasına göre hesaplanır.
 */
public record Deck(String id, List<String> cards) {

    public static final String MODIFIED_FIBONACCI = "modified-fibonacci";
    public static final String FIBONACCI = "fibonacci";
    public static final String TSHIRT = "tshirt";
    public static final String CUSTOM = "custom";
    public static final String DEFAULT_ID = MODIFIED_FIBONACCI;

    public static final int CUSTOM_MAX_CARDS = 20;
    public static final int CARD_MAX_CHARS = 8;

    public static final String UNKNOWN = "?";
    public static final String COFFEE = "☕";

    private static final Map<String, List<String>> PRESETS = Map.of(
            MODIFIED_FIBONACCI, List.of("0", "½", "1", "2", "3", "5", "8", "13", "21", "34", "55", UNKNOWN, COFFEE),
            FIBONACCI, List.of("0", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89", UNKNOWN, COFFEE),
            TSHIRT, List.of("XS", "S", "M", "L", "XL", UNKNOWN, COFFEE));

    // Kontrol/biçim karakterleri ve virgül kart içinde olamaz (virgül ayırıcıdır).
    private static final Pattern BAD_CHARS = Pattern.compile("[\\p{Cc}\\p{Cf},&&[^\\u200D\\uFE0F]]");

    public static boolean isPreset(String id) {
        return PRESETS.containsKey(id);
    }

    public static Deck preset(String id) {
        List<String> cards = PRESETS.get(id);
        if (cards == null) {
            throw new RoomException(ErrorCode.INVALID_DECK);
        }
        return new Deck(id, cards);
    }

    /**
     * Özel deste: en fazla 20 kart, kart başına en fazla 8 karakter, tekrar yok
     * (büyük/küçük harf duyarsız). Boşluklar kırpılır, boş girdiler atlanır.
     */
    public static Deck custom(List<String> raw) {
        if (raw == null) {
            throw new RoomException(ErrorCode.INVALID_DECK);
        }
        List<String> cards = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (String r : raw) {
            String card = r == null ? "" : r.strip();
            if (card.isEmpty()) {
                continue;
            }
            if (card.codePointCount(0, card.length()) > CARD_MAX_CHARS || BAD_CHARS.matcher(card).find()
                    || !seen.add(card.toLowerCase(Locale.ROOT))) {
                throw new RoomException(ErrorCode.INVALID_DECK);
            }
            cards.add(card);
        }
        if (cards.isEmpty() || cards.size() > CUSTOM_MAX_CARDS) {
            throw new RoomException(ErrorCode.INVALID_DECK);
        }
        return new Deck(CUSTOM, List.copyOf(cards));
    }

    public boolean contains(String card) {
        return cards.contains(card);
    }

    public int indexOf(String card) {
        return cards.indexOf(card);
    }

    /** "?" ve "☕" sayılır, gösterilir ama hesaba katılmaz. */
    public static boolean isSpecial(String card) {
        return UNKNOWN.equals(card) || COFFEE.equals(card);
    }

    /**
     * Kartı sayıya çevirir: "½", "0.5", "0,5" ve "1/2" hepsi 0.5'tir.
     * Çevrilemiyorsa (?, ☕, T-shirt harfleri, serbest metin) null döner.
     */
    public static Double numericValue(String card) {
        if (card == null) {
            return null;
        }
        String c = card.strip();
        if (c.equals("½")) {
            return 0.5;
        }
        if (c.equals("¼")) {
            return 0.25;
        }
        if (c.equals("¾")) {
            return 0.75;
        }
        try {
            int slash = c.indexOf('/');
            if (slash > 0) {
                double num = Double.parseDouble(c.substring(0, slash));
                double den = Double.parseDouble(c.substring(slash + 1));
                return den == 0 ? null : num / den;
            }
            if (!c.matches("[0-9]+([.,][0-9]+)?")) {
                return null;
            }
            return Double.parseDouble(c.replace(',', '.'));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
