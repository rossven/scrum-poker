package com.sprintmasasi.room;

import java.security.SecureRandom;
import java.util.Base64;
import org.springframework.stereotype.Component;

/** Oda kodu, katılımcı kimliği ve token üretimi; hepsi kriptografik rastgelelikle. */
@Component
public class SecureIds {

    // Karışabilecek karakterler (0/O, 1/I/L) yok.
    private static final char[] CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ".toCharArray();
    public static final int CODE_LENGTH = 8;

    private final SecureRandom random = new SecureRandom();

    public String roomCode() {
        char[] out = new char[CODE_LENGTH];
        for (int i = 0; i < out.length; i++) {
            out[i] = CODE_ALPHABET[random.nextInt(CODE_ALPHABET.length)];
        }
        return new String(out);
    }

    public String participantId() {
        return randomBase64(9);
    }

    public String token() {
        return randomBase64(32);
    }

    private String randomBase64(int bytes) {
        byte[] buf = new byte[bytes];
        random.nextBytes(buf);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(buf);
    }

    public static String normalizeCode(String raw) {
        return raw == null ? "" : raw.strip().toUpperCase(java.util.Locale.ROOT);
    }
}
