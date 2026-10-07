package com.sprintmasasi.ws;

import com.sprintmasasi.room.ErrorCode;
import com.sprintmasasi.room.RoomEvents;
import com.sprintmasasi.room.RoomException;
import java.security.Principal;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.web.bind.annotation.ControllerAdvice;

/**
 * Tüm STOMP denetleyicileri için ortak hata işleyici: geçersiz/yetkisiz niyet durumu değiştirmez,
 * yalnızca gönderene "error" olayı gider.
 */
@ControllerAdvice
public class SocketErrorAdvice {

    private final RoomEvents events;

    public SocketErrorAdvice(RoomEvents events) {
        this.events = events;
    }

    @MessageExceptionHandler(RoomException.class)
    public void onRoomError(RoomException e, Principal principal) {
        if (principal instanceof RoomPrincipal p) {
            events.error(p.roomCode(), p.participantId(), e.code());
        }
    }

    @MessageExceptionHandler(Exception.class)
    public void onOtherError(Exception e, Principal principal) {
        if (principal instanceof RoomPrincipal p) {
            events.error(p.roomCode(), p.participantId(), ErrorCode.INVALID_INPUT);
        }
    }
}
