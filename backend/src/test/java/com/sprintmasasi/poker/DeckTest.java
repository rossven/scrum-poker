package com.sprintmasasi.poker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.sprintmasasi.room.ErrorCode;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class DeckTest {

    @Test
    void presetsMatchSpec() {
        assertThat(Deck.preset("modified-fibonacci").cards())
                .containsExactly("0", "½", "1", "2", "3", "5", "8", "13", "21", "34", "55", "?", "☕");
        assertThat(Deck.preset("fibonacci").cards())
                .containsExactly("0", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89", "?", "☕");
        assertThat(Deck.preset("tshirt").cards()).containsExactly("XS", "S", "M", "L", "XL", "?", "☕");
    }

    @Test
    void halfIsParsedTheSameInEverySpelling() {
        assertThat(Deck.numericValue("½")).isEqualTo(0.5);
        assertThat(Deck.numericValue("0.5")).isEqualTo(0.5);
        assertThat(Deck.numericValue("0,5")).isEqualTo(0.5);
        assertThat(Deck.numericValue("1/2")).isEqualTo(0.5);
        assertThat(Deck.numericValue("13")).isEqualTo(13.0);
    }

    @Test
    void nonNumericCardsHaveNoValue() {
        for (String card : List.of("?", "☕", "XS", "L", "büyük", "1/0", "1.2.3", "")) {
            assertThat(Deck.numericValue(card)).as(card).isNull();
        }
    }

    @Test
    void customDeckIsTrimmedAndKeepsOrder() {
        Deck d = Deck.custom(List.of(" 1 ", "2", "", "kolay", "?"));
        assertThat(d.id()).isEqualTo("custom");
        assertThat(d.cards()).containsExactly("1", "2", "kolay", "?");
    }

    @Test
    void customDeckRejectsMoreThanTwentyCards() {
        List<String> cards = new ArrayList<>();
        for (int i = 0; i < 21; i++) {
            cards.add("k" + i);
        }
        assertThatThrownBy(() -> Deck.custom(cards)).extracting("code").isEqualTo(ErrorCode.INVALID_DECK);
        assertThat(Deck.custom(cards.subList(0, 20)).cards()).hasSize(20);
    }

    @Test
    void customDeckRejectsLongCards() {
        assertThatThrownBy(() -> Deck.custom(List.of("1", "123456789"))).extracting("code")
                .isEqualTo(ErrorCode.INVALID_DECK);
        assertThat(Deck.custom(List.of("12345678")).cards()).containsExactly("12345678");
    }

    @Test
    void customDeckRejectsDuplicates() {
        assertThatThrownBy(() -> Deck.custom(List.of("1", "2", "1"))).extracting("code")
                .isEqualTo(ErrorCode.INVALID_DECK);
        assertThatThrownBy(() -> Deck.custom(List.of("xl", "XL"))).extracting("code")
                .isEqualTo(ErrorCode.INVALID_DECK);
    }

    @Test
    void customDeckRejectsEmptyAndControlCharacters() {
        assertThatThrownBy(() -> Deck.custom(List.of(" ", ""))).extracting("code").isEqualTo(ErrorCode.INVALID_DECK);
        assertThatThrownBy(() -> Deck.custom(List.of("a\u0000"))).extracting("code").isEqualTo(ErrorCode.INVALID_DECK);
    }
}
