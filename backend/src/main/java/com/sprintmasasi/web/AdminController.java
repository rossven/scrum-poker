package com.sprintmasasi.web;

import com.sprintmasasi.stats.UsageStats;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

/** Kullanım sayaçları. SM_ADMIN_TOKEN tanımlı değilse uç nokta kapalıdır (404). */
@RestController
public class AdminController {

    private final UsageStats stats;
    private final String adminToken;

    public AdminController(UsageStats stats, @Value("${SM_ADMIN_TOKEN:}") String adminToken) {
        this.stats = stats;
        this.adminToken = adminToken;
    }

    @GetMapping("/admin/stats")
    public ResponseEntity<Map<String, Object>> stats(@RequestHeader(value = "Authorization", required = false) String auth) {
        if (adminToken.isBlank()) {
            return ResponseEntity.notFound().build();
        }
        String expected = "Bearer " + adminToken;
        if (auth == null || !MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),
                auth.getBytes(StandardCharsets.UTF_8))) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(stats.snapshot());
    }
}
