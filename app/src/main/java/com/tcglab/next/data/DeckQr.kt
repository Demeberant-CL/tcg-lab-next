package com.tcglab.next.data

import android.graphics.Bitmap
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
        return Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888).also { bitmap ->
            for (y in 0 until size) for (x in 0 until size) {
                bitmap.setPixel(x, y, if (matrix[x, y]) android.graphics.Color.BLACK else android.graphics.Color.WHITE)
            }
        }
    }
    private fun String.jsonValue(): String = "\"" + replace("\\", "\\\\").replace("\"", "\\\"") + "\""
}