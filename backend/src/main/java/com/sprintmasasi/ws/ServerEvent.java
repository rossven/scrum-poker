package com.sprintmasasi.ws;

/**
 * Sunucudan istemciye giden her mesajın zarfı. Şemalar docs/events.md'de.
 * v: olay şeması sürümü (kırıcı değişiklikte artar).
 */
public record ServerEvent(String type, int v, Object data) {

    public static ServerEvent of(String type, Object data) {
        return new ServerEvent(type, 1, data);
    }
}
