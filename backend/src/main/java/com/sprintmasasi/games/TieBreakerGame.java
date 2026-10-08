package com.sprintmasasi.games;

import java.util.List;
import java.util.Map;
import java.util.random.RandomGenerator;

/**
 * "Kim alacak?" mini oyunu. Sonucu her zaman sunucu belirler: girdi adaylar + ağırlıklar + rastgele kaynak,
 * çıktı tam sıralama + istemcinin animasyonu sonuca uygun çizmesi için parametreler.
 * Yeni oyun = bu arayüzü uygulayan yeni bir sınıf + yeni bir istemci bileşeni.
 */
public interface TieBreakerGame {

    /** Aday ve seçilme ağırlığı (varsayılan 1; dönüşümlü adalet modunda kazandıkça azalır). */
    record Candidate(String id, double weight) {}

    /**
     * @param ranking    birinci kazanan, sonra diğerleri
     * @param durationMs animasyonun süresi
     * @param animation  oyuna özel animasyon parametreleri (JSON'a olduğu gibi yazılır)
     */
    record Outcome(List<String> ranking, int durationMs, Map<String, Object> animation) {}

    /** Olaylarda ve istatistikte kullanılan kimlik, ör. "horse". */
    String id();

    /** candidates boş olmamalı. Sıralama ağırlıklara göre çekilir, animasyon bu sıralamaya uydurulur. */
    Outcome play(List<Candidate> candidates, RandomGenerator random);
}
