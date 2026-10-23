package com.tcglab.next.data

data class CatalogCard(
    val set: String,
    val number: Int,
    val name: String,
    val rarity: String,
    val entityId: Int,
    val trainer: Boolean,
    val element: String,
)

data class CatalogSet(
    val code: String,
    val es: String,
    val en: String,
    val count: Int,
)