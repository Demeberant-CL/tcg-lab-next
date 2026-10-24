package com.tcglab.next.data

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

data class AiDeckProposal(val deck: Deck, val explanation: String)

class AiDeckClient(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences("tcg_lab_ai", Context.MODE_PRIVATE)
    private val keyStore = SecureKeyStore(context)
    private companion object {
        const val DEFAULT_MODEL = "grok-4.7"
    }
    private val http = OkHttpClient.Builder().connectTimeout(30, TimeUnit.SECONDS).readTimeout(180, TimeUnit.SECONDS).build()
    fun hasKey(): Boolean = currentKey() != null
    fun currentKey(): String? = keyStore.get()?.takeIf { it.isNotBlank() }
    fun saveKey(key: String) { keyStore.put(key.trim()) }
    suspend fun testConnection(): Result<List<String>> = withContext(Dispatchers.IO) {
        val key = currentKey() ?: return@withContext Result.failure(IllegalStateException("Configura primero una clave de xAI."))
        try {
            val request = Request.Builder().url("https://api.x.ai/v1/models")
                .addHeader("Authorization", "Bearer $key").get().build()
            http.newCall(request).execute().use { response ->
                val raw = response.body?.string().orEmpty()
                if (!response.isSuccessful) return@withContext Result.failure(IllegalStateException(httpError(response.code)))
                val data = JSONObject(raw).optJSONArray("data") ?: JSONArray()
                Result.success(buildList { for (i in 0 until data.length()) data.optJSONObject(i)?.optString("id")?.takeIf { it.isNotBlank() }?.let(::add) })
            }
        } catch (_: java.net.SocketTimeoutException) {
            Result.failure(IllegalStateException("Tiempo de espera agotado. Puedes reintentar."))
        } catch (e: java.io.IOException) {
            Result.failure(IllegalStateException("No se pudo conectar con xAI. Comprueba tu conexión."))
        } catch (e: Exception) {
            Result.failure(IllegalStateException(e.message ?: "Respuesta de IA no válida."))
        }
    }

    private fun httpError(code: Int): String = when (code) {
        401 -> "Clave xAI inválida o no autorizada."
        402 -> "La cuenta de xAI no tiene créditos disponibles."
        403 -> "xAI rechazó el acceso para esta clave."
        404 -> "Modelo o endpoint de xAI no encontrado."
        429 -> "xAI está limitando las solicitudes. Espera unos segundos y reintenta."
        in 500..599 -> "xAI presenta un problema temporal. Reintenta más tarde."
        else -> "xAI respondió con HTTP $code."
    }
}
