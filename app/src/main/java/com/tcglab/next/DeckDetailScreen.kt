package com.tcglab.next

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.tcglab.next.data.Deck
import com.tcglab.next.data.DeckQr
import com.tcglab.next.data.TcgDatabase
import androidx.compose.ui.graphics.Color

private val DetailSurface = Color(0xFF111823)
private val DetailAccent = Color(0xFF58A6FF)
private val DetailMuted = Color(0xFF8E9AAA)

@Composable
fun DeckDetailScreen(deck: Deck, database: TcgDatabase, onBack: () -> Unit, onDeleted: () -> Unit) {
    var showQr by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }
    var qr by remember { mutableStateOf<android.graphics.Bitmap?>(null) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(deck, showQr) {
        qr = if (showQr) withContext(Dispatchers.Default) { DeckQr.encode(deck, 560) } else null
    }
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.Outlined.ArrowBack, "Volver") }
            Column(Modifier.weight(1f)) {
                Text(deck.name, style = MaterialTheme.typography.headlineSmall)
                Text("${deck.totalCards}/20 cartas · ${deck.energies.size} energías", color = DetailMuted)
            }
            Text(if (deck.isValid) "VÁLIDO" else "REVISAR", color = if (deck.isValid) DetailAccent else DetailMuted)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilledTonalButton(onClick = { showQr = !showQr }) { Text(if (showQr) "Ocultar QR" else "Mostrar QR") }
            OutlinedButton(onClick = { confirmDelete = true }) { Icon(Icons.Outlined.Delete, null); Spacer(Modifier.width(6.dp)); Text("Eliminar") }
        }
        if (showQr) {
            Card(Modifier.fillMaxWidth(), RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(DetailSurface)) {
                Column(Modifier.fillMaxWidth().padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    qr?.let {
                        Image(it.asImageBitmap(), contentDescription = "QR del mazo", modifier = Modifier.size(280.dp))
                    } ?: CircularProgressIndicator(color = DetailAccent)
                    Text("Código del mazo", style = MaterialTheme.typography.titleMedium)
                }
            }
        }
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(bottom = 24.dp)) {
            item { Text("Energías: ${deck.energies.joinToString(" · ")}", style = MaterialTheme.typography.titleMedium) }
            item { Text("Cartas", style = MaterialTheme.typography.titleMedium) }
            items(deck.cards, key = { "${it.setCode}#${it.number}" }) { card ->
                Card(Modifier.fillMaxWidth(), RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(DetailSurface)) {
                    Row(Modifier.padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        AsyncImage(model = card.imageUrl, contentDescription = card.name, modifier = Modifier.size(58.dp))
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) { Text(card.name); Text("${card.setCode} · ${card.number} · ${card.category}", color = DetailMuted, style = MaterialTheme.typography.labelSmall) }
                        Text("×${card.quantity}", style = MaterialTheme.typography.titleMedium)
                    }
                }
            }
        }
    }
    if (confirmDelete) AlertDialog(onDismissRequest = { confirmDelete = false }, title = { Text("Eliminar mazo") }, text = { Text("Se eliminará este mazo de forma permanente.") }, confirmButton = { TextButton(onClick = {
            scope.launch(Dispatchers.IO) {
                database.deleteDeck(deck.id)
                withContext(Dispatchers.Main) {
                    confirmDelete = false
                    onDeleted()
                }
            }
        }) { Text("Eliminar") } }, dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Cancelar") } })
}