package com.tcglab.next.data

import android.graphics.Bitmap
import android.graphics.Color
import com.google.zxing.BarcodeFormat
import com.google.zxing.MultiFormatWriter

object DeckQr {
    fun encode(deck: Deck, size: Int = 720): Bitmap {
        val payload = buildString {
            append("{\"name\":")
            append(deck.name.jsonValue())
            append(",\"energies\":[")
            append(deck.energies.joinToString(","))
            append("],\"cards\":[")
            append(deck.cards.joinToString(",") {
                "{\"set\":${it.setCode.jsonValue()},\"number\":${it.number.jsonValue()},\"quantity\":${it.quantity}}"
            })
            append("]}")
        }
        val matrix = MultiFormatWriter().encode(payload, BarcodeFormat.QR_CODE, size, size)
        val pixels = IntArray(size * size)
        for (y in 0 until size) {
            for (x in 0 until size) {
                pixels[y * size + x] = if (matrix[x, y]) Color.BLACK else Color.WHITE
            }
        }
        return Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888).apply {
            setPixels(pixels, 0, size, 0, 0, size, size)
        }
    }
    private fun String.jsonValue(): String = "\"" + replace("\\", "\\\\").replace("\"", "\\\"") + "\""
}
