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

data class DeckSummary(
    val id: Long,
    val name: String,
    val cardCount: Int,
    val energyCount: Int,
    val valid: Boolean
)

data class DeckCard(
    val setCode: String,
    val number: String,
    val name: String,
    val category: String,
    val quantity: Int,
    val imageUrl: String = "",
    val entityId: Int = 0
)

data class Deck(
    val id: Long,
    val name: String,
    val cards: List<DeckCard>,
    val energies: List<Int>
) {
    val totalCards: Int get() = cards.sumOf { it.quantity }
    val isValid: Boolean get() = com.tcglab.next.domain.DeckRules.isValid(this)
}

class TcgDatabase(context: Context) : SQLiteOpenHelper(context, "tcg_lab.db", null, 3) {
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
        createDeckTables(db)
    }

    override fun onConfigure(db: SQLiteDatabase) {
        super.onConfigure(db)
        db.setForeignKeyConstraintsEnabled(true)
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        if (oldVersion < 2) createDeckTables(db)
        // v3: entityId rule removed; no schema change required for that
    }

    private fun createDeckTables(db: SQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE IF NOT EXISTS decks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            )
        """.trimIndent())
        db.execSQL("""
            CREATE TABLE IF NOT EXISTS deck_cards (
                deck_id INTEGER NOT NULL,
                set_code TEXT NOT NULL,
                number TEXT NOT NULL,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                image_url TEXT NOT NULL,
                entity_id INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY(deck_id, set_code, number),
                FOREIGN KEY(deck_id) REFERENCES decks(id) ON DELETE CASCADE
            )
        """.trimIndent())
        db.execSQL("""
            CREATE TABLE IF NOT EXISTS deck_energies (
                deck_id INTEGER NOT NULL,
                energy_id INTEGER NOT NULL,
                PRIMARY KEY(deck_id, energy_id),
                FOREIGN KEY(deck_id) REFERENCES decks(id) ON DELETE CASCADE
            )
        """.trimIndent())
    }

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
        if (card.quantity <= 0) {
            deleteCard(card.key)
            return
        }
        writableDatabase.execSQL(
            "INSERT OR REPLACE INTO collection_cards(key,name,set_code,number,quantity,image_url,category) VALUES(?,?,?,?,?,?,?)",
            arrayOf(card.key, card.name, card.setCode, card.number, card.quantity, card.imageUrl, card.category)
        )
    }

    fun deleteCard(key: String) {
        writableDatabase.delete("collection_cards", "key = ?", arrayOf(key))
    }

    fun incrementCard(card: CollectionCard) {
        writableDatabase.execSQL(
            """INSERT INTO collection_cards(key,name,set_code,number,quantity,image_url,category)
               VALUES(?,?,?,?,1,?,?)
               ON CONFLICT(key) DO UPDATE SET quantity = MIN(quantity + 1, 99)""",
            arrayOf(card.key, card.name, card.setCode, card.number, card.imageUrl, card.category)
        )
    }

    fun decrementCard(key: String) {
        val db = writableDatabase
        db.execSQL("UPDATE collection_cards SET quantity = quantity - 1 WHERE key = ?", arrayOf(key))
        db.execSQL("DELETE FROM collection_cards WHERE key = ? AND quantity <= 0", arrayOf(key))
    }


    fun getDecks(): List<DeckSummary> {
        val result = mutableListOf<DeckSummary>()
        readableDatabase.rawQuery(
            "SELECT id,name FROM decks ORDER BY updated_at DESC", null
        ).use { cursor ->
            while (cursor.moveToNext()) {
                val id = cursor.getLong(0)
                val name = cursor.getString(1)
                val deck = getDeck(id) ?: continue
                result += DeckSummary(id, name, deck.totalCards, deck.energies.size, deck.isValid)
            }
        }
        return result
    }

    fun getDeck(id: Long): Deck? {
        val db = readableDatabase
        val name = db.rawQuery("SELECT name FROM decks WHERE id = ?", arrayOf(id.toString())).use { c ->
            if (!c.moveToFirst()) return null
            c.getString(0)
        }
        val cards = db.query("deck_cards", null, "deck_id = ?", arrayOf(id.toString()), null, null, "name ASC").use { c ->
            buildList {
                while (c.moveToNext()) add(
                    DeckCard(
                        c.getString(c.getColumnIndexOrThrow("set_code")),
                        c.getString(c.getColumnIndexOrThrow("number")),
                        c.getString(c.getColumnIndexOrThrow("name")),
                        c.getString(c.getColumnIndexOrThrow("category")),
                        c.getInt(c.getColumnIndexOrThrow("quantity")),
                        c.getString(c.getColumnIndexOrThrow("image_url")),
                        c.getInt(c.getColumnIndexOrThrow("entity_id"))
                    )
                )
            }
        }
        val energies = db.query("deck_energies", arrayOf("energy_id"), "deck_id = ?", arrayOf(id.toString()), null, null, "energy_id ASC").use { c ->
            buildList {
                while (c.moveToNext()) add(c.getInt(0))
            }
        }
        return Deck(id, name, cards, energies)
    }

    fun saveDeck(deck: Deck): Long {
        require(deck.name.isNotBlank()) { "El mazo necesita un nombre." }
        require(deck.isValid) { "El mazo debe tener 20 cartas, 1 a 3 energías válidas y máximo 2 copias por carta." }
        val db = writableDatabase
        db.beginTransaction()
        try {
            val id = if (deck.id == 0L) {
                db.compileStatement("INSERT INTO decks(name,updated_at) VALUES(?,?)").apply {
                    bindString(1, deck.name.trim())
                    bindLong(2, System.currentTimeMillis())
                }.executeInsert()
            } else {
                db.execSQL("UPDATE decks SET name = ?, updated_at = ? WHERE id = ?", arrayOf(deck.name.trim(), System.currentTimeMillis(), deck.id))
                db.delete("deck_cards", "deck_id = ?", arrayOf(deck.id.toString()))
                db.delete("deck_energies", "deck_id = ?", arrayOf(deck.id.toString()))
                deck.id
            }
            require(id > 0)
            deck.cards.forEach { card ->
                db.execSQL(
                    "INSERT INTO deck_cards(deck_id,set_code,number,name,category,quantity,image_url,entity_id) VALUES(?,?,?,?,?,?,?,?)",
                    arrayOf(id, card.setCode, card.number, card.name, card.category, card.quantity, card.imageUrl, card.entityId)
                )
            }
            deck.energies.forEach { energy ->
                db.execSQL("INSERT INTO deck_energies(deck_id,energy_id) VALUES(?,?)", arrayOf(id, energy))
            }
            db.setTransactionSuccessful()
            return id
        } finally {
            db.endTransaction()
        }
    }

    fun deleteDeck(id: Long) {
        writableDatabase.beginTransaction()
        try {
            writableDatabase.delete("deck_cards", "deck_id = ?", arrayOf(id.toString()))
            writableDatabase.delete("deck_energies", "deck_id = ?", arrayOf(id.toString()))
            writableDatabase.delete("decks", "id = ?", arrayOf(id.toString()))
            writableDatabase.setTransactionSuccessful()
        } finally {
            writableDatabase.endTransaction()
        }
    }
}
