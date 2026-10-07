package com.sprintmasasi.room;

public class RoomException extends RuntimeException {

    private final ErrorCode code;

    public RoomException(ErrorCode code) {
        super(code.name(), null, false, false);
        this.code = code;
    }

    public ErrorCode code() {
        return code;
    }
}
