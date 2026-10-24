package com.tcglab.next

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.ui.platform.LocalContext
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.tcglab.next.data.AiDeckClient
import com.tcglab.next.data.Catalog
import com.tcglab.next.data.CatalogCard
import com.tcglab.next.data.CollectionCard
import com.tcglab.next.data.DeckSummary
import com.tcglab.next.data.Deck
import com.tcglab.next.data.TcgDatabase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private val Background = Color(0xFF070B12)
private val Surface = Color(0xFF101722)
private val SurfaceRaised = Color(0xFF162335)
private val SurfaceBlue = Color(0xFF142B45)
private val Accent = Color(0xFF62A9FF)
private val AccentSoft = Color(0xFF9CC9FF)
private val Muted = Color(0xFF9BA8B8)
private val Divider = Color(0xFF263446)

class MainActivity : ComponentActivity() {
    private lateinit var database: TcgDatabase
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        database = TcgDatabase(this)
        setContent { TcgLabNextApp(database, AiDeckClient(this)) }
    }
    override fun onDestroy() { database.close(); super.onDestroy() }
}

@Composable
private fun TcgLabNextApp(database: TcgDatabase, aiClient: AiDeckClient) {
    var selected by remember { mutableIntStateOf(0) }
    var selectedDeck by remember { mutableStateOf<Deck?>(null) }
    val context = LocalContext.current
    val cards = remember { mutableStateOf(emptyList<CollectionCard>()) }
    val decks = remember { mutableStateOf(emptyList<DeckSummary>()) }
    val catalog = remember { mutableStateOf(emptyList<CatalogCard>()) }
    var loading by remember { mutableStateOf(true) }
    LaunchedEffect(Unit) {
        withContext(Dispatchers.IO) {
            Catalog.load(context)
            val loadedCards = database.getCards()
            val loadedDecks = database.getDecks()
            withContext(Dispatchers.Main) {
                cards.value = loadedCards
                decks.value = loadedDecks
                catalog.value = Catalog.allCards()
                loading = false
            }
        }
    }

    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Accent,
            onPrimary = Color.White,
            secondary = AccentSoft,
            background = Background,
            onBackground = Color.White,
            surface = Surface,
            onSurface = Color.White,
            surfaceVariant = SurfaceRaised,
            onSurfaceVariant = Muted,
            outline = Divider
        ),
        shapes = Shapes(
            small = RoundedCornerShape(12.dp),
            medium = RoundedCornerShape(18.dp),
            large = RoundedCornerShape(26.dp)
        )
    ) {
        Scaffold(
            containerColor = Background,
            bottomBar = {
                NavigationBar(containerColor = Color(0xFF0D131D), tonalElevation = 0.dp) {
                    listOf(
                        "Inicio" to Icons.Outlined.Home,
                        "Colección" to Icons.Outlined.CollectionsBookmark,
                        "Mazos" to Icons.Outlined.GridView,
                        "Estrategia" to Icons.Outlined.AutoAwesome
                    ).forEachIndexed { i, item ->
                        NavigationBarItem(
                            selected = selected == i,
                            onClick = { selected = i; selectedDeck = null },
                            icon = { Icon(item.second, item.first) },
                            label = { Text(item.first) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = Color.White,
                                selectedTextColor = Color.White,
                                indicatorColor = Accent.copy(alpha = 0.20f),
                                unselectedIconColor = Muted,
                                unselectedTextColor = Muted
                            )
                        )
                    }
                }
            }
        ) { padding ->
            when (selected) {
                0 -> HomeScreen(
                    Modifier.padding(padding),
                    cards.value.sumOf { it.quantity },
                    decks.value.size,
                    onCollection = { selected = 1 },
                    onStrategy = { selected = 3 },
                    onDecks = { selected = 2 }
                )
                1 -> CollectionScreen(
                    Modifier.padding(padding),
                    catalog.value,
                    cards.value,
                    database
                ) { updated -> cards.value = updated }
                2 -> if (selectedDeck != null) {
                    DeckDetailScreen(
                        selectedDeck!!,
                        database,
                        onBack = { selectedDeck = null },
                        onDeleted = {
                            selectedDeck = null
                            decks.value = emptyList()
                        }
                    )
                } else {
                    DecksScreen(
                        Modifier.padding(padding),
                        decks.value,
                        onOpen = { id ->
                            // Detail loading is triggered by the deck screen callback.
                            selectedDeck = null
                        },
                        onStrategy = { selected = 3 }
                    )
                }
                else -> StrategyScreen(
                    Modifier.padding(padding),
                    cards.value,
                    database,
                    aiClient
                ) { updated -> decks.value = updated }
            }
                        )
                    } ?: run { selectedDeck = null }
                } else {
                    DecksScreen(
                        Modifier.padding(padding),
                        decks.value,
                        onOpen = { selectedDeckId = it },
                        onStrategy = { selected = 3 }
                    )
                }
                else -> StrategyScreen(
                    Modifier.padding(padding),
                    cards.value,
                    database,
                    aiClient
                ) { decks.value = database.getDecks() }
            }
        }
    }
}

@Composable
private fun HomeScreen(
    modifier: Modifier,
    cardCount: Int,
    deckCount: Int,
    onCollection: () -> Unit,
    onStrategy: () -> Unit,
    onDecks: () -> Unit
) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 22.dp, bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("TCG LAB", color = Color.White, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
                    Text("Laboratorio de estrategia", color = Muted, style = MaterialTheme.typography.bodyLarge)
                }
                Surface(shape = RoundedCornerShape(16.dp), color = SurfaceRaised) {
                    IconButton(onClick = {}) {
                        Icon(Icons.Outlined.Settings, "Ajustes", tint = AccentSoft)
                    }
                }
            }
        }
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(28.dp),
                colors = CardDefaults.cardColors(containerColor = SurfaceBlue)
            ) {
                Box(
                    Modifier
                        .fillMaxWidth()
                        .background(
                            Brush.linearGradient(
                                listOf(Color(0xFF173A60), Color(0xFF12263D), Color(0xFF101722))
                            )
                        )
                        .padding(24.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = Accent.copy(alpha = 0.15f)
                            ) {
                                Icon(
                                    Icons.Outlined.AutoAwesome,
                                    null,
                                    tint = Accent,
                                    modifier = Modifier.padding(10.dp).size(24.dp)
                                )
                            }
                            Spacer(Modifier.width(12.dp))
                            Column {
                                Text("ESTRATEGIA IA", color = AccentSoft, fontWeight = FontWeight.Bold)
                                Text("Laboratorio de decisiones", color = Muted, style = MaterialTheme.typography.labelMedium)
                            }
                        }
                        Text(
                            "Construye tu próximo mazo",
                            color = Color.White,
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            "Analiza las cartas disponibles y recibe una propuesta de 20 cartas con criterio estratégico.",
                            color = Color(0xFFD0D8E3),
                            style = MaterialTheme.typography.bodyLarge
                        )
                        Button(
                            onClick = onStrategy,
                            shape = RoundedCornerShape(14.dp),
                            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 13.dp)
                        ) {
                            Icon(Icons.Outlined.AutoAwesome, null)
                            Spacer(Modifier.width(8.dp))
                            Text("Analizar colección", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                DashboardStat(
                    "CARTAS",
                    cardCount.toString(),
                    "registradas",
                    Icons.Outlined.CollectionsBookmark,
                    Modifier.weight(1f),
                    onCollection
                )
                DashboardStat(
                    "MAZOS",
                    deckCount.toString(),
                    "guardados",
                    Icons.Outlined.GridView,
                    Modifier.weight(1f),
                    onDecks
                )
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text("Actividad reciente", color = Color.White, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                Text("Laboratorio", color = Muted, style = MaterialTheme.typography.labelMedium)
            }
        }
        item {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                color = Surface
            ) {
                Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                    Surface(shape = RoundedCornerShape(14.dp), color = SurfaceRaised) {
                        Icon(Icons.Outlined.Insights, null, tint = Accent, modifier = Modifier.padding(11.dp).size(24.dp))
                    }
                    Spacer(Modifier.width(14.dp))
                    Column {
                        Text("Sin actividad todavía", color = Color.White, fontWeight = FontWeight.SemiBold)
                        Spacer(Modifier.height(3.dp))
                        Text("Registra cartas o crea un mazo con IA para comenzar.", color = Muted)
                    }
                }
            }
        }
    }
}

@Composable
private fun DashboardStat(
    title: String,
    value: String,
    subtitle: String,
    icon: ImageVector,
    modifier: Modifier,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Surface)
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            Icon(icon, null, tint = Accent, modifier = Modifier.size(25.dp))
            Text(title, color = Muted, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
            Text(value, color = Color.White, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text(subtitle, color = Muted, style = MaterialTheme.typography.labelSmall)
        }
    }
}

@Composable
private fun CollectionScreen(
    modifier: Modifier,
    catalog: List<CatalogCard>,
    holdings: List<CollectionCard>,
    database: TcgDatabase,
    onChanged: () -> Unit
) {
    var query by remember { mutableStateOf("") }
    var filter by remember { mutableStateOf("Todas") }
    val holdingByKey = remember(holdings) { holdings.associateBy { it.key } }
    val visible = remember(query, filter, catalog) {
        val q = query.trim()
        catalog.asSequence()
            .filter { filter == "Todas" || (filter == "Entrenadores" && it.trainer) || (filter == "Pokémon" && !it.trainer) }
            .filter { q.isBlank() || it.name.contains(q, ignoreCase = true) || "${it.set} ${it.number}".contains(q, ignoreCase = true) }
            .take(if (q.isBlank()) 24 else 40)
            .toList()
    }
    Column(
        modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Colección", color = Color.White, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text("${holdings.sumOf { it.quantity }} cartas registradas · ${catalog.size} disponibles", color = Muted)
        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Buscar carta, nombre o ID...") },
            leadingIcon = { Icon(Icons.Outlined.Search, null) },
            singleLine = true,
            shape = RoundedCornerShape(16.dp)
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("Todas", "Pokémon", "Entrenadores").forEach { option ->
                FilterChip(selected = filter == option, onClick = { filter = option }, label = { Text(option) })
            }
        }
        LazyColumn(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(bottom = 20.dp)
        ) {
            items(visible.chunked(2), key = { row -> row.joinToString("|") { "${it.set}:${it.number}:${it.entityId}" } }) { row ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    row.forEach { card ->
                        val key = "${card.set}#${card.number}"
                        val quantity = holdingByKey[key]?.quantity ?: 0
                        Card(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(18.dp),
                            colors = CardDefaults.cardColors(containerColor = Surface)
                        ) {
                            Column {
                                Box(
                                    Modifier.fillMaxWidth().height(165.dp).background(Color(0xFF0B111A)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    AsyncImage(
                                        model = Catalog.imageUrl(card),
                                        contentDescription = card.name,
                                        modifier = Modifier.fillMaxSize().padding(8.dp),
                                        contentScale = ContentScale.Fit
                                    )
                                    if (quantity > 0) {
                                        Surface(
                                            modifier = Modifier.align(Alignment.TopEnd).padding(8.dp),
                                            shape = RoundedCornerShape(10.dp),
                                            color = Accent
                                        ) {
                                            Text("×$quantity", color = Color.White, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                                        }
                                    }
                                }
                                Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                                    Text(card.name, color = Color.White, maxLines = 2, fontWeight = FontWeight.SemiBold)
                                    Text("${card.set} · ${card.number} · ${card.rarity}", color = Muted, style = MaterialTheme.typography.labelSmall)
                                    Row(
                                        Modifier.fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        IconButton(onClick = {
                                            if (quantity > 0) {
                                                database.saveCard(CollectionCard(key, card.name, card.set, card.number.toString(), quantity - 1, Catalog.imageUrl(card), if (card.trainer) "Entrenadores" else "Pokémon"))
                                                onChanged()
                                            }
                                        }) { Icon(Icons.Outlined.Remove, "Restar", tint = Muted) }
                                        Text(if (quantity > 0) "En colección" else "No registrada", color = if (quantity > 0) AccentSoft else Muted, style = MaterialTheme.typography.labelMedium)
                                        IconButton(onClick = {
                                            database.saveCard(CollectionCard(key, card.name, card.set, card.number.toString(), quantity + 1, Catalog.imageUrl(card), if (card.trainer) "Entrenadores" else "Pokémon"))
                                            onChanged()
                                        }) { Icon(Icons.Outlined.Add, "Agregar", tint = Accent) }
                                    }
                                }
                            }
                        }
                    }
                    if (row.size == 1) Spacer(Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun DecksScreen(modifier: Modifier, decks: List<DeckSummary>, onOpen: (Long) -> Unit, onStrategy: () -> Unit) {
    Column(modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Mazos", color = Color.White, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Text("${decks.size} mazos guardados", color = Muted)
            }
            FilledTonalButton(onClick = onStrategy) {
                Icon(Icons.Outlined.AutoAwesome, null)
                Spacer(Modifier.width(6.dp))
                Text("Crear con IA")
            }
        }
        if (decks.isEmpty()) {
            EmptyCard("Sin mazos", "Los mazos creados con IA aparecerán aquí.")
        } else {
            LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(decks, key = { it.id }) { deck ->
                    Card(
                        onClick = { onOpen(deck.id) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(Surface)
                    ) {
                        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Surface(shape = RoundedCornerShape(14.dp), color = SurfaceRaised) {
                                Icon(Icons.Outlined.GridView, null, tint = Accent, modifier = Modifier.padding(12.dp))
                            }
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(deck.name, color = Color.White, fontWeight = FontWeight.Bold)
                                Text("${deck.cardCount}/20 cartas · ${deck.energyCount} energías", color = Muted)
                            }
                            Text(
                                if (deck.valid) "VÁLIDO" else "REVISAR",
                                color = if (deck.valid) AccentSoft else Color(0xFFFFB86B),
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.labelSmall
                            )
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

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text("Estrategia IA", color = Color.White, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text("Convierte tu colección en una propuesta de juego.", color = Muted)
        }
        item {
            Card(Modifier.fillMaxWidth(), RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(SurfaceBlue)) {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(shape = RoundedCornerShape(12.dp), color = Accent.copy(alpha = 0.15f)) {
                            Icon(Icons.Outlined.AutoAwesome, null, tint = Accent, modifier = Modifier.padding(10.dp))
                        }
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text("Constructor estratégico", color = Color.White, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                            Text("20 cartas · 1–3 energías", color = AccentSoft, style = MaterialTheme.typography.labelMedium)
                        }
                    }
                    Text("Grok analiza únicamente las cartas registradas y propone un mazo válido.", color = Color(0xFFD0D8E3))
                    if (!aiClient.hasKey()) {
                        OutlinedTextField(value = key, onValueChange = { key = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Clave API de xAI") }, placeholder = { Text("xai-...") }, singleLine = true, shape = RoundedCornerShape(14.dp))
                        Text("La clave se guarda solo en este dispositivo.", color = Muted, style = MaterialTheme.typography.labelSmall)
                    }
                    OutlinedTextField(value = goal, onValueChange = { goal = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Objetivo opcional") }, placeholder = { Text("Ej.: consistencia, agresividad, control...") }, minLines = 2, shape = RoundedCornerShape(14.dp))
                    Button(
                        enabled = !busy && holdings.sumOf { it.quantity } > 0,
                        onClick = {
                            if (!aiClient.hasKey()) aiClient.saveKey(key)
                            busy = true
                            message = null
                            explanation = null
                            scope.launch {
                                aiClient.generate(holdings, Catalog.allCards(), goal)
                                    .onSuccess {
                                        database.saveDeck(it.deck)
                                        explanation = it.explanation
                                        message = "Mazo guardado: ${it.deck.name}"
                                        onDeckSaved()
                                    }
                                    .onFailure { message = it.message ?: "No se pudo generar el mazo." }
                                busy = false
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Icon(Icons.Outlined.AutoAwesome, null)
                        Spacer(Modifier.width(8.dp))
                        Text(if (busy) "Analizando colección..." else "Generar y guardar mazo", fontWeight = FontWeight.Bold)
                    }
                    message?.let { Text(it, color = if (it.startsWith("Mazo")) AccentSoft else Color(0xFFFFB86B), fontWeight = FontWeight.SemiBold) }
                    explanation?.let {
                        HorizontalDivider(color = Divider)
                        Text("Criterio de la IA", color = Color.White, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(it, color = Muted)
                    }
                }
            }
        }
    }
}

@Composable
private fun EmptyCard(title: String, text: String) {
    Surface(Modifier.fillMaxWidth(), RoundedCornerShape(20.dp), color = Surface) {
        Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = RoundedCornerShape(14.dp), color = SurfaceRaised) {
                Icon(Icons.Outlined.Info, null, tint = Accent, modifier = Modifier.padding(10.dp))
            }
            Spacer(Modifier.width(12.dp))
            Column {
                Text(title, color = Color.White, fontWeight = FontWeight.SemiBold)
                Text(text, color = Muted)
            }
        }
    }
}
