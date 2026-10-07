package com.sprintmasasi.ws;

import com.sprintmasasi.config.AppProperties;
import com.sprintmasasi.room.RateLimiter;
import com.sprintmasasi.room.RoomException;
import com.sprintmasasi.room.RoomService;
import java.time.Clock;
import java.time.Duration;
import java.util.Set;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

/**
 * STOMP güvenlik kapısı:
 * - CONNECT: "room" ve "token" başlıklarıyla koltuk doğrulanır, oturuma kimlik atanır.
 * - SUBSCRIBE: yalnızca kendi odasının konusu ve kişisel kuyruklar.
 * - SEND: katılımcı başına hız sınırı.
 */
@Component
public class StompAuthInterceptor implements ChannelInterceptor {

    private static final Set<String> USER_QUEUES = Set.of(
            "/user" + Destinations.USER_ROOM_QUEUE, "/user" + Destinations.USER_ERROR_QUEUE);

    private final RoomService rooms;
    private final RateLimiter messageLimiter;

    public StompAuthInterceptor(@Lazy RoomService rooms, AppProperties props, Clock clock) {
        this.rooms = rooms;
        this.messageLimiter = new RateLimiter(clock, props.messagesPerSecond(), Duration.ofSeconds(1));
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }
        StompCommand command = accessor.getCommand();
        switch (command) {
            case CONNECT -> authenticate(accessor);
            case SUBSCRIBE -> checkSubscription(accessor);
            case SEND -> checkRate(accessor);
            default -> { }
        }
        return message;
    }

    private void authenticate(StompHeaderAccessor accessor) {
        String room = accessor.getFirstNativeHeader("room");
        String token = accessor.getFirstNativeHeader("token");
        try {
            String participantId = rooms.authenticate(room, token);
            accessor.setUser(new RoomPrincipal(com.sprintmasasi.room.SecureIds.normalizeCode(room), participantId));
        } catch (RoomException e) {
            // ERROR çerçevesinin mesajı olarak istemciye gider (ör. ROOM_NOT_FOUND).
            throw new MessagingException(e.code().name());
        }
    }

    private void checkSubscription(StompHeaderAccessor accessor) {
        RoomPrincipal principal = principal(accessor);
        String destination = accessor.getDestination();
        boolean allowed = Destinations.roomTopic(principal.roomCode()).equals(destination)
                || USER_QUEUES.contains(destination);
        if (!allowed) {
            throw new MessagingException("FORBIDDEN");
        }
    }

    private void checkRate(StompHeaderAccessor accessor) {
        RoomPrincipal principal = principal(accessor);
        if (!messageLimiter.tryAcquire(principal.getName())) {
            throw new MessagingException("RATE_LIMITED");
        }
    }

    private static RoomPrincipal principal(StompHeaderAccessor accessor) {
        if (accessor.getUser() instanceof RoomPrincipal p) {
            return p;
        }
        throw new MessagingException("INVALID_TOKEN");
    }
}
