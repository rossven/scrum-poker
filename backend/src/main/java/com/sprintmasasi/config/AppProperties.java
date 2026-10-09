package com.sprintmasasi.config;

import java.util.Arrays;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.ConstructorBinding;

@ConfigurationProperties(prefix = "sprintmasasi")
public record AppProperties(
        int maxParticipants,
        int idleExpiryDays,
        int moderatorGraceSeconds,
        String allowedOrigins,
        int passwordMaxAttempts,
        int passwordWindowSeconds,
        int createRoomsPerMinute,
        int messagesPerSecond,
        int maxRooms,
        int joinsPerMinute,
        int socketConnectsPerMinute) {

    @ConstructorBinding
    public AppProperties {
    }

    /** Eski imza (testler): yeni sınırlar varsayılan değerleriyle. */
    public AppProperties(int maxParticipants, int idleExpiryDays, int moderatorGraceSeconds, String allowedOrigins,
                         int passwordMaxAttempts, int passwordWindowSeconds, int createRoomsPerMinute,
                         int messagesPerSecond) {
        this(maxParticipants, idleExpiryDays, moderatorGraceSeconds, allowedOrigins, passwordMaxAttempts,
                passwordWindowSeconds, createRoomsPerMinute, messagesPerSecond, 2000, 60, 120);
    }

    public List<String> allowedOriginList() {
        if (allowedOrigins == null || allowedOrigins.isBlank()) {
            return List.of();
        }
        return Arrays.stream(allowedOrigins.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }
}
