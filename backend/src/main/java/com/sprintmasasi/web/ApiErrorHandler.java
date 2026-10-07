package com.sprintmasasi.web;

import com.sprintmasasi.room.ErrorCode;
import com.sprintmasasi.room.RoomException;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiErrorHandler {

    @ExceptionHandler(RoomException.class)
    ResponseEntity<Map<String, String>> room(RoomException e) {
        return ResponseEntity.status(e.code().httpStatus()).body(Map.of("error", e.code().name()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<Map<String, String>> unreadable(HttpMessageNotReadableException e) {
        return ResponseEntity.badRequest().body(Map.of("error", ErrorCode.INVALID_INPUT.name()));
    }
}
