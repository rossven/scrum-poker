package com.sprintmasasi.games;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.random.RandomGenerator;
import org.springframework.stereotype.Component;

/**
 * At yarışı. Sıralama önce çekilir; sonra her at için yarış boyunca eşit aralıklı ara noktalar (0..1 ilerleme)
 * üretilir. Ortada sıralar karışır (yer değiştirmeler), sona doğru sapma sıfırlanır ve atlar çizgiye
 * çekilen sırayla ulaşır. İstemci bu noktalar arasında yumuşak geçiş çizer; kendi rastgeleliği yoktur.
 */
@Component
public class HorseRaceGame implements TieBreakerGame {

    /** Ara nokta sayısı (başlangıç 0 hariç). */
    static final int CHECKPOINTS = 10;
    static final int MIN_DURATION_MS = 6000;
    static final int MAX_DURATION_MS = 10000;

    @Override
    public String id() {
        return "horse";
    }

    @Override
    public Outcome play(List<Candidate> candidates, RandomGenerator random) {
        List<String> ranking = WeightedDraw.ranking(candidates, random);
        int duration = MIN_DURATION_MS + random.nextInt(MAX_DURATION_MS - MIN_DURATION_MS + 1);

        // Bitişte konumlar: kazanan çizgide (1.0), diğerleri arkasında rastgele aralıklarla.
        Map<String, Double> finish = new LinkedHashMap<>();
        // Aralık kalabalıkta küçülür: en geridekiler de pistin ortasını geçmiş olsun.
        double maxGap = Math.min(0.075, 0.45 / Math.max(1, ranking.size() - 1));
        double pos = 1.0;
        for (String id : ranking) {
            finish.put(id, pos);
            pos -= maxGap * (0.35 + random.nextDouble() * 0.65);
        }

        Map<String, List<Double>> tracks = new LinkedHashMap<>();
        for (String id : ranking) {
            double end = finish.get(id);
            List<Double> points = new ArrayList<>(CHECKPOINTS);
            double prev = 0;
            for (int k = 1; k <= CHECKPOINTS; k++) {
                double t = (double) k / CHECKPOINTS;
                double value;
                if (k == CHECKPOINTS) {
                    value = end;
                } else {
                    // Ortada en büyük, sona doğru azalan sapma: yer değiştirme olur ama bitiş sırası korunur.
                    double wobble = (random.nextDouble() - 0.5) * 0.22 * Math.sin(Math.PI * t) * (1 - t * 0.6);
                    value = Math.min(end * t + wobble, end - 0.01 * (CHECKPOINTS - k));
                }
                value = Math.max(value, prev + 0.004); // atlar geri gitmez
                points.add(round(value));
                prev = value;
            }
            // Son nokta tam bitiş konumu; yukarıdaki alt sınır onu aşmış olamaz çünkü end - 0.01*(n-k) < end.
            points.set(CHECKPOINTS - 1, round(end));
            tracks.put(id, points);
        }
        return new Outcome(ranking, duration, Map.of("tracks", tracks));
    }

    private static double round(double v) {
        return Math.round(v * 10000) / 10000.0;
    }
}
