package com.sprintmasasi.games;

import java.util.List;
import java.util.Map;
import java.util.random.RandomGenerator;
import org.springframework.stereotype.Component;

/**
 * Şans çarkı. Dilimler adayların verilen sırasıyla ve eşit genişlikte çizilir (ağırlık yalnızca seçim olasılığını
 * değiştirir, görüntüyü değil). Sunucu kazananı çeker; çarkın kaç tur döneceğini ve kazananın dilimi içinde nerede
 * duracağını (0..1, kenarlardan uzak) da belirler.
 */
@Component
public class WheelGame implements TieBreakerGame {

    static final int DURATION_MS = 6500;

    @Override
    public String id() {
        return "wheel";
    }

    @Override
    public Outcome play(List<Candidate> candidates, RandomGenerator random) {
        List<String> ranking = WeightedDraw.ranking(candidates, random);
        List<String> slices = candidates.stream().map(Candidate::id).toList();
        int turns = 4 + random.nextInt(3);
        double offset = Math.round((0.15 + random.nextDouble() * 0.7) * 1000) / 1000.0;
        return new Outcome(ranking, DURATION_MS, Map.of(
                "slices", slices,
                "winnerSlice", slices.indexOf(ranking.getFirst()),
                "turns", turns,
                "offset", offset));
    }
}
