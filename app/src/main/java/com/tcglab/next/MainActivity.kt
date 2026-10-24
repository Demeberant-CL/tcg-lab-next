package com.tcglab.next

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.compose.BackHandler
import androidx.compose.runtime.saveable.rememberSaveable
import com.tcglab.next.ui.theme.TcgLabTheme
import androidx.compose.ui.platform.LocalContext
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.Switch
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
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.tcglab.next.data.AiDeckClient
import com.tcglab.next.data.AiDeckProposal
import com.tcglab.next.data.Catalog
import com.tcglab.next.data.CatalogCard
import com.tcglab.next.data.CollectionCard
import com.tcglab.next.data.Deck
import com.tcglab.next.data.DeckCard
import com.tcglab.next.data.DeckSummary
import com.tcglab.next.data.TcgDatabase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class MainActivity : ComponentActivity() {
    private val database: TcgDatabase get() = DatabaseHolder.db
    private val aiClient by lazy { AiDeckClient(applicationContext) }
    private var darkTheme by mutableStateOf(true)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        DatabaseHolder.init(applicationContext)
        darkTheme = aiClient.isDarkTheme()
        enableEdgeToEdge()
        setContent {
            TcgLabTheme(darkTheme = darkTheme) {
                TcgLabNextApp(database, aiClient, onThemeChanged = { darkTheme = it })
            }
        }
    }
    // Database is a process singleton; do not close it here.
}

@Composable
private fun TcgLabNextApp(database: TcgDatabase, aiClient: AiDeckClient, onThemeChanged: (Boolean) -> Unit = {}) {
    var selected by rememberSaveable { mutableIntStateOf(0) }
    var selectedDeck by remember { mutableStateOf<Deck?>(null) }
    var building by remember { mutableStateOf(false) }
    var showSettings by remember { mutableStateOf(false) }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val cards = remember { mutableStateOf(emptyList<CollectionCard>()) }
    val decks = remember { mutableStateOf(emptyList<DeckSummary>()) }
    val catalog = remember { mutableStateOf(emptyList<CatalogCard>()) }

    BackHandler(enabled = selectedDeck != null || building || showSettings || selected != 0) {
        when {
            showSettings -> showSettings = false
            building -> building = false
            selectedDeck != null -> selectedDeck = null
            else -> selected = 0
        }
    }
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

    Scaffold(
            containerColor = MaterialTheme.colorScheme.background,
            bottomBar = {
                NavigationBar(containerColor = MaterialTheme.colorScheme.surface, tonalElevation = 0.dp) {
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
                                selectedIconColor = MaterialTheme.colorScheme.onSurface,
                                selectedTextColor = MaterialTheme.colorScheme.onSurface,
                                indicatorColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.20f),
                                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        )
                    }
                }
            }
        ) { padding ->
            if (showSettings) {
                SettingsScreen(
                    modifier = Modifier.padding(padding).fillMaxSize(),
                    aiClient = aiClient,
                    database = database,
                    onThemeChanged = onThemeChanged,
                    onCollectionChanged = {
                        scope.launch(Dispatchers.IO) {
                            val updated = database.getCards()
                            withContext(Dispatchers.Main) { cards.value = updated }
                        }
                    },
                    onBack = { showSettings = false }
                )
            } else if (loading) {
                Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
            } else when (selected) {
                0 -> HomeScreen(
                    Modifier.padding(padding),
                    cards.value.sumOf { it.quantity },
                    decks.value.size,
                    onCollection = { selected = 1 },
                    onStrategy = { selected = 3 },
                    onDecks = { selected = 2 },
                    onSettings = { showSettings = true }
                )
                1 -> CollectionScreen(
                    Modifier.padding(padding),
                    catalog.value,
                    cards.value,
                    database
                ) { updated -> cards.value = updated }
                2 -> if (building) {
                    DeckBuilderScreen(
                        modifier = Modifier.padding(padding).fillMaxSize(),
                        holdings = cards.value,
                        database = database,
                        onSaved = {
                            building = false
                            scope.launch(Dispatchers.IO) {
                                val updated = database.getDecks()
                                withContext(Dispatchers.Main) { decks.value = updated }
                            }
                        },
                        onCancel = { building = false }
                    )
                } else if (selectedDeck != null) {
                    DeckDetailScreen(
                        selectedDeck!!,
                        database,
                        onBack = { selectedDeck = null },
                        onDeleted = {
                            selectedDeck = null
                            scope.launch(Dispatchers.IO) {
                                val updated = database.getDecks()
                                withContext(Dispatchers.Main) { decks.value = updated }
                            }
                        }
                    )
                } else {
                    DecksScreen(
                        Modifier.padding(padding),
                        decks.value,
                        onOpen = { id ->
                            scope.launch(Dispatchers.IO) {
                                val deck = database.getDeck(id)
                                withContext(Dispatchers.Main) { selectedDeck = deck }
                            }
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
        }
}

@Composable
private fun HomeScreen(
    modifier: Modifier,
    cardCount: Int,
    deckCount: Int,
    onCollection: () -> Unit,
    onStrategy: () -> Unit,
    onDecks: () -> Unit,
    onSettings: () -> Unit = {}
) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 22.dp, bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("TCG LAB", color = MaterialTheme.colorScheme.onSurface, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
                    Text("Laboratorio de estrategia", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyLarge)
                }
                Surface(shape = RoundedCornerShape(16.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                    IconButton(onClick = onSettings) {
                        Icon(Icons.Outlined.Settings, "Ajustes", tint = MaterialTheme.colorScheme.secondary)
                    }
                }
            }
        }
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(28.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
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
                                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)
                            ) {
                                Icon(
                                    Icons.Outlined.AutoAwesome,
                                    null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.padding(10.dp).size(24.dp)
                                )
                            }
                            Spacer(Modifier.width(12.dp))
                            Column {
                                Text("ESTRATEGIA IA", color = MaterialTheme.colorScheme.secondary, fontWeight = FontWeight.Bold)
                                Text("Laboratorio de decisiones", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.labelMedium)
                            }
                        }
                        Text(
                            "Construye tu próximo mazo",
                            color = MaterialTheme.colorScheme.onSurface,
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
                Text("Actividad reciente", color = MaterialTheme.colorScheme.onSurface, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                Text("Laboratorio", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.labelMedium)
            }
        }
        item {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                color = MaterialTheme.colorScheme.surface
            ) {
                Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                    Surface(shape = RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                        Icon(Icons.Outlined.Insights, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(11.dp).size(24.dp))
                    }
                    Spacer(Modifier.width(14.dp))
                    Column {
                        Text("Sin actividad todavía", color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
                        Spacer(Modifier.height(3.dp))
                        Text("Registra cartas o crea un mazo con IA para comenzar.", color = MaterialTheme.colorScheme.onSurfaceVariant)
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
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            Icon(icon, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(25.dp))
            Text(title, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
            Text(value, color = MaterialTheme.colorScheme.onSurface, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text(subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.labelSmall)
        }
    }
}

@Composable
private fun CollectionScreen(
    modifier: Modifier,
    catalog: List<CatalogCard>,
    holdings: List<CollectionCard>,
    database: TcgDatabase,
    onChanged: (List<CollectionCard>) -> Unit
) {
    var query by rememberSaveable { mutableStateOf("") }
    var filter by rememberSaveable { mutableStateOf("Todas") }
    var ownership by rememberSaveable { mutableStateOf("Todas") }
    var setFilter by rememberSaveable { mutableStateOf("Todos") }
    var showWishlistOnly by rememberSaveable { mutableStateOf(false) }
    var wishlist by remember { mutableStateOf(emptySet<String>()) }
    var wishlistError by rememberSaveable { mutableStateOf<String?>(null) }
    var selectedCard by remember { mutableStateOf<CatalogCard?>(null) }
    val scope = rememberCoroutineScope()
    var localHoldings by remember(holdings) { mutableStateOf(holdings) }
    val holdingByKey = remember(localHoldings) { localHoldings.associateBy { it.key } }
    val quantityMutex = remember { Mutex() }
    var quantityError by rememberSaveable { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) {
        runCatching { withContext(Dispatchers.IO) { database.getWishlist() } }
            .onSuccess {
                wishlist = it
                wishlistError = null
            }
            .onFailure {
                wishlistError = "No se pudo cargar la lista de deseadas."
            }
    }
    val ownedKeys = remember(holdings) { localHoldings.map { it.key }.toSet() }
    val visible = remember(query, filter, ownership, setFilter, showWishlistOnly, catalog, ownedKeys, wishlist) {
        val q = query.trim()
        catalog.asSequence()
            .filter { filter == "Todas" || (filter == "Entrenadores" && it.trainer) || (filter == "Pokémon" && !it.trainer) }
            .filter { setFilter == "Todos" || it.set == setFilter }
            .filter { q.isBlank() || it.name.contains(q, ignoreCase = true) || "${it.set} ${it.number}".contains(q, ignoreCase = true) || "${it.set}-${it.number}".contains(q, ignoreCase = true) }
            .filter {
                val key = "${it.set}#${it.number}"
                ownership == "Todas" || (ownership == "Tengo" && key in ownedKeys) || (ownership == "Me faltan" && key !in ownedKeys)
            }
            .filter { !showWishlistOnly || "${it.set}#${it.number}" in wishlist }
            .toList()
    }
    val filteredCatalog = if (setFilter == "Todos") catalog else catalog.filter { it.set == setFilter }
    val uniqueOwned = localHoldings.filter { setFilter == "Todos" || it.setCode == setFilter }.distinctBy { it.key }.size
    val progress = if (filteredCatalog.isNotEmpty()) uniqueOwned.toFloat() / filteredCatalog.size else 0f
    Column(
        modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Colección", color = MaterialTheme.colorScheme.onSurface, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text("${localHoldings.sumOf { it.quantity }} cartas · $uniqueOwned / ${filteredCatalog.size} únicas${if (setFilter != "Todos") " ($setFilter)" else ""}", color = MaterialTheme.colorScheme.onSurfaceVariant)
        LinearProgressIndicator(progress = { progress }, modifier = Modifier.fillMaxWidth(), color = MaterialTheme.colorScheme.primary)
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
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("Todas", "Tengo", "Me faltan").forEach { option ->
                FilterChip(selected = ownership == option, onClick = { ownership = option }, label = { Text(option) })
            }
        }
        LazyRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(end = 8.dp)
        ) {
            item {
                FilterChip(
                    selected = setFilter == "Todos",
                    onClick = { setFilter = "Todos" },
                    label = { Text("Todos los sets") }
                )
            }
            items(Catalog.allSets(), key = { it.code }) { s ->
                FilterChip(
                    selected = setFilter == s.code,
                    onClick = { setFilter = s.code },
                    label = { Text(s.es) }
                )
            }
        }
        FilterChip(
            selected = showWishlistOnly,
            onClick = { showWishlistOnly = !showWishlistOnly },
            label = { Text(if (showWishlistOnly) "Solo deseadas" else "Mostrar deseadas") }
        )
        wishlistError?.let {
            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
        quantityError?.let { error ->
            Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
        if (visible.isEmpty()) {
            EmptyCard("Sin resultados", "Prueba con otro nombre, ID o cambia el filtro.")
        }
        LazyVerticalGrid(
            columns = GridCells.Adaptive(minSize = 148.dp),
            modifier = Modifier.weight(1f),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(bottom = 20.dp)
        ) {
            items(visible, key = { "${it.set}#${it.number}" }) { card ->
                        val key = "${card.set}#${card.number}"
                        val quantity = holdingByKey[key]?.quantity ?: 0
                        Card(
                            modifier = Modifier.clickable { selectedCard = card },
                            shape = RoundedCornerShape(18.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
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
                                            color = MaterialTheme.colorScheme.primary
                                        ) {
                                            Text("×$quantity", color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                                        }
                                    }
                                }
                                Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                                    Text(card.name, color = MaterialTheme.colorScheme.onSurface, maxLines = 2, fontWeight = FontWeight.SemiBold)
                                    Text("${card.set} · ${card.number} · ${card.rarity}", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.labelSmall)
                                    Row(
                                        Modifier.fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        IconButton(onClick = {
                                            if (quantity > 0) {
                                                scope.launch {
                                                    quantityMutex.withLock {
                                                        runCatching {
                                                            withContext(Dispatchers.IO) {
                                                                database.adjustCardQuantity(
                                                                    CollectionCard(
                                                                        key,
                                                                        card.name,
                                                                        card.set,
                                                                        card.number.toString(),
                                                                        quantity,
                                                                        Catalog.imageUrl(card),
                                                                        if (card.trainer) "Entrenadores" else "Pokémon"
                                                                    ),
                                                                    -1
                                                                )
                                                            }
                                                        }.onSuccess { newQuantity ->
                                                            val updated = localHoldings.toMutableList().apply {
                                                                val index = indexOfFirst { it.key == key }
                                                                if (newQuantity == 0) {
                                                                    if (index >= 0) removeAt(index)
                                                                } else if (index >= 0) {
                                                                    this[index] = this[index].copy(quantity = newQuantity)
                                                                }
                                                            }
                                                            localHoldings = updated
                                                            onChanged(updated)
                                                            quantityError = null
                                                        }.onFailure {
                                                            quantityError = "No se pudo actualizar la cantidad."
                                                        }
                                                    }
                                                }
                                            }
                                        }) { Icon(Icons.Outlined.Remove, "Restar", tint = MaterialTheme.colorScheme.onSurfaceVariant) }
                                        Text(if (quantity > 0) "En colección" else "No registrada", color = if (quantity > 0) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.labelMedium)
                                        IconButton(onClick = {
                                            scope.launch {
                                                quantityMutex.withLock {
                                                    runCatching {
                                                        withContext(Dispatchers.IO) {
                                                            database.adjustCardQuantity(
                                                                CollectionCard(
                                                                    key,
                                                                    card.name,
                                                                    card.set,
                                                                    card.number.toString(),
                                                                    quantity,
                                                                    Catalog.imageUrl(card),
                                                                    if (card.trainer) "Entrenadores" else "Pokémon"
                                                                ),
                                                                1
                                                            )
                                                        }
                                                    }.onSuccess { newQuantity ->
                                                        val updated = localHoldings.toMutableList().apply {
                                                            val index = indexOfFirst { it.key == key }
                                                            if (index >= 0) {
                                                                this[index] = this[index].copy(quantity = newQuantity)
                                                            } else if (newQuantity > 0) {
                                                                add(CollectionCard(key, card.name, card.set, card.number.toString(), newQuantity, Catalog.imageUrl(card), if (card.trainer) "Entrenadores" else "Pokémon"))
                                                            }
                                                        }
                                                        localHoldings = updated
                                                        onChanged(updated)
                                                        quantityError = null
                                                    }.onFailure {
                                                        quantityError = "No se pudo actualizar la cantidad."
                                                    }
                                                }
                                            }
                                        }) { Icon(Icons.Outlined.Add, "Agregar", tint = MaterialTheme.colorScheme.primary) }
                                    }
                                }
                            }
                        }
            }
        }
    }
    selectedCard?.let { card ->
        val quantity = holdingByKey["${card.set}#${card.number}"]?.quantity ?: 0
        AlertDialog(
            onDismissRequest = { selectedCard = null },
            title = { Text(card.name) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    AsyncImage(
                        model = Catalog.imageUrl(card),
                        contentDescription = card.name,
                        modifier = Modifier.fillMaxWidth().height(260.dp),
                        contentScale = ContentScale.Fit
                    )
                    Text("${card.set} · #${card.number} · ${card.rarity}", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(if (card.trainer) "Entrenador" else "Pokémon · ${card.element}", color = MaterialTheme.colorScheme.secondary)
                    Text("Cantidad registrada: ×$quantity", color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
                    val key = "${card.set}#${card.number}"
                    val wished = key in wishlist
                    TextButton(onClick = {
                        scope.launch {
                            runCatching {
                                withContext(Dispatchers.IO) {
                                    database.toggleWishlist(key)
                                    database.getWishlist()
                                }
                            }.onSuccess {
                                wishlist = it
                                wishlistError = null
                            }.onFailure {
                                wishlistError = "No se pudo actualizar la lista de deseadas."
                            }
                        }
                    }) {
                        Text(if (wished) "Quitar de deseados" else "Añadir a deseados")
                    }
                }
            },
            confirmButton = { TextButton(onClick = { selectedCard = null }) { Text("Cerrar") } }
        )
    }
}

@Composable
private fun DecksScreen(modifier: Modifier, decks: List<DeckSummary>, onOpen: (Long) -> Unit, onStrategy: () -> Unit, onNewDeck: () -> Unit = {}) {
    Column(modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Mazos", color = MaterialTheme.colorScheme.onSurface, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Text("${decks.size} mazos guardados", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            FilledTonalButton(onClick = onNewDeck) {
                Icon(Icons.Outlined.Add, null)
                Spacer(Modifier.width(4.dp))
                Text("Nuevo")
            }
            Spacer(Modifier.width(8.dp))
            FilledTonalButton(onClick = onStrategy) {
                Icon(Icons.Outlined.AutoAwesome, null)
                Spacer(Modifier.width(6.dp))
                Text("IA")
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
                        colors = CardDefaults.cardColors(MaterialTheme.colorScheme.surface)
                    ) {
                        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Surface(shape = RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                                Icon(Icons.Outlined.GridView, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(12.dp))
                            }
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(deck.name, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)
                                Text("${deck.cardCount}/20 cartas · ${deck.energyCount} energías", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Text(
                                if (deck.valid) "VÁLIDO" else "REVISAR",
                                color = if (deck.valid) MaterialTheme.colorScheme.secondary else Color(0xFFFFB86B),
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
    onDeckSaved: (List<DeckSummary>) -> Unit
) {
    val scope = rememberCoroutineScope()
    var key by remember { mutableStateOf("") }
    var goal by rememberSaveable { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var explanation by remember { mutableStateOf<String?>(null) }
    var proposal by remember { mutableStateOf<AiDeckProposal?>(null) }
    var showKey by remember { mutableStateOf(false) }
    val distinctHoldings = holdings.distinctBy { it.key }.size

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text("Estrategia IA", color = MaterialTheme.colorScheme.onSurface, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text("Convierte tu colección en una propuesta de juego.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        item {
            Card(Modifier.fillMaxWidth(), RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(MaterialTheme.colorScheme.primaryContainer)) {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)) {
                            Icon(Icons.Outlined.AutoAwesome, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(10.dp))
                        }
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text("Constructor estratégico", color = MaterialTheme.colorScheme.onSurface, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                            Text("20 cartas · 1–3 energías", color = MaterialTheme.colorScheme.secondary, style = MaterialTheme.typography.labelMedium)
                        }
                    }
                    Text("Grok analiza únicamente las cartas registradas y propone un mazo válido.", color = Color(0xFFD0D8E3))
                    if (!aiClient.hasKey()) {
                        OutlinedTextField(
                            value = key,
                            onValueChange = { key = it },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Clave API de xAI") },
                            placeholder = { Text("xai-...") },
                            singleLine = true,
                            shape = RoundedCornerShape(14.dp),
                            visualTransformation = if (showKey) VisualTransformation.None else PasswordVisualTransformation(),
                            trailingIcon = {
                                IconButton(onClick = { showKey = !showKey }) {
                                    Icon(
                                        if (showKey) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility,
                                        if (showKey) "Ocultar clave" else "Mostrar clave"
                                    )
                                }
                            }
                        )
                        Text("La clave se guarda solo en este dispositivo.", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.labelSmall)
                    }
                    if (distinctHoldings < 10) {
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            color = MaterialTheme.colorScheme.surface
                        ) {
                            Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Outlined.Info, null, tint = MaterialTheme.colorScheme.primary)
                                Spacer(Modifier.width(10.dp))
                                Column {
                                    Text("Colección insuficiente", color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
                                    Text("Registra al menos 10 cartas distintas para habilitar el análisis.", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
                                }
                            }
                        }
                    }
                    OutlinedTextField(value = goal, onValueChange = { goal = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Objetivo opcional") }, placeholder = { Text("Ej.: consistencia, agresividad, control...") }, minLines = 2, shape = RoundedCornerShape(14.dp))
                    Button(
                        enabled = !busy && holdings.distinctBy { it.key }.size >= 10,
                        onClick = {
                            if (!aiClient.hasKey()) aiClient.saveKey(key)
                            busy = true
                            message = null
                            explanation = null
                            proposal = null
                            scope.launch {
                                aiClient.generate(holdings, Catalog.allCards(), goal)
                                    .onSuccess {
                                        proposal = it
                                        explanation = it.explanation
                                        message = "Propuesta lista para revisar."
                                    }
                                    .onFailure { message = it.message ?: "No se pudo generar la propuesta." }
                                busy = false
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Icon(Icons.Outlined.AutoAwesome, null)
                        Spacer(Modifier.width(8.dp))
                        Text(if (busy) "Analizando colección..." else "Generar propuesta", fontWeight = FontWeight.Bold)
                    }
                    proposal?.let { p ->
                        HorizontalDivider(color = MaterialTheme.colorScheme.outline)
                        Text("Propuesta", color = MaterialTheme.colorScheme.onSurface, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            AssistChip(onClick = {}, label = { Text("${p.deck.totalCards}/20 cartas") })
                            AssistChip(onClick = {}, label = { Text("${p.deck.energies.size} energías") })
                            AssistChip(onClick = {}, label = { Text(if (p.deck.isValid) "Válido" else "Revisar") })
                        }
                        Text(p.deck.name, color = MaterialTheme.colorScheme.onSurface, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        Text("Energías: ${p.deck.energies.joinToString(" · ")}", color = MaterialTheme.colorScheme.secondary)
                        Text("Cartas: ${p.deck.cards.size} distintas · ${p.deck.totalCards} copias", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            p.deck.cards.forEach { card ->
                                Surface(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    color = MaterialTheme.colorScheme.surface
                                ) {
                                    Row(Modifier.padding(horizontal = 12.dp, vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Column(Modifier.weight(1f)) {
                                            Text(card.name, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
                                            Text("${card.setCode} · #${card.number} · ${card.category}", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.labelSmall)
                                        }
                                        Text("×${card.quantity}", color = MaterialTheme.colorScheme.secondary, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                        Button(
                            onClick = {
                                scope.launch {
                                    withContext(Dispatchers.IO) { database.saveDeck(p.deck) }
                                    message = "Mazo guardado: ${p.deck.name}"
                                    onDeckSaved(withContext(Dispatchers.IO) { database.getDecks() })
                                    proposal = null
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Icon(Icons.Outlined.Save, null)
                            Spacer(Modifier.width(8.dp))
                            Text("Guardar mazo")
                        }
                    }
                    message?.let { Text(it, color = if (it.startsWith("Mazo")) MaterialTheme.colorScheme.secondary else Color(0xFFFFB86B), fontWeight = FontWeight.SemiBold) }
                    explanation?.let {
                        HorizontalDivider(color = MaterialTheme.colorScheme.outline)
                        Text("Criterio de la IA", color = MaterialTheme.colorScheme.onSurface, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

@Composable
private fun EmptyCard(title: String, text: String) {
    Surface(Modifier.fillMaxWidth(), RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surface) {
        Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                Icon(Icons.Outlined.Info, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(10.dp))
            }
            Spacer(Modifier.width(12.dp))
            Column {
                Text(title, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
                Text(text, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}



@Composable
private fun DeckBuilderScreen(
    modifier: Modifier,
    holdings: List<CollectionCard>,
    database: TcgDatabase,
    onSaved: () -> Unit,
    onCancel: () -> Unit
) {
    var name by rememberSaveable { mutableStateOf("Mi mazo") }
    val selected = remember { mutableStateMapOf<String, Int>() }
    val energies = remember { mutableStateListOf<Int>() }
    val scope = rememberCoroutineScope()
    val total = selected.values.sum()

    Column(modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onCancel) { Icon(Icons.Outlined.ArrowBack, "Atrás") }
            Text("Nuevo mazo", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
        }
        OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Nombre") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
        Text("$total / 20 cartas", color = if (total == 20) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.SemiBold)
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            (1..8).forEach { e ->
                FilterChip(
                    selected = e in energies,
                    onClick = {
                        if (e in energies) energies.remove(e)
                        else if (energies.size < 3) energies.add(e)
                    },
                    label = { Text(e.toString()) }
                )
            }
        }
        LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items(holdings.filter { it.quantity > 0 }, key = { it.key }) { card ->
                val qty = selected[card.key] ?: 0
                val max = minOf(2, card.quantity)
                Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(card.name, color = MaterialTheme.colorScheme.onSurface, maxLines = 1)
                        Text("${card.setCode} #${card.number} · tienes ${card.quantity}", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.labelSmall)
                    }
                    IconButton(onClick = { if (qty > 0) selected[card.key] = qty - 1 }, enabled = qty > 0) {
                        Icon(Icons.Outlined.Remove, "Quitar")
                    }
                    Text("$qty", color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.padding(horizontal = 8.dp))
                    IconButton(onClick = { if (qty < max && total < 20) selected[card.key] = qty + 1 }, enabled = qty < max && total < 20) {
                        Icon(Icons.Outlined.Add, "Agregar")
                    }
                }
            }
        }
        Button(
            onClick = {
                val cards = holdings.mapNotNull { h ->
                    val q = selected[h.key] ?: 0
                    if (q > 0) DeckCard(h.setCode, h.number, h.name, h.category, q, h.imageUrl) else null
                }
                val deck = Deck(0L, name, cards, energies.toList())
                if (deck.isValid) {
                    scope.launch(Dispatchers.IO) {
                        database.saveDeck(deck)
                        withContext(Dispatchers.Main) { onSaved() }
                    }
                }
            },
            enabled = total == 20 && energies.size in 1..3,
            modifier = Modifier.fillMaxWidth()
        ) { Text("Guardar mazo") }
    }
}


@Composable
private fun SettingsScreen(
    modifier: Modifier,
    aiClient: AiDeckClient,
    database: TcgDatabase,
    onThemeChanged: (Boolean) -> Unit = {},
    onCollectionChanged: () -> Unit = {},
    onBack: () -> Unit
) {
    var key by remember { mutableStateOf(aiClient.currentKey() ?: "") }
    var message by remember { mutableStateOf<String?>(null) }
    var showKey by rememberSaveable { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    Column(modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.Outlined.ArrowBack, "Atrás") }
            Text("Ajustes", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
        }
        Text("Clave de xAI (Grok)", color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
        OutlinedTextField(
            value = key,
            onValueChange = { key = it },
            label = { Text("xai-...") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            visualTransformation = if (showKey) VisualTransformation.None else PasswordVisualTransformation(),
            trailingIcon = {
                IconButton(onClick = { showKey = !showKey }) {
                    Icon(
                        if (showKey) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility,
                        if (showKey) "Ocultar clave" else "Mostrar clave"
                    )
                }
            }
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = {
                aiClient.saveKey(key.trim())
                message = if (aiClient.hasKey()) "Clave guardada" else "Clave vacía"
            }) { Text("Guardar") }
            OutlinedButton(onClick = {
                aiClient.saveKey("")
                key = ""
                message = "Clave eliminada"
            }) { Text("Borrar") }
        }
        OutlinedButton(
            onClick = {
                scope.launch {
                    message = "Probando clave..."
                    val result = aiClient.testConnection()
                    message = result.fold(
                        onSuccess = { models -> "Conexión correcta · ${models.size} modelos disponibles." },
                        onFailure = { it.message ?: "No se pudo validar la clave." }
                    )
                }
            },
            enabled = aiClient.hasKey()
        ) { Text("Probar clave") }
        message?.let { Text(it, color = MaterialTheme.colorScheme.secondary) }
        Text("La clave se guarda localmente y solo se usa para generar mazos con IA.", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
        HorizontalDivider(color = MaterialTheme.colorScheme.outline)
        Text("Modelo de IA", color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
        var model by remember { mutableStateOf(aiClient.currentModel()) }
        OutlinedTextField(
            value = model,
            onValueChange = { model = it },
            label = { Text("Modelo (ej. grok-4.7)") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )
        Button(onClick = {
            aiClient.saveModel(model.trim())
            message = "Modelo guardado: ${aiClient.currentModel()}"
        }) { Text("Guardar modelo") }
        HorizontalDivider(color = MaterialTheme.colorScheme.outline)
        Text("Apariencia", color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
        var dark by remember { mutableStateOf(aiClient.isDarkTheme()) }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Tema oscuro", color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
            Switch(checked = dark, onCheckedChange = {
                dark = it
                aiClient.saveDarkTheme(it)
                onThemeChanged(it)
                message = "Tema guardado"
            })
        }
        HorizontalDivider(color = MaterialTheme.colorScheme.outline)
        Text("Colección", color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
        var exportText by remember { mutableStateOf("") }
        var importText by remember { mutableStateOf("") }
        Button(onClick = {
            exportText = database.exportCollectionJson()
            message = "Colección exportada"
        }) { Text("Exportar JSON") }
        if (exportText.isNotBlank()) {
            OutlinedTextField(
                value = exportText,
                onValueChange = {},
                modifier = Modifier.fillMaxWidth().height(120.dp),
                readOnly = true,
                label = { Text("JSON exportado") }
            )
        }
        OutlinedTextField(
            value = importText,
            onValueChange = { importText = it },
            modifier = Modifier.fillMaxWidth().height(100.dp),
            label = { Text("Pegar JSON para importar") }
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = {
                try {
                    val n = database.importCollectionJson(importText, "merge")
                    message = "Importadas $n cartas (modo sumar)"
                    onCollectionChanged()
                } catch (e: Exception) {
                    message = "Error al importar: ${e.message}"
                }
            }, enabled = importText.isNotBlank()) { Text("Importar (sumar)") }
            OutlinedButton(onClick = {
                try {
                    val n = database.importCollectionJson(importText, "replace")
                    message = "Importadas $n cartas (reemplazó todo)"
                    onCollectionChanged()
                } catch (e: Exception) {
                    message = "Error al importar: ${e.message}"
                }
            }, enabled = importText.isNotBlank()) { Text("Reemplazar") }
        }
        HorizontalDivider(color = MaterialTheme.colorScheme.outline)
        Text("Versión", color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
        Text("TCG LAB NEXT · en desarrollo", color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text("App fan no oficial. Pokémon es marca de Nintendo / Creatures / GAME FREAK.", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
    }
}

object DatabaseHolder {
    lateinit var db: TcgDatabase
        private set
    fun init(context: android.content.Context) {
        if (!::db.isInitialized) db = TcgDatabase(context.applicationContext)
    }
}
