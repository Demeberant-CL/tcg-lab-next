package com.tcglab.next.data

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

data class CollectionCard(
    val key: String,
    val name: String,
    val setCode: String,
    val number: String,
    val quantity: Int,
    val imageUrl: String = "",
    val category: String = "Pokémon"
)

class TcgDatabase(context: Context) : SQLiteOpenHelper(context, "tcg_lab.db", null, 1) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE collection_cards (
                key TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                set_code TEXT NOT NULL,
                number TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                image_url TEXT NOT NULL,
                category TEXT NOT NULL
            )
        """.trimIndent())
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) = Unit

    fun getCards(): List<CollectionCard> =
        readableDatabase.query("collection_cards", null, null, null, null, null, "name ASC").use { cursor ->
            buildList {
                while (cursor.moveToNext()) add(
                    CollectionCard(
                        cursor.getString(cursor.getColumnIndexOrThrow("key")),
                        cursor.getString(cursor.getColumnIndexOrThrow("name")),
                        cursor.getString(cursor.getColumnIndexOrThrow("set_code")),
                        cursor.getString(cursor.getColumnIndexOrThrow("number")),
                        cursor.getInt(cursor.getColumnIndexOrThrow("quantity")),
                        cursor.getString(cursor.getColumnIndexOrThrow("image_url")),
                        cursor.getString(cursor.getColumnIndexOrThrow("category"))
                    )
                )
            }
        }

    fun saveCard(card: CollectionCard) {
        writableDatabase.execSQL(
            "INSERT OR REPLACE INTO collection_cards(key,name,set_code,number,quantity,image_url,category) VALUES(?,?,?,?,?,?,?)",
            arrayOf(card.key, card.name, card.setCode, card.number, card.quantity, card.imageUrl, card.category)
        )
    }

    fun deleteCard(key: String) {
        writableDatabase.delete("collection_cards", "key = ?", arrayOf(key))
    }
}
