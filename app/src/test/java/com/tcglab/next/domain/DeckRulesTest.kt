package com.tcglab.next.domain

import com.tcglab.next.data.Deck
import com.tcglab.next.data.DeckCard
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class DeckRulesTest {
    private fun card(name: String, set: String = "A1", number: String = "1", quantity: Int = 2) =
        DeckCard(set, number, name, "Pokémon", quantity)

    private fun validDeck(cards: List<DeckCard> = (1..10).map { card("Carta $it", number = it.toString()) }) =
        Deck(0L, "Prueba", cards, listOf(1, 2))

    @Test
    fun validDeck_hasTwentyCardsAndValidEnergies() {
        assertTrue(DeckRules.isValid(validDeck()))
    }

    @Test
    fun deckWithTwentyOneCards_isInvalid() {
        val cards = (1..10).map { card("Carta $it", number = it.toString()) }.toMutableList()
        cards[0] = cards[0].copy(quantity = 3)
        assertFalse(DeckRules.isValid(validDeck(cards)))
    }

    @Test
    fun copiesAcrossDifferentPrintings_areCountedByName() {
        val cards = (1..10).map { card("Carta $it", number = it.toString()) }.toMutableList()
        cards[0] = card("Venusaur", "A1", "1", 2)
        cards[1] = card("Venusaur", "A2", "30", 2)
        assertFalse(DeckRules.isValid(validDeck(cards)))
    }

    @Test
    fun venusaurAndPokeballDifferentNames_doNotShareEntityIdentityRule() {
        val cards = (1..10).map { card("Carta $it", number = it.toString()) }.toMutableList()
        cards[0] = card("Venusaur", "A1", "1", 2)
        cards[1] = card("Poké Ball", "A2b", "1", 2)
        assertTrue(DeckRules.isValid(validDeck(cards)))
    }

    @Test
    fun repeatedEnergy_isInvalid() {
        assertFalse(DeckRules.isValid(validDeck().copy(energies = listOf(1, 1))))
    }

    @Test
    fun invalidEnergyId_isInvalid() {
        assertFalse(DeckRules.isValid(validDeck().copy(energies = listOf(1, 9))))
    }

    @Test
    fun normalize_ignoresCaseAndAccents() {
        assertTrue(DeckRules.normalize("Poké Ball") == DeckRules.normalize("poke ball"))
    }
}
