package com.sprintmasasi.web;

import com.sprintmasasi.room.RoomService;
import com.sprintmasasi.room.RoomViews.CreateRoomResult;
import com.sprintmasasi.room.RoomViews.JoinResult;
import com.sprintmasasi.room.RoomViews.RoomInfo;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    public record CreateRoomRequest(String name, String deck, List<String> customDeck, String password,
                                    boolean ticketsEnabled, boolean autoReveal) {}

    /** takeover: aynı isimli çevrimdışı koltuk için yanıt (null = henüz sorulmadı; bkz. SEAT_TAKEOVER). */
    public record JoinRequest(String nickname, String avatar, boolean observer, String password, String token,
                              String claimToken, Boolean takeover) {}

    private final RoomService rooms;

    public RoomController(RoomService rooms) {
        this.rooms = rooms;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CreateRoomResult create(@RequestBody CreateRoomRequest body, HttpServletRequest request) {
        return rooms.create(body.name(), body.deck(), body.customDeck(), body.password(), body.ticketsEnabled(),
                body.autoReveal(), ClientIp.of(request));
    }

    @GetMapping("/{code}")
    public RoomInfo info(@PathVariable String code) {
        return rooms.info(code);
    }

    @PostMapping("/{code}/join")
    public JoinResult join(@PathVariable String code, @RequestBody JoinRequest body, HttpServletRequest request) {
        return rooms.join(code, body.nickname(), body.avatar(), body.observer(), body.password(), body.token(),
                body.claimToken(), body.takeover(), ClientIp.of(request));
    }
}
