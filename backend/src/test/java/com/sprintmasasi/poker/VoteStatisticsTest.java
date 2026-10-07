package com.sprintmasasi.poker;

import static org.assertj.core.api.Assertions.assertThat;

import com.sprintmasasi.poker.VoteStatistics.Consensus;
import com.sprintmasasi.poker.VoteStatistics.Result;
import com.sprintmasasi.poker.VoteStatistics.Vote;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class VoteStatisticsTest {

    private static final Deck MOD_FIB = Deck.preset("modified-fibonacci");
    private static final Deck TSHIRT = Deck.preset("tshirt");

    /** "a=5", "b=8" gibi kısa yazım: kişi=kart. */
    private static List<Vote> votes(String... pairs) {
        List<Vote> out = new ArrayList<>();
        for (String p : pairs) {
            int eq = p.indexOf('=');
            out.add(new Vote(p.substring(0, eq), p.substring(eq + 1)));
        }
        return out;
    }

    @Test
    void averageMedianAndMode() {
        Result r = VoteStatistics.compute(MOD_FIB, votes("a=3", "b=5", "c=5", "d=8"));

        assertThat(r.average()).isEqualTo(5.25);
        assertThat(r.median()).isEqualTo(5.0);
        assertThat(r.modes()).containsExactly("5");
        assertThat(r.voteCount()).isEqualTo(4);
        assertThat(r.countedCount()).isEqualTo(4);
        assertThat(r.lowestIds()).containsExactly("a");
        assertThat(r.highestIds()).containsExactly("d");
        assertThat(r.consensus()).isEqualTo(Consensus.SPREAD);
        assertThat(r.suggested()).isEqualTo("5");
    }

    @Test
    void medianOfEvenCountIsMiddleAverage() {
        Result r = VoteStatistics.compute(MOD_FIB, votes("a=2", "b=3", "c=8", "d=13"));
        assertThat(r.median()).isEqualTo(5.5);
        // 5.5'e en yakın kartlar 5 ve 8 değil; 5 (fark 0.5) ve 8 (fark 2.5) → 5
        assertThat(r.suggested()).isEqualTo("5");
    }

    @Test
    void suggestionTieGoesToTheHigherCard() {
        // medyan 4: 3 ve 5 eşit uzaklıkta → büyük olan
        Result r = VoteStatistics.compute(MOD_FIB, votes("a=3", "b=5"));
        assertThat(r.median()).isEqualTo(4.0);
        assertThat(r.suggested()).isEqualTo("5");
    }

    @Test
    void questionMarkAndCoffeeAreShownButNotCounted() {
        Result r = VoteStatistics.compute(MOD_FIB, votes("a=5", "b=?", "c=☕", "d=8", "e=?"));

        assertThat(r.voteCount()).isEqualTo(5);
        assertThat(r.countedCount()).isEqualTo(2);
        assertThat(r.average()).isEqualTo(6.5);
        assertThat(r.median()).isEqualTo(6.5);
        // ? iki kişi seçse de mod olamaz
        assertThat(r.modes()).containsExactly("5", "8");
        assertThat(r.distribution()).extracting(VoteStatistics.Bucket::card).containsExactly("5", "8", "?", "☕");
        assertThat(r.distribution()).extracting(VoteStatistics.Bucket::count).containsExactly(1, 1, 2, 1);
        assertThat(r.consensus()).isEqualTo(Consensus.CLOSE);
    }

    @Test
    void halfCardCountsAsHalfInEverySpelling() {
        Deck custom = Deck.custom(List.of("0.5", "1/2", "½", "1"));
        Result r = VoteStatistics.compute(custom, votes("a=0.5", "b=1/2", "c=½"));
        assertThat(r.average()).isEqualTo(0.5);
        assertThat(r.median()).isEqualTo(0.5);
    }

    @Test
    void singleVoterIsUnanimousWithNoHighlights() {
        Result r = VoteStatistics.compute(MOD_FIB, votes("a=13"));
        assertThat(r.average()).isEqualTo(13.0);
        assertThat(r.median()).isEqualTo(13.0);
        assertThat(r.modes()).containsExactly("13");
        assertThat(r.consensus()).isEqualTo(Consensus.UNANIMOUS);
        assertThat(r.lowestIds()).isEmpty();
        assertThat(r.highestIds()).isEmpty();
        assertThat(r.suggested()).isEqualTo("13");
    }

    @Test
    void everyoneSameIsUnanimous() {
        Result r = VoteStatistics.compute(MOD_FIB, votes("a=8", "b=8", "c=8"));
        assertThat(r.consensus()).isEqualTo(Consensus.UNANIMOUS);
        assertThat(r.lowestIds()).isEmpty();
    }

    @Test
    void adjacentCardsAreClose() {
        Result r = VoteStatistics.compute(MOD_FIB, votes("a=5", "b=8", "c=8"));
        assertThat(r.consensus()).isEqualTo(Consensus.CLOSE);
        assertThat(r.lowestIds()).containsExactly("a");
        assertThat(r.highestIds()).containsExactly("b", "c");
    }

    @Test
    void tiedModesAreAllReported() {
        Result r = VoteStatistics.compute(MOD_FIB, votes("a=2", "b=2", "c=8", "d=8", "e=3"));
        assertThat(r.modes()).containsExactly("2", "8");
    }

    @Test
    void onlySpecialCardsMeansNoNumbers() {
        Result r = VoteStatistics.compute(MOD_FIB, votes("a=?", "b=☕"));
        assertThat(r.average()).isNull();
        assertThat(r.median()).isNull();
        assertThat(r.modes()).isEmpty();
        assertThat(r.consensus()).isEqualTo(Consensus.NONE);
        assertThat(r.suggested()).isNull();
    }

    @Test
    void noVotesAtAll() {
        Result r = VoteStatistics.compute(MOD_FIB, List.of());
        assertThat(r.voteCount()).isZero();
        assertThat(r.consensus()).isEqualTo(Consensus.NONE);
        assertThat(r.distribution()).isEmpty();
    }

    @Test
    void tshirtDeckUsesDeckOrderWithoutAverage() {
        Result r = VoteStatistics.compute(TSHIRT, votes("a=S", "b=M", "c=M", "d=XL"));
        assertThat(r.average()).isNull();
        assertThat(r.median()).isNull();
        assertThat(r.modes()).containsExactly("M");
        assertThat(r.lowestIds()).containsExactly("a");
        assertThat(r.highestIds()).containsExactly("d");
        assertThat(r.consensus()).isEqualTo(Consensus.SPREAD);
        assertThat(r.suggested()).isEqualTo("M");
    }

    @Test
    void mixedCustomDeckAveragesOnlyNumbers() {
        Deck custom = Deck.custom(List.of("1", "2", "çok", "?"));
        Result r = VoteStatistics.compute(custom, votes("a=1", "b=2", "c=çok"));
        assertThat(r.average()).isEqualTo(1.5);
        assertThat(r.countedCount()).isEqualTo(3);
        assertThat(r.distribution()).extracting(VoteStatistics.Bucket::card).containsExactly("1", "2", "çok");
        assertThat(r.highestIds()).containsExactly("c");
    }
}
