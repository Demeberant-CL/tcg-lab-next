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
    fun saveKey(key: String) { keyStore.put(key) }
    fun clearKey() { keyStore.clear() }
    fun currentModel(): String = prefs.getString("xai_model", DEFAULT_MODEL)?.ifBlank { DEFAULT_MODEL } ?: DEFAULT_MODEL
    fun saveModel(model: String) { prefs.edit().putString("xai_model", model.trim().ifBlank { DEFAULT_MODEL }).apply() }
    fun isDarkTheme(): Boolean = prefs.getBoolean("dark_theme", true)
    fun saveDarkTheme(dark: Boolean) { prefs.edit().putBoolean("dark_theme", dark).apply() }

    suspend fun generate(holdings: List<CollectionCard>, catalog: List<CatalogCard>, goal: String): Result<AiDeckProposal> = withContext(Dispatchers.IO) {
        val key = currentKey().orEmpty()
        if (key.isBlank()) return@withContext Result.failure(IllegalStateException("Configura primero la clave de xAI."))
        val owned = holdings.filter { it.quantity > 0 }.mapNotNull { h ->
            catalog.find { it.set.equals(h.setCode, true) && it.number.toString() == h.number }?.let {
                "${it.set}#${it.number} | ${it.name} | ${if (it.trainer) "Entrenador" else "Pokémon"} | tipo=${it.element} | copias=${h.quantity}"
            }
        }
        if (owned.size < 10) return@withContext Result.failure(IllegalStateException("Se necesitan al menos 10 cartas distintas con copias registradas."))

        val userGoal = goal.ifBlank { "mazo equilibrado y competitivo con lo disponible" }
        val prompt = """
            Eres el constructor estratégico de TCG LAB para Pokémon TCG Pocket.
            Crea UN mazo usando EXCLUSIVAMENTE las cartas disponibles.
            Reglas: exactamente 20 cartas; máximo 2 copias por nombre; cantidades 1 o 2; entre 1 y 3 energías distintas.
            Energía 1=Planta, 2=Fuego, 3=Agua, 4=Rayo, 5=Psíquica, 6=Lucha, 7=Oscura, 8=Metal.
            No inventes cartas, sets ni números.
            Devuelve SOLO JSON: {"name":"...","energies":[1,3],"cards":[{"set":"A1","number":1,"quantity":2}],"explanation":"..."}
            cards debe sumar exactamente 20.
            Objetivo: $userGoal
            Cartas disponibles:
            ${owned.joinToString("\n")}
        """.trimIndent()

        val cardSchema = JSONObject()
            .put("type", "object")
            .put("properties", JSONObject()
                .put("name", JSONObject().put("type", "string"))
                .put("energies", JSONObject()
                    .put("type", "array")
                    .put("items", JSONObject().put("type", "integer").put("minimum", 1).put("maximum", 8)))
                .put("cards", JSONObject()
                    .put("type", "array")
                    .put("items", JSONObject()
                        .put("type", "object")
                        .put("properties", JSONObject()
                            .put("set", JSONObject().put("type", "string"))
                            .put("number", JSONObject().put("type", "integer"))
                            .put("quantity", JSONObject().put("type", "integer").put("minimum", 1).put("maximum", 2)))
                        .put("required", JSONArray().put("set").put("number").put("quantity"))
                        .put("additionalProperties", false)))
                .put("explanation", JSONObject().put("type", "string")))
            .put("required", JSONArray().put("name").put("energies").put("cards").put("explanation"))
            .put("additionalProperties", false)
        val textFormat = JSONObject()
            .put("format", JSONObject()
                .put("type", "json_schema")
                .put("name", "tcg_lab_deck")
                .put("schema", cardSchema)
                .put("strict", true))
        val body = JSONObject()
            .put("model", currentModel())
            .put("input", prompt)
            .put("temperature", 0.7)
            .put("top_p", 0.95)
            .put("reasoning_effort", "medium")
            .put("max_output_tokens", 4000)
            .put("text", textFormat)
        val request = Request.Builder().url("https://api.x.ai/v1/responses")
            .addHeader("Authorization", "Bearer $key").addHeader("Content-Type", "application/json")
            .post(body.toString().toRequestBody("application/json".toMediaType())).build()

        try {
            http.newCall(request).execute().use { response ->
                val raw = response.body?.string().orEmpty()
                if (!response.isSuccessful) return@withContext Result.failure(IllegalStateException("xAI respondió ${response.code}. Revisa la clave y los créditos."))
                val root = JSONObject(raw)
                val output = root.optString("output_text").ifBlank {
                    val out = root.optJSONArray("output") ?: JSONArray()
                    buildString {
                        for (i in 0 until out.length()) {
                            val content = out.optJSONObject(i)?.optJSONArray("content") ?: continue
                            for (j in 0 until content.length()) append(content.optJSONObject(j)?.optString("text").orEmpty())
                        }
                    }
                }.trim()
                val jsonText = output
                val json = JSONObject(jsonText)
                val energiesJson = json.optJSONArray("energies") ?: JSONArray()
                val energies = buildList { for (i in 0 until energiesJson.length()) add(energiesJson.getInt(i)) }.distinct()
                if (energies.size !in 1..3 || energies.any { it !in 1..8 }) return@withContext Result.failure(IllegalStateException("La IA devolvió energías inválidas."))
                val cardsJson = json.optJSONArray("cards")
                    ?: return@withContext Result.failure(IllegalStateException("La IA no devolvió cartas."))
                val merged = linkedMapOf<String, Triple<String, Int, Int>>()
                for (i in 0 until cardsJson.length()) {
                    val item = cardsJson.getJSONObject(i)
                    val set = item.getString("set").trim()
                    val number = item.getInt("number")
                    val quantity = item.getInt("quantity")
                    if (quantity !in 1..2) {
                        return@withContext Result.failure(IllegalStateException("Cantidad inválida para \$set#\$number."))
                    }
                    val key = "\$set#\$number"
                    val previous = merged[key]
                    merged[key] = if (previous == null) {
                        Triple(set, number, quantity)
                    } else {
                        Triple(previous.first, previous.second, previous.third + quantity)
                    }
                }

                val ownedByKey = holdings
                    .filter { it.quantity > 0 }
                    .associateBy { "\${it.setCode.uppercase()}#\${it.number.toIntOrNull() ?: it.number}" }

                val cards = mutableListOf<DeckCard>()
                for ((key, entry) in merged) {
                    val set = entry.first
                    val number = entry.second
                    val quantity = entry.third
                    val cc = catalog.find { it.set.equals(set, true) && it.number == number }
                        ?: return@withContext Result.failure(IllegalStateException("Carta inexistente: $key"))
                    val ownedQty = ownedByKey["\${cc.set.uppercase()}#$number"]?.quantity ?: 0
                    if (quantity > ownedQty) {
                        return@withContext Result.failure(IllegalStateException("La propuesta usa más copias de \${cc.name} de las disponibles."))
                    }
                    cards += DeckCard(
                        set,
                        number.toString(),
                        cc.name,
                        if (cc.trainer) "Entrenadores" else "Pokémon",
                        quantity,
                        Catalog.imageUrl(cc),
                        cc.entityId
                    )
                }
                val deck = Deck(0L, json.optString("name").ifBlank { "Mazo IA" }, cards, energies)
                if (!deck.isValid) return@withContext Result.failure(IllegalStateException("La IA devolvió un mazo que no cumple las 20 cartas."))
                Result.success(AiDeckProposal(deck, json.optString("explanation").ifBlank { "Propuesta generada desde la colección." }))
            }
        } catch (e: Exception) { Result.failure(e) }
    }
}
