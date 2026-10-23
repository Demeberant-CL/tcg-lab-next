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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.CollectionsBookmark
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

private val Navy = Color(0xFF0A0F18)
private val Panel = Color(0xFF121A27)
private val Accent = Color(0xFF4DA3FF)

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
            background = Navy,
            surface = Panel,
        ),
    ) {
        Scaffold(
            containerColor = Navy,
            bottomBar = {
                NavigationBar(
                    modifier = Modifier.navigationBarsPadding(),
                    containerColor = Panel,
                ) {
                    listOf(
                        "Inicio" to Icons.Outlined.Style,
                        "Colección" to Icons.Outlined.CollectionsBookmark,
                        "Mazos" to Icons.Outlined.Style,
                        "Estrategia" to Icons.Outlined.AutoAwesome,
                    ).forEachIndexed { index, item ->
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
                0 -> HomeScreen(
                    modifier = Modifier.padding(padding),
                    onStrategy = { selected = 3 },
                )
                1 -> PlaceholderScreen("Colección", "La colección visual será el siguiente módulo.")
                2 -> PlaceholderScreen("Mazos", "Los mazos guardados serán de solo lectura.")
                else -> PlaceholderScreen("Estrategia IA", "Aquí comenzará la generación de mazos con IA.")
            }
        }
    }
}

@Composable
private fun HomeScreen(modifier: Modifier = Modifier, onStrategy: () -> Unit) {
    Column(
        modifier = modifier.fillMaxSize().padding(horizontal = 20.dp, vertical = 18.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("TCG LAB", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Text("Laboratorio de estrategia", color = Color.LightGray)
            }
            IconButton(onClick = {}) {
                Icon(Icons.Outlined.Settings, contentDescription = "Ajustes")
            }
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Panel),
        ) {
            Column(modifier = Modifier.padding(22.dp)) {
                Text("Estrategia IA", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp))
                Text(
                    "Analiza la colección y propone un mazo válido, explicando las decisiones.",
                    color = Color.LightGray,
                )
                Spacer(Modifier.height(18.dp))
                Button(onClick = onStrategy) {
                    Icon(Icons.Outlined.AutoAwesome, contentDescription = null)
                    Spacer(Modifier.padding(4.dp))
                    Text("Analizar colección")
                }
            }
        }

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            MetricCard("Colección", "0", Modifier.weight(1f))
            MetricCard("Mazos", "0", Modifier.weight(1f))
        }

        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(18.dp),
            color = Panel,
        ) {
            Column(modifier = Modifier.padding(18.dp)) {
                Text("Actividad reciente", fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(6.dp))
                Text("Sin actividad registrada.", color = Color.Gray)
            }
        }
    }
}

@Composable
private fun MetricCard(title: String, value: String, modifier: Modifier) {
    Card(modifier = modifier, colors = CardDefaults.cardColors(containerColor = Panel)) {
        Column(modifier = Modifier.padding(18.dp)) {
            Text(title, color = Color.Gray)
            Spacer(Modifier.height(4.dp))
            Text(value, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun PlaceholderScreen(title: String, subtitle: String) {
    Box(
        modifier = Modifier.fillMaxSize().background(Navy),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            Text(subtitle, color = Color.Gray)
        }
    }
}
