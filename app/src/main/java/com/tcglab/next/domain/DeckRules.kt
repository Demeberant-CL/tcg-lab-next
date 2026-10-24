package com.tcglab.next.domain

import com.tcglab.next.data.Deck
import com.tcglab.next.data.DeckCard
import java.text.Normalizer
import java.util.Locale

object DeckRules {
    fun isValid(deck: Deck): Boolean = validate(deck).isEmpty()

    fun validate(deck: Deck): List<String> {
        val errors = mutableListOf<String>()
        val total = deck.cards.sumOf { it.quantity }
        if (total != 20) errors += "Debe tener exactamente 20 cartas (tiene $total)."
        if (deck.energies.size !in 1..3) errors += "Debe tener entre 1 y 3 energías."
        if (deck.energies.distinct().size != deck.energies.size) errors += "Las energías no pueden repetirse."
        if (deck.energies.any { it !in 1..8 }) errors += "Energía no válida."
        if (deck.cards.any { it.quantity <= 0 }) errors += "Cantidad de carta inválida."

        val byName = deck.cards.groupBy { normalize(it.name) }
        byName.forEach { (name, group) ->
            val copies = group.sumOf { it.quantity }
            if (copies > 2) errors += "Más de 2 copias de \"$name\" ($copies)."
        }
        return errors
    }

    fun normalize(name: String): String =
        Normalizer.normalize(name.trim().lowercase(Locale.ROOT), Normalizer.Form.NFD)
            .replace("\\p{M}+".toRegex(), "")
            .trim()
}
