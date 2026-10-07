package com.sprintmasasi.room;

import java.time.Duration;
import java.util.List;
import java.util.Optional;

/**
 * Oda saklama arayüzü. Şimdilik bellek içi; ileride kalıcı bir depo
 * (ör. Redis/Postgres) bu arayüzü uygulayarak eklenebilir.
 */
public interface RoomRepository {

    Optional<Room> find(String code);

    /** Kod zaten varsa false döner (oda kodu çakışması). */
    boolean saveIfAbsent(Room room);

    void save(Room room);

    void delete(String code);

    /** Son etkinliği verilen süreden eski odaları siler, silinen kodları döner. */
    List<String> expireIdle(Duration maxIdle);
}
