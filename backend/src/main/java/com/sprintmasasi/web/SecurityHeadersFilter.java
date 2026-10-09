package com.sprintmasasi.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Tarayıcı güvenlik başlıkları. Uygulama tek origin'den sunulur ve harici script, font ya da
 * görsel kullanmaz; bu yüzden içerik politikası "yalnızca kendi adresimiz" olabilir.
 * - frame-ancestors / X-Frame-Options: site başka bir sayfaya gömülemez (clickjacking).
 * - script-src 'self': araya sızmış bir script çalışamaz; koltuk token'ı localStorage'da olduğu için önemli.
 * - style-src 'unsafe-inline': animasyon kütüphanesi satır içi stil kullanıyor; stil ile script çalıştırılamaz.
 */
@Component
public class SecurityHeadersFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        response.setHeader("Content-Security-Policy", contentSecurityPolicy(request));
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
        response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        if (request.isSecure()) {
            response.setHeader("Strict-Transport-Security", "max-age=31536000");
        }
        chain.doFilter(request, response);
    }

    static String contentSecurityPolicy(HttpServletRequest request) {
        return "default-src 'self'; "
                + "script-src 'self'; "
                + "style-src 'self' 'unsafe-inline'; "
                + "img-src 'self' data:; "
                + "font-src 'self' data:; "
                // Eski Safari sürümleri 'self' ile ws/wss adresini eşleştirmiyor; adres açıkça yazılır.
                + "connect-src 'self' " + socketOrigin(request) + "; "
                + "object-src 'none'; "
                + "base-uri 'self'; "
                + "form-action 'self'; "
                + "frame-ancestors 'none'";
    }

    private static String socketOrigin(HttpServletRequest request) {
        boolean secure = request.isSecure();
        int port = request.getServerPort();
        boolean defaultPort = port <= 0 || (secure ? port == 443 : port == 80);
        String host = request.getServerName();
        if (host == null || !host.matches("[A-Za-z0-9.\\-]+|\\[[0-9A-Fa-f:.]+]")) {
            return "";
        }
        return (secure ? "wss://" : "ws://") + host + (defaultPort ? "" : ":" + port);
    }
}
