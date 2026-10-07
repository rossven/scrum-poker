package com.sprintmasasi.ws;

final class Destinations {

    static final String ROOM_TOPIC_PREFIX = "/topic/room/";
    static final String USER_ROOM_QUEUE = "/queue/room";
    static final String USER_ERROR_QUEUE = "/queue/errors";

    private Destinations() {}

    static String roomTopic(String code) {
        return ROOM_TOPIC_PREFIX + code;
    }
}
