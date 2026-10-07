package com.sprintmasasi.room;

import com.sprintmasasi.room.RoomViews.RoundRecordView;
import java.util.ArrayList;
import java.util.List;

/** Kuyruktaki bir iş. Room kilidi altında değiştirilir. */
class Ticket {

    enum Status { PENDING, ESTIMATED }

    static final int MAX_HISTORY = 20;

    private final String id;
    private String title;
    private String link;
    private String note;
    private Status status = Status.PENDING;
    private String finalEstimate;
    /** Açılmış turların kaydı (en eskiden yeniye). */
    private final List<RoundRecordView> history = new ArrayList<>();

    Ticket(String id, String title, String link, String note) {
        this.id = id;
        this.title = title;
        this.link = link;
        this.note = note;
    }

    String id() { return id; }
    String title() { return title; }
    String link() { return link; }
    String note() { return note; }
    Status status() { return status; }
    String finalEstimate() { return finalEstimate; }
    List<RoundRecordView> history() { return history; }

    void edit(String title, String link, String note) {
        this.title = title;
        this.link = link;
        this.note = note;
    }

    void estimate(String value) {
        status = Status.ESTIMATED;
        finalEstimate = value;
    }

    void addHistory(RoundRecordView record) {
        history.add(record);
        if (history.size() > MAX_HISTORY) {
            history.removeFirst();
        }
    }
}
