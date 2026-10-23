package com.tcglab.next

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.CollectionsBookmark
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Style
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

private val Background = Color(0xFF080C13)
private val Surface = Color(0xFF111823)
private val Surface2 = Color(0xFF172231)
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

    MaterialTheme(
        colorScheme = MaterialTheme.colorScheme.copy(
            primary = Accent,
            background = Background,
            surface = Surface,
        ),
    ) {
        Scaffold(
            containerColor = Background,
            bottomBar = {
                NavigationBar(
                    modifier = Modifier.navigationBarsPadding(),
                    containerColor = Surface,
                ) {
                    val items = listOf(
                        "Inicio" to Icons.Outlined.Home,
                        "Colección" to Icons.Outlined.CollectionsBookmark,
                        "Mazos" to Icons.Outlined.GridView,
                        "Estrategia" to Icons.Outlined.AutoAwesome,
                    )
                    items.forEachIndexed { index, item ->
                        NavigationBarItem(
                            selected = selected == index,
                            onClick = { selected = index },
                            icon = { Icon(item.second, contentDescription = item.first) },
                            label = { Text(item.first) },
                        )
                    }
                }
            },
        ) { padding ->
            when (selected) {
                0 -> HomeScreen(Modifier.padding(padding)) { selected = 3 }
                1 -> ModuleScreen("Colección", "Tus cartas", "Consulta, busca y administra las cartas disponibles.")
                2 -> ModuleScreen("Mazos", "Mazos guardados", "Revisa tus mazos y su composición.")
                else -> StrategyScreen()
            }
        }
    }
}

@Composable
private fun HomeScreen(modifier: Modifier = Modifier, onStrategy: () -> Unit) {
    Column(
        modifier = modifier.fillMaxSize().padding(horizontal = 20.dp, vertical = 18.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.weight(1f)) {
                Text("TCG LAB", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
                Text("Laboratorio de estrategia", color = Muted)
            }
            IconButton(onClick = {}) {
                Icon(Icons.Outlined.Settings, contentDescription = "Ajustes", tint = Muted)
            }
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(26.dp),
            colors = CardDefaults.cardColors(containerColor = Surface2),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.linearGradient(
                            listOf(Color(0xFF162B45), Surface2)
                        )
                    )
                    .padding(24.dp)
            ) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.AutoAwesome, null, tint = Accent, modifier = Modifier.size(28.dp))
                        Spacer(Modifier.size(10.dp))
                        Text("ESTRATEGIA IA", color = Accent, fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.height(12.dp))
                    Text(
                        "Construye tu próximo mazo",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(Modifier.height(7.dp))
                    Text(
                        "Analiza tu colección y recibe una propuesta de 20 cartas con explicación estratégica.",
                        color = Muted,
                    )
                    Spacer(Modifier.height(20.dp))
                    Button(onClick = onStrategy, shape = RoundedCornerShape(14.dp)) {
                        Text("Analizar colección", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            StatCard("CARTAS", "0", Icons.Outlined.CollectionsBookmark, Modifier.weight(1f))
            StatCard("MAZOS", "0", Icons.Outlined.Style, Modifier.weight(1f))
        }

        Text("Actividad reciente", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(18.dp),
            color = Surface,
        ) {
            Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.GridView, null, tint = Muted)
                Spacer(Modifier.size(12.dp))
                Column {
                    Text("Aún no hay actividad", fontWeight = FontWeight.SemiBold)
                    Text("Crea tu primer mazo con IA.", color = Muted)
                }
            }
        }
    }
}

@Composable
private fun StatCard(title: String, value: String, icon: androidx.compose.ui.graphics.vector.ImageVector, modifier: Modifier) {
    Card(modifier = modifier, shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = Surface)) {
        Row(Modifier.padding(17.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, tint = Accent)
            Spacer(Modifier.size(11.dp))
            Column {
                Text(title, color = Muted, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun ModuleScreen(title: String, heading: String, description: String) {
    Box(Modifier.fillMaxSize().background(Background).padding(20.dp)) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text(heading, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
            Text(description, color = Muted)
        }
    }
}

@Composable
private fun StrategyScreen() {
    Box(Modifier.fillMaxSize().background(Background).padding(20.dp)) {
        Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text("Estrategia IA", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text("Análisis de colección", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
            Text("La generación del mazo y el análisis estratégico se integrarán aquí.", color = Muted)
            Button(onClick = {}, shape = RoundedCornerShape(14.dp)) {
                Icon(Icons.Outlined.AutoAwesome, null)
                Spacer(Modifier.size(8.dp))
                Text("Comenzar análisis")
            }
        }
    }
}
