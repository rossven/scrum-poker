package com.sprintmasasi.config;

import java.util.Arrays;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "sprintmasasi")
public record AppProperties(
        int maxParticipants,
        int idleExpiryDays,
        int moderatorGraceSeconds,
        String allowedOrigins,
        int passwordMaxAttempts,
        int passwordWindowSeconds,
        int createRoomsPerMinute,
        int messagesPerSecond) {

    public List<String> allowedOriginList() {
        if (allowedOrigins == null || allowedOrigins.isBlank()) {
            return List.of();
        }
        return Arrays.stream(allowedOrigins.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }
}
