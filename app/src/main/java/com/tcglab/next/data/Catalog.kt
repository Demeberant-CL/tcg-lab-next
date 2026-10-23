package com.tcglab.next.data

import android.content.Context
import org.json.JSONArray
import java.text.Normalizer
import java.util.Locale

object Catalog {
    private var loaded = false
    private var sets: List<CatalogSet> = emptyList()
    private var cards: List<CatalogCard> = emptyList()

    fun load(context: Context) {
        if (loaded) return
        val setsJson = context.assets.open("sets.json").bufferedReader().use { it.readText() }
        val cardsJson = context.assets.open("cards.json").bufferedReader().use { it.readText() }
        sets = JSONArray(setsJson).let { a ->
            List(a.length()) { i -> a.getJSONObject(i).let { CatalogSet(it.getString("code"), it.getString("es"), it.getString("en"), it.getInt("count")) } }
        }
        cards = JSONArray(cardsJson).let { a ->
            List(a.length()) { i -> a.getJSONObject(i).let { CatalogCard(it.getString("set"), it.getInt("number"), it.getString("name"), it.getString("rarity"), it.getInt("entityId"), it.getBoolean("trainer"), it.getString("element")) } }
        }
        loaded = true
    }

    fun allCards(): List<CatalogCard> = cards
    fun allSets(): List<CatalogSet> = sets
    fun imageUrl(card: CatalogCard): String = CardImages.primaryUrl(card.set, card.number)

    fun search(query: String, set: String? = null, limit: Int = 80): List<CatalogCard> {
        val q = fold(query.trim())
        if (q.isEmpty()) return emptyList()
        return cards.asSequence()
            .filter { set == null || it.set.equals(set, ignoreCase = true) }
            .mapNotNull { card ->
                val name = fold(card.name)
                val id = fold("${card.set} ${card.number}")
                val score = when {
                    name == q -> 100
                    name.startsWith(q) -> 80
                    name.contains(q) -> 50
                    id.contains(q) -> 40
                    else -> 0
                }
                if (score > 0) card to score else null
            }
            .sortedByDescending { it.second }
            .take(limit)
            .map { it.first }
            .toList()
    }

    private fun fold(value: String): String =
        Normalizer.normalize(value.lowercase(Locale.ROOT), Normalizer.Form.NFD)
            .replace("\\p{M}+".toRegex(), "")
            .trim()
}