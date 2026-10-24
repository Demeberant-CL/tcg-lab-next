package com.tcglab.next.domain

import com.tcglab.next.data.Deck\nimport com.tcglab.next.data.DeckCard
import java.text.Normalizer
import java.util.Locale

object DeckRules {
    const val MIN_ENERGIES = 1
    const val MAX_ENERGIES = 3
    const val MAX_COPIES_PER_NAME = 2
    const val DECK_SIZE = 20

    fun normalize(name: String): String = normalizeName(name)\n\n    fun normalizeName(name: String): String =
        Normalizer.normalize(name.trim().lowercase(Locale.ROOT), Normalizer.Form.NFD)
            .replace("\\p{M}+".toRegex(), "")
            .replace("\\s+".toRegex(), " ")

    fun validate(cards: List<DeckCard>, energies: List<Int>, basicCardNames: Set<String> = emptySet()): List<String> {
        val errors = mutableListOf<String>()
        if (cards.sumOf { it.quantity } != DECK_SIZE) errors += "El mazo debe tener exactamente 20 cartas."
        if (cards.any { it.quantity <= 0 }) errors += "Todas las cartas deben tener una cantidad positiva."
        val copiesByName = cards.groupingBy { normalizeName(it.name) }.fold(0) { acc, card -> acc + card.quantity }
        if (copiesByName.values.any { it > MAX_COPIES_PER_NAME }) errors += "No puedes usar más de 2 copias del mismo nombre."
        if (energies.size !in MIN_ENERGIES..MAX_ENERGIES) errors += "El mazo debe usar entre 1 y 3 energías distintas."
        if (energies.distinct().size != energies.size || energies.any { it !in 1..8 }) errors += "Las energías deben ser distintas y estar entre 1 y 8."
        if (basicCardNames.isNotEmpty()) {
            val hasBasic = cards.any { !it.category.equals("Entrenadores", true) && basicCardNames.contains(normalizeName(it.name)) && it.quantity > 0 }
            if (!hasBasic) errors += "El mazo debe contener al menos 1 Pokémon Básico."
        }
        return errors.distinct()
    }

    fun isValid(cards: List<DeckCard>, energies: List<Int>, basicCardNames: Set<String> = emptySet()): Boolean =
        validate(cards, energies, basicCardNames).isEmpty()
}
