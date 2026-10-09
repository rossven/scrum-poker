package com.sprintmasasi.ws;

import com.sprintmasasi.config.AppProperties;
import com.sprintmasasi.room.RateLimiter;
import java.time.Clock;
import java.time.Duration;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

/**
 * WebSocket bağlantı açma sınırı (IP başına, dakikada). Token doğrulaması CONNECT'te yapılır;
 * bu kapı, geçersiz bağlantılarla sunucunun oturum ve bellek açısından yorulmasını önler.
 */
@Component
public class HandshakeRateLimit implements HandshakeInterceptor {

    private final RateLimiter limiter;

    public HandshakeRateLimit(AppProperties props, Clock clock) {
        this.limiter = new RateLimiter(clock, props.socketConnectsPerMinute(), Duration.ofMinutes(1));
    }

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler,
                                   Map<String, Object> attributes) {
        if (limiter.tryAcquire(clientIp(request))) {
            return true;
        }
        response.setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
        return false;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler,
                               Exception exception) {
    }

    @Scheduled(fixedDelayString = "PT5M", initialDelayString = "PT5M")
    void purge() {
        limiter.purge();
    }

    /** server.forward-headers-strategy=native ise ters vekil arkasındaki gerçek IP. */
    private static String clientIp(ServerHttpRequest request) {
        if (request instanceof ServletServerHttpRequest servlet) {
            return servlet.getServletRequest().getRemoteAddr();
        }
        var address = request.getRemoteAddress();
        return address == null ? "unknown" : address.getAddress().getHostAddress();
    }
}
