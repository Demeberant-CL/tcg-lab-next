package com.tcglab.next

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
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

private val Background = Color(0xFF080C13)
private val Surface = Color(0xFF111823)
private val Surface2 = Color(0xFF17263A)
private val Accent = Color(0xFF58A6FF)
private val Muted = Color(0xFF8E9AAA)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { TcgLabNextApp() }
    }
}

@Composable
private fun TcgLabNextApp() {
    var selected by remember { mutableIntStateOf(0) }
    MaterialTheme(colorScheme = MaterialTheme.colorScheme.copy(primary = Accent, background = Background, surface = Surface)) {
        Scaffold(containerColor = Background, bottomBar = {
            NavigationBar(containerColor = Surface) {
                listOf("Inicio" to Icons.Outlined.Home, "Colección" to Icons.Outlined.CollectionsBookmark, "Mazos" to Icons.Outlined.GridView, "Estrategia" to Icons.Outlined.AutoAwesome).forEachIndexed { i, item ->
                    NavigationBarItem(selected == i, { selected = i }, icon = { Icon(item.second, item.first) }, label = { Text(item.first) })
                }
            }
        }) { padding ->
            when (selected) {
                0 -> HomeScreen(Modifier.padding(padding)) { selected = 3 }
                1 -> CollectionScreen(Modifier.padding(padding))
                2 -> DecksScreen(Modifier.padding(padding))
                else -> StrategyScreen(Modifier.padding(padding))
            }
        }
    }
}

@Composable private fun HomeScreen(modifier: Modifier, onStrategy: () -> Unit) {
    Column(modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) { Text("TCG LAB", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black); Text("Laboratorio de estrategia", color = Muted) }
            IconButton({}) { Icon(Icons.Outlined.Settings, "Ajustes", tint = Muted) }
        }
        Card(Modifier.fillMaxWidth(), RoundedCornerShape(26.dp), colors = CardDefaults.cardColors(Surface2)) {
            Box(Modifier.background(Brush.linearGradient(listOf(Color(0xFF193451), Surface2))).padding(24.dp)) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Outlined.AutoAwesome, null, tint = Accent); Spacer(Modifier.width(10.dp)); Text("ESTRATEGIA IA", color = Accent, fontWeight = FontWeight.Bold) }
                    Spacer(Modifier.height(12.dp))
                    Text("Construye tu próximo mazo", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(7.dp))
                    Text("Analiza tu colección y recibe una propuesta de 20 cartas con explicación estratégica.", color = Muted)
                    Spacer(Modifier.height(20.dp))
                    Button(onStrategy, shape = RoundedCornerShape(14.dp)) { Text("Analizar colección", fontWeight = FontWeight.Bold) }
                }
            }
        }
        Row(Modifier.fillMaxWidth(), Arrangement.spacedBy(12.dp)) {
            StatCard("CARTAS", "0", Icons.Outlined.CollectionsBookmark, Modifier.weight(1f))
            StatCard("MAZOS", "0", Icons.Outlined.GridView, Modifier.weight(1f))
        }
        Text("Actividad reciente", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        EmptyCard("Aún no hay actividad", "Crea tu primer mazo con IA.")
    }
}

@Composable private fun CollectionScreen(modifier: Modifier) {
    Column(modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Colección", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text("Cartas disponibles", color = Muted)
        OutlinedTextField(value = "", onValueChange = {}, modifier = Modifier.fillMaxWidth(), placeholder = { Text("Buscar carta...") }, leadingIcon = { Icon(Icons.Outlined.Search, null) }, singleLine = true)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(true, {}, { Text("Todas") }); FilterChip(false, {}, { Text("Pokémon") }); FilterChip(false, {}, { Text("Entrenadores") })
        }
        EmptyCard("Colección vacía", "Aquí aparecerán las cartas registradas.")
    }
}

@Composable private fun DecksScreen(modifier: Modifier) {
    Column(modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) { Text("Mazos", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold); Text("Mazos guardados", color = Muted) }
            FilledTonalButton({}) { Icon(Icons.Outlined.AutoAwesome, null); Spacer(Modifier.width(6.dp)); Text("Crear con IA") }
        }
        EmptyCard("Sin mazos", "Los mazos creados con IA aparecerán aquí.")
    }
}

@Composable private fun StrategyScreen(modifier: Modifier) {
    Column(modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Estrategia IA", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Card(Modifier.fillMaxWidth(), RoundedCornerShape(22.dp), colors = CardDefaults.cardColors(Surface)) {
            Column(Modifier.padding(20.dp)) {
                Text("Análisis estratégico", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp)); Text("La IA revisará la colección y propondrá un mazo válido de 20 cartas.", color = Muted)
                Spacer(Modifier.height(18.dp)); Button({}) { Icon(Icons.Outlined.AutoAwesome, null); Spacer(Modifier.width(8.dp)); Text("Comenzar análisis") }
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
