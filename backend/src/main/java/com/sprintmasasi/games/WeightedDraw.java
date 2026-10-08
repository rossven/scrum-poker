package com.sprintmasasi.games;

import java.util.ArrayList;
import java.util.List;
import java.util.random.RandomGenerator;

/** Ağırlıklı, yerine koymadan çekiliş: önce kazanan, sonra kalanlar arasından ikinci... */
public final class WeightedDraw {

    private WeightedDraw() {}

    public static List<String> ranking(List<TieBreakerGame.Candidate> candidates, RandomGenerator random) {
        List<TieBreakerGame.Candidate> left = new ArrayList<>(candidates);
        List<String> out = new ArrayList<>(left.size());
        while (!left.isEmpty()) {
            double total = left.stream().mapToDouble(TieBreakerGame.Candidate::weight).sum();
            double r = random.nextDouble() * total;
            int pick = left.size() - 1; // kayan nokta yuvarlamasına karşı son aday
            for (int i = 0; i < left.size(); i++) {
                r -= left.get(i).weight();
                if (r < 0) {
                    pick = i;
                    break;
                }
            }
            out.add(left.remove(pick).id());
        }
        return out;
    }
}
