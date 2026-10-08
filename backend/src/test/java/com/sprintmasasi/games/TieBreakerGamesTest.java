package com.sprintmasasi.games;

import static org.assertj.core.api.Assertions.assertThat;

import com.sprintmasasi.games.TieBreakerGame.Candidate;
import java.security.SecureRandom;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.SplittableRandom;
import org.junit.jupiter.api.Test;

class TieBreakerGamesTest {

    private static final int TRIALS = 10_000;

    private static List<Candidate> equal(int n) {
        return java.util.stream.IntStream.range(0, n).mapToObj(i -> new Candidate("p" + i, 1.0)).toList();
    }

    private static Map<String, Integer> wins(TieBreakerGame game, List<Candidate> candidates) {
        var random = new SecureRandom();
        var wins = new HashMap<String, Integer>();
        for (int i = 0; i < TRIALS; i++) {
            wins.merge(game.play(candidates, random).ranking().getFirst(), 1, Integer::sum);
        }
        return wins;
    }

    /** Kabul kriteri: eşit ağırlıkta her aday ~1/n kazanır (±4 standart sapma: yanlış alarm olasılığı yok denecek kadar az). */
    @Test
    void equalWeightsGiveEqualChancesOverTenThousandTrials() {
        for (TieBreakerGame game : List.of(new HorseRaceGame(), new WheelGame())) {
            int n = 4;
            var wins = wins(game, equal(n));
            double p = 1.0 / n;
            double sd = Math.sqrt(TRIALS * p * (1 - p));
            assertThat(wins).hasSize(n);
            wins.values().forEach(w -> assertThat((double) w).isBetween(TRIALS * p - 4 * sd, TRIALS * p + 4 * sd));
        }
    }

    /** Ağırlıklı modda kazanma oranı ağırlıkla orantılı (1 : 0.5 : 0.25 → 4/7, 2/7, 1/7). */
    @Test
    void weightedChancesFollowWeights() {
        var candidates = List.of(new Candidate("a", 1.0), new Candidate("b", 0.5), new Candidate("c", 0.25));
        for (TieBreakerGame game : List.of(new HorseRaceGame(), new WheelGame())) {
            var wins = wins(game, candidates);
            Map<String, Double> expected = Map.of("a", 4 / 7.0, "b", 2 / 7.0, "c", 1 / 7.0);
            expected.forEach((id, p) -> {
                double sd = Math.sqrt(TRIALS * p * (1 - p));
                assertThat((double) wins.getOrDefault(id, 0)).isBetween(TRIALS * p - 4 * sd, TRIALS * p + 4 * sd);
            });
        }
    }

    @Test
    void rankingContainsEveryCandidateOnce() {
        var outcome = new HorseRaceGame().play(equal(7), new SplittableRandom(1));
        assertThat(outcome.ranking()).hasSize(7).doesNotHaveDuplicates()
                .containsExactlyInAnyOrderElementsOf(equal(7).stream().map(Candidate::id).toList());
    }

    /** Yarışın akışı sonuca uygun: atlar geri gitmez ve çizgiye sunucunun sıralamasıyla varır. */
    @Test
    @SuppressWarnings("unchecked")
    void horseTracksEndInRankingOrderAndNeverGoBack() {
        var random = new SplittableRandom(42);
        for (int n : new int[] {2, 5, 12, 30}) {
            for (int trial = 0; trial < 200; trial++) {
                var outcome = new HorseRaceGame().play(equal(n), random);
                assertThat(outcome.durationMs()).isBetween(6000, 10000);
                var tracks = (Map<String, List<Double>>) outcome.animation().get("tracks");
                double previousEnd = Double.MAX_VALUE;
                for (String id : outcome.ranking()) {
                    List<Double> points = tracks.get(id);
                    assertThat(points).hasSize(HorseRaceGame.CHECKPOINTS);
                    for (int k = 1; k < points.size(); k++) {
                        assertThat(points.get(k)).isGreaterThanOrEqualTo(points.get(k - 1));
                    }
                    double end = points.getLast();
                    assertThat(end).isLessThan(previousEnd).isGreaterThan(0.4).isLessThanOrEqualTo(1.0);
                    previousEnd = end;
                }
                assertThat(tracks.get(outcome.ranking().getFirst()).getLast()).isEqualTo(1.0);
            }
        }
    }

    /** Çark kazananın dilimi üzerinde durur: dilimler aday sırasında, durma noktası dilimin içinde. */
    @Test
    void wheelStopsOnWinnersSlice() {
        var random = new SplittableRandom(7);
        var candidates = equal(5);
        for (int trial = 0; trial < 500; trial++) {
            var outcome = new WheelGame().play(candidates, random);
            var anim = outcome.animation();
            assertThat(anim.get("slices")).isEqualTo(candidates.stream().map(Candidate::id).toList());
            int slice = (int) anim.get("winnerSlice");
            assertThat(candidates.get(slice).id()).isEqualTo(outcome.ranking().getFirst());
            assertThat((double) anim.get("offset")).isBetween(0.15, 0.85);
            assertThat((int) anim.get("turns")).isBetween(4, 6);
        }
    }
}
