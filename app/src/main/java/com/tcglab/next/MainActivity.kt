package com.tcglab.next

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.layout.ContentScale
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import com.tcglab.next.data.Catalog
import com.tcglab.next.data.CatalogCard
import com.tcglab.next.data.CollectionCard
import com.tcglab.next.data.DeckSummary
import com.tcglab.next.data.AiDeckClient
import com.tcglab.next.data.TcgDatabase

private val Background = Color(0xFF080C13)
private val Surface = Color(0xFF111823)
private val Surface2 = Color(0xFF17263A)
private val Accent = Color(0xFF58A6FF)
private val Muted = Color(0xFF8E9AAA)

class MainActivity : ComponentActivity() {
    private lateinit var database: TcgDatabase
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Catalog.load(this)
        database = TcgDatabase(this)
        setContent { TcgLabNextApp(database, AiDeckClient(this)) }
    }
    override fun onDestroy() { database.close(); super.onDestroy() }
}

@Composable
private fun TcgLabNextApp(database: TcgDatabase, aiClient: AiDeckClient) {
    var selected by remember { mutableIntStateOf(0) }
    var selectedDeckId by remember { mutableStateOf<Long?>(null) }
    val cards = remember { mutableStateOf(database.getCards()) }
    val decks = remember { mutableStateOf(database.getDecks()) }
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Accent,
            onPrimary = Color.White,
            background = Background,
            onBackground = Color.White,
            surface = Surface,
            onSurface = Color.White,
            surfaceVariant = Surface2,
            onSurfaceVariant = Muted
        )
    ) {
        Scaffold(containerColor = Background, bottomBar = {
            NavigationBar(containerColor = Surface) {
                listOf("Inicio" to Icons.Outlined.Home, "Colección" to Icons.Outlined.CollectionsBookmark, "Mazos" to Icons.Outlined.GridView, "Estrategia" to Icons.Outlined.AutoAwesome).forEachIndexed { i, item ->
                    NavigationBarItem(selected == i, { selected = i }, icon = { Icon(item.second, item.first) }, label = { Text(item.first) })
                }
            }
        }) { padding ->
            when (selected) {
                0 -> HomeScreen(Modifier.padding(padding), cards.value.sumOf { it.quantity }, decks.value.size) { selected = 3 }
                1 -> CollectionScreen(Modifier.padding(padding), Catalog.allCards(), cards.value, database) { cards.value = database.getCards() }
                2 -> if (selectedDeckId != null) {
                    database.getDeck(selectedDeckId!!)?.let { deck ->
                        DeckDetailScreen(deck, database, onBack = { selectedDeckId = null }, onDeleted = { decks.value = database.getDecks(); selectedDeckId = null })
                    } ?: run { selectedDeckId = null }
                } else {
                    DecksScreen(Modifier.padding(padding), decks.value, onOpen = { selectedDeckId = it }, onStrategy = { selected = 3 })
                }
                else -> StrategyScreen(Modifier.padding(padding), cards.value, database, aiClient) { decks.value = database.getDecks() }
            }
        }
    }
}

@Composable private fun HomeScreen(modifier: Modifier, cardCount: Int, deckCount: Int, onStrategy: () -> Unit) {
    Column(modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) { Text("TCG LAB", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black); Text("Laboratorio de estrategia", color = Muted) }
            IconButton({}) { Icon(Icons.Outlined.Settings, "Ajustes", tint = Muted) }
        }
        Card(Modifier.fillMaxWidth(), RoundedCornerShape(26.dp), colors = CardDefaults.cardColors(Surface2)) {
            Box(Modifier.background(Brush.linearGradient(listOf(Color(0xFF193451), Surface2))).padding(24.dp)) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Outlined.AutoAwesome, null, tint = Accent); Spacer(Modifier.width(10.dp)); Text("ESTRATEGIA IA", color = Accent, fontWeight = FontWeight.Bold) }
                    Spacer(Modifier.height(12.dp)); Text("Construye tu próximo mazo", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(7.dp)); Text("Analiza tu colección y recibe una propuesta de 20 cartas con explicación estratégica.", color = Muted)
                    Spacer(Modifier.height(20.dp)); Button(onStrategy, shape = RoundedCornerShape(14.dp)) { Text("Analizar colección", fontWeight = FontWeight.Bold) }
                }
            }
        }
        Row(Modifier.fillMaxWidth(), Arrangement.spacedBy(12.dp)) {
            StatCard("CARTAS", cardCount.toString(), Icons.Outlined.CollectionsBookmark, Modifier.weight(1f))
            StatCard("MAZOS", deckCount.toString(), Icons.Outlined.GridView, Modifier.weight(1f))
        }
        Text("Actividad reciente", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        EmptyCard("Aún no hay actividad", "Crea tu primer mazo con IA.")
    }
}

@Composable private fun CollectionScreen(modifier: Modifier, catalog: List<CatalogCard>, holdings: List<CollectionCard>, database: TcgDatabase, onChanged: () -> Unit) {
    var query by remember { mutableStateOf("") }
    var filter by remember { mutableStateOf("Todas") }
    val holdingByKey = remember(holdings) { holdings.associateBy { it.key } }
    val visible = remember(query, filter, catalog) {
        val q = query.trim()
        catalog.asSequence()
            .filter { filter == "Todas" || (filter == "Entrenadores" && it.trainer) || (filter == "Pokémon" && !it.trainer) }
            .filter { q.isBlank() || it.name.contains(q, ignoreCase = true) || "${it.set} ${it.number}".contains(q, ignoreCase = true) }
            .take(160)
            .toList()
    }
    Column(modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Colección", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text("${holdings.sumOf { it.quantity }} cartas registradas · ${catalog.size} en catálogo", color = Muted)
        OutlinedTextField(value = query, onValueChange = { query = it }, modifier = Modifier.fillMaxWidth(), placeholder = { Text("Buscar carta o ID...") }, leadingIcon = { Icon(Icons.Outlined.Search, null) }, singleLine = true)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("Todas", "Pokémon", "Entrenadores").forEach { option ->
                FilterChip(filter == option, { filter = option }, { Text(option) })
            }
        }
        LazyVerticalGrid(modifier = Modifier.weight(1f), columns = GridCells.Fixed(2), verticalArrangement = Arrangement.spacedBy(10.dp), horizontalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(bottom = 20.dp)) {
            items(visible, key = { "${it.set}#${it.number}" }) { card ->
                val key = "${card.set}#${card.number}"
                val quantity = holdingByKey[key]?.quantity ?: 0
                Card(Modifier.fillMaxWidth(), RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(Surface)) {
                    Column {
                        AsyncImage(model = Catalog.imageUrl(card), contentDescription = card.name, modifier = Modifier.fillMaxWidth().height(190.dp), contentScale = ContentScale.Fit)
                        Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(card.name, maxLines = 2, fontWeight = FontWeight.SemiBold)
                            Text("${card.set} · ${card.number} · ${card.rarity}", color = Muted, style = MaterialTheme.typography.labelSmall)
                            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                                IconButton(onClick = { if (quantity > 0) { database.saveCard(CollectionCard(key, card.name, card.set, card.number.toString(), quantity - 1, Catalog.imageUrl(card), if (card.trainer) "Entrenadores" else "Pokémon")); onChanged() } }) { Icon(Icons.Outlined.Remove, "Restar", tint = Muted) }
                                Text("×$quantity", fontWeight = FontWeight.Bold, color = if (quantity > 0) Accent else Muted)
                                IconButton(onClick = { database.saveCard(CollectionCard(key, card.name, card.set, card.number.toString(), quantity + 1, Catalog.imageUrl(card), if (card.trainer) "Entrenadores" else "Pokémon")); onChanged() }) { Icon(Icons.Outlined.Add, "Agregar", tint = Accent) }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable private fun DecksScreen(modifier: Modifier, decks: List<DeckSummary>, onOpen: (Long) -> Unit, onStrategy: () -> Unit) {
    Column(modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) { Text("Mazos", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold); Text("${decks.size} mazos guardados", color = Muted) }
            FilledTonalButton(onClick = onStrategy) { Icon(Icons.Outlined.AutoAwesome, null); Spacer(Modifier.width(6.dp)); Text("Crear con IA") }
        }
        if (decks.isEmpty()) {
            EmptyCard("Sin mazos", "Los mazos creados con IA aparecerán aquí.")
        } else {
            androidx.compose.foundation.lazy.LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(decks, key = { it.id }) { deck ->
                    Card(onClick = { onOpen(deck.id) }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(Surface)) {
                        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Outlined.GridView, null, tint = Accent)
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(deck.name, fontWeight = FontWeight.Bold)
                                Text("${deck.cardCount}/20 cartas · ${deck.energyCount} energías", color = Muted)
                            }
                            Text(if (deck.valid) "VÁLIDO" else "REVISAR", color = if (deck.valid) Accent else Muted, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StrategyScreen(
    modifier: Modifier,
    holdings: List<CollectionCard>,
    database: TcgDatabase,
    aiClient: AiDeckClient,
    onDeckSaved: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var key by remember { mutableStateOf("") }
    var goal by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var explanation by remember { mutableStateOf<String?>(null) }

    Column(modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Estrategia IA", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Card(Modifier.fillMaxWidth(), RoundedCornerShape(22.dp), colors = CardDefaults.cardColors(Surface)) {
            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Constructor estratégico", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text("Grok analiza únicamente las cartas registradas y propone un mazo válido de 20 cartas.", color = Muted)
                if (!aiClient.hasKey()) {
                    OutlinedTextField(value = key, onValueChange = { key = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Clave API de xAI") }, placeholder = { Text("xai-...") }, singleLine = true)
                    Text("La clave se guarda solo en este dispositivo y no se incluye en el proyecto.", color = Muted, style = MaterialTheme.typography.labelSmall)
                }
                OutlinedTextField(value = goal, onValueChange = { goal = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Objetivo (opcional)") }, placeholder = { Text("Ej.: priorizar consistencia y bajo coste") }, minLines = 2)
                Button(
                    enabled = !busy && holdings.sumOf { it.quantity } > 0,
                    onClick = {
                        if (!aiClient.hasKey()) aiClient.saveKey(key)
                        busy = true
                        message = null
                        explanation = null
                        scope.launch {
                            aiClient.generate(holdings, com.tcglab.next.data.Catalog.allCards(), goal)
                                .onSuccess {
                                    database.saveDeck(it.deck)
                                    explanation = it.explanation
                                    message = "Mazo guardado automáticamente: ${it.deck.name}"
                                    onDeckSaved()
                                }
                                .onFailure { message = it.message ?: "No se pudo generar el mazo." }
                            busy = false
                        }
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Outlined.AutoAwesome, null)
                    Spacer(Modifier.width(8.dp))
                    Text(if (busy) "Analizando colección..." else "Generar y guardar mazo")
                }
                message?.let { Text(it, color = if (it.startsWith("Mazo")) Accent else Muted, fontWeight = FontWeight.SemiBold) }
                explanation?.let {
                    HorizontalDivider()
                    Text("Criterio de la IA", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(it, color = Muted)
                }
            }
        }
    }
}

@Composable private fun StatCard(title: String, value: String, icon: ImageVector, modifier: Modifier) {
    Card(modifier, RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(Surface)) {
        Row(Modifier.padding(17.dp), verticalAlignment = Alignment.CenterVertically) { Icon(icon, null, tint = Accent); Spacer(Modifier.width(10.dp)); Column { Text(title, color = Muted, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold); Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold) } }
    }
}

@Composable private fun EmptyCard(title: String, text: String) {
    Surface(Modifier.fillMaxWidth(), RoundedCornerShape(18.dp), color = Surface) {
        Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Outlined.Info, null, tint = Muted); Spacer(Modifier.width(12.dp)); Column { Text(title, fontWeight = FontWeight.SemiBold); Text(text, color = Muted) } }
    }
}
