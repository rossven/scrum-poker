package com.sprintmasasi.config;

import com.sprintmasasi.ws.HandshakeRateLimit;
import com.sprintmasasi.ws.SessionRegistry;
import com.sprintmasasi.ws.StompAuthInterceptor;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;
import org.springframework.web.socket.handler.WebSocketHandlerDecorator;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final AppProperties props;
    private final StompAuthInterceptor authInterceptor;
    private final SessionRegistry sessions;
    private final HandshakeRateLimit handshakeRateLimit;

    public WebSocketConfig(AppProperties props, StompAuthInterceptor authInterceptor, SessionRegistry sessions,
                           HandshakeRateLimit handshakeRateLimit) {
        this.props = props;
        this.authInterceptor = authInterceptor;
        this.sessions = sessions;
        this.handshakeRateLimit = handshakeRateLimit;
    }

    /** Açık oturumları kaydet: masadan atılan kişinin bağlantısı sunucudan kapatılabilsin (M3). */
    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        registration.addDecoratorFactory(handler -> new WebSocketHandlerDecorator(handler) {
            @Override
            public void afterConnectionEstablished(WebSocketSession session) throws Exception {
                sessions.opened(session);
                super.afterConnectionEstablished(session);
            }

            @Override
            public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
                sessions.closed(session.getId());
                super.afterConnectionClosed(session, status);
            }
        });
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Bir istemciden gelen çerçeveler sırayla işlensin (SUBSCRIBE, SEND'den önce).
        registry.setPreserveReceiveOrder(true);
        var endpoint = registry.addEndpoint("/ws").addInterceptors(handshakeRateLimit);
        var origins = props.allowedOriginList();
        if (!origins.isEmpty()) {
            endpoint.setAllowedOrigins(origins.toArray(String[]::new));
        }
        // Liste boşsa Spring varsayılanı: yalnızca aynı origin kabul edilir.
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.setApplicationDestinationPrefixes("/app");
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setUserDestinationPrefix("/user");
        // Bir istemciye giden mesajlar yayın sırasıyla ulaşsın (eski durum yeniyi ezmesin).
        registry.setPreservePublishOrder(true);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(authInterceptor);
    }
}
