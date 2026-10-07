package com.sprintmasasi.poker;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Açılan oyların analizi. Saf hesap: durum tutmaz, test edilmesi kolay.
 * <ul>
 *   <li>Ortalama ve medyan yalnızca sayıya çevrilebilen kartlardan.</li>
 *   <li>Mod, uzlaşı ve en düşük/en yüksek oy: "?" ve "☕" dışındaki tüm kartlar, deste sırasına göre.</li>
 *   <li>Dağılım: tüm kartlar ("?" ve "☕" dahil), deste sırasıyla.</li>
 * </ul>
 */
public final class VoteStatistics {

    public record Vote(String participantId, String card) {}

    public record Bucket(String card, int count, List<String> participantIds) {}

    public enum Consensus {
        /** Sayılabilir oy yok (herkes ? / ☕ dedi ya da kimse oy vermedi). */
        NONE,
        /** Herkes aynı kartı seçti. */
        UNANIMOUS,
        /** Oylar destede yan yana iki karta dağıldı. */
        CLOSE,
        /** Daha geniş dağılım. */
        SPREAD
    }

    public record Result(
            int voteCount,
            int countedCount,
            Double average,
            Double median,
            List<String> modes,
            List<Bucket> distribution,
            List<String> lowestIds,
            List<String> highestIds,
            Consensus consensus,
            String suggested) {}

    private VoteStatistics() {}

    public static Result compute(Deck deck, List<Vote> votes) {
        List<Vote> counted = votes.stream().filter(v -> !Deck.isSpecial(v.card())).toList();

        List<Double> numbers = counted.stream().map(v -> Deck.numericValue(v.card()))
                .filter(n -> n != null).sorted().toList();
        Double average = numbers.isEmpty() ? null
                : round2(numbers.stream().mapToDouble(Double::doubleValue).average().orElse(0));
        Double median = numbers.isEmpty() ? null : round2(median(numbers));

        List<Bucket> distribution = distribution(deck, votes);
        int top = distribution.stream().filter(b -> !Deck.isSpecial(b.card())).mapToInt(Bucket::count).max().orElse(0);
        List<String> modes = top == 0 ? List.of() : distribution.stream()
                .filter(b -> !Deck.isSpecial(b.card()) && b.count() == top).map(Bucket::card).toList();

        int minIdx = counted.stream().mapToInt(v -> rank(deck, v.card())).min().orElse(-1);
        int maxIdx = counted.stream().mapToInt(v -> rank(deck, v.card())).max().orElse(-1);
        List<String> lowest = List.of();
        List<String> highest = List.of();
        if (minIdx != maxIdx) {
            lowest = counted.stream().filter(v -> rank(deck, v.card()) == minIdx).map(Vote::participantId).toList();
            highest = counted.stream().filter(v -> rank(deck, v.card()) == maxIdx).map(Vote::participantId).toList();
        }

        Consensus consensus;
        if (counted.isEmpty()) {
            consensus = Consensus.NONE;
        } else if (minIdx == maxIdx) {
            consensus = Consensus.UNANIMOUS;
        } else if (adjacent(deck, minIdx, maxIdx)) {
            consensus = Consensus.CLOSE;
        } else {
            consensus = Consensus.SPREAD;
        }

        return new Result(votes.size(), counted.size(), average, median, modes, distribution, lowest, highest,
                consensus, suggest(deck, counted, median));
    }

    /**
     * Final için önerilen kart: medyana en yakın sayısal kart (eşitlikte büyük olan;
     * tahminde iyimser olmamak için). Sayısal oy yoksa deste sırasında ortadaki oy.
     */
    static String suggest(Deck deck, List<Vote> counted, Double median) {
        if (counted.isEmpty()) {
            return null;
        }
        if (median != null) {
            String best = null;
            double bestDiff = Double.MAX_VALUE;
            for (String card : deck.cards()) {
                Double n = Deck.numericValue(card);
                if (n == null) {
                    continue;
                }
                double diff = Math.abs(n - median);
                if (diff < bestDiff - 1e-9 || (Math.abs(diff - bestDiff) <= 1e-9 && n > Deck.numericValue(best))) {
                    best = card;
                    bestDiff = diff;
                }
            }
            if (best != null) {
                return best;
            }
        }
        List<Integer> ranks = counted.stream().map(v -> rank(deck, v.card())).sorted().toList();
        int idx = ranks.get(ranks.size() / 2); // çift sayıda oyda üstteki orta
        return idx >= 0 && idx < deck.cards().size() ? deck.cards().get(idx) : counted.getFirst().card();
    }

    private static List<Bucket> distribution(Deck deck, List<Vote> votes) {
        Map<String, List<String>> byCard = new LinkedHashMap<>();
        votes.stream()
                .sorted(Comparator.comparingInt(v -> rank(deck, v.card())))
                .forEach(v -> byCard.computeIfAbsent(v.card(), k -> new ArrayList<>()).add(v.participantId()));
        return byCard.entrySet().stream()
                .map(e -> new Bucket(e.getKey(), e.getValue().size(), List.copyOf(e.getValue())))
                .toList();
    }

    /** Kartın deste sırasındaki yeri; destede olmayan kart (olmamalı ama) sona konur. */
    private static int rank(Deck deck, String card) {
        int idx = deck.indexOf(card);
        return idx >= 0 ? idx : deck.cards().size();
    }

    /** İki kart deste sırasında yan yanaysa (aradaki "?"/"☕" sayılmadan). */
    private static boolean adjacent(Deck deck, int a, int b) {
        int between = 0;
        for (int i = Math.min(a, b) + 1; i < Math.max(a, b); i++) {
            if (!Deck.isSpecial(deck.cards().get(i))) {
                between++;
            }
        }
        return between == 0;
    }

    private static double median(List<Double> sorted) {
        int n = sorted.size();
        return n % 2 == 1 ? sorted.get(n / 2) : (sorted.get(n / 2 - 1) + sorted.get(n / 2)) / 2.0;
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
