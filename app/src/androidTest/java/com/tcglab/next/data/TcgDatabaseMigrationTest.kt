package com.tcglab.next.data

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.After
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class TcgDatabaseMigrationTest {
    private lateinit var context: Context

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        context.deleteDatabase("tcg_lab.db")
    }

    @After
    fun tearDown() {
        context.deleteDatabase("tcg_lab.db")
    }

    @Test
    fun cleanInstallCreatesWishlistTable() {
        val db = TcgDatabase(context)
        db.getWishlist()
        db.close()
        SQLiteDatabase.openDatabase(
            context.getDatabasePath("tcg_lab.db").path,
            null,
            SQLiteDatabase.OPEN_READONLY
        ).use { opened ->
            opened.rawQuery(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='wishlist'",
                null
            ).use { cursor -> assertTrue(cursor.moveToFirst()) }
        }
    }

    @Test
    fun version2DatabaseMigratesToWishlist() {
        val path = context.getDatabasePath("tcg_lab.db")
        path.parentFile?.mkdirs()
        SQLiteDatabase.openOrCreateDatabase(path, null).use { db ->
            db.execSQL("CREATE TABLE collection_cards (key TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, set_code TEXT NOT NULL, number TEXT NOT NULL, quantity INTEGER NOT NULL, image_url TEXT NOT NULL, category TEXT NOT NULL)")
            db.execSQL("CREATE TABLE decks (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, updated_at INTEGER NOT NULL)")
            db.execSQL("CREATE TABLE deck_cards (deck_id INTEGER NOT NULL, set_code TEXT NOT NULL, number TEXT NOT NULL, name TEXT NOT NULL, category TEXT NOT NULL, quantity INTEGER NOT NULL, image_url TEXT NOT NULL, entity_id INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(deck_id,set_code,number))")
            db.execSQL("CREATE TABLE deck_energies (deck_id INTEGER NOT NULL, energy_id INTEGER NOT NULL, PRIMARY KEY(deck_id,energy_id))")
            db.execSQL("PRAGMA user_version = 2")
        }
        val upgraded = TcgDatabase(context)
        upgraded.getWishlist()
        upgraded.toggleWishlist("A1#1")
        assertTrue(upgraded.getWishlist().contains("A1#1"))
        upgraded.close()
    }
}
