package com.tcglab.next.data

object CardImages {
    fun primaryUrl(set: String, number: Int): String {
        val code = if (set == "PROMO-A") "P-A" else if (set == "PROMO-B") "P-B" else set
        val num = number.toString().padStart(3, '0')
        return "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/$code/${code}_${num}_EN.webp"
    }

    fun fallbackUrls(set: String, number: Int): List<String> {
        val code = if (set == "PROMO-A") "P-A" else if (set == "PROMO-B") "P-B" else set
        val num = number.toString().padStart(3, '0')
        return listOf(
            primaryUrl(set, number),
            "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/$code/${code}_${num}_EN_SM.webp",
            "https://cdn.jsdelivr.net/gh/flibustier/pokemon-tcg-pocket-database@main/dist/cards-by-set/$set/$number.webp",
            "https://cdn.jsdelivr.net/npm/pokemon-tcg-pocket-database/dist/cards-by-set/$set/$number.webp",
        ).distinct()
    }
}