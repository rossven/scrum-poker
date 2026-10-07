package com.sprintmasasi.web;

import jakarta.servlet.http.HttpServletRequest;

/**
 * İstemci IP'si (hız sınırı anahtarı). Ters vekil arkasında çalışırken
 * server.forward-headers-strategy=native ayarlanırsa getRemoteAddr doğru IP'yi verir.
 */
final class ClientIp {

    private ClientIp() {}

    static String of(HttpServletRequest request) {
        return request.getRemoteAddr();
    }
}
