package com.sprintmasasi.config;

import com.sprintmasasi.ws.StompAuthInterceptor;
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

    public WebSocketConfig(AppProperties props, StompAuthInterceptor authInterceptor) {
        this.props = props;
        this.authInterceptor = authInterceptor;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Bir istemciden gelen çerçeveler sırayla işlensin (SUBSCRIBE, SEND'den önce).
        registry.setPreserveReceiveOrder(true);
        var endpoint = registry.addEndpoint("/ws");
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
