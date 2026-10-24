package com.tcglab.next.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val Background = Color(0xFF070B12)
val Surface = Color(0xFF101722)
val SurfaceRaised = Color(0xFF162335)
val SurfaceBlue = Color(0xFF142B45)
val Accent = Color(0xFF62A9FF)
val AccentSoft = Color(0xFF9CC9FF)
val Muted = Color(0xFF9BA8B8)
val Divider = Color(0xFF263446)

private val DarkColors = darkColorScheme(
    primary = Accent,
    onPrimary = Color.White,
    secondary = AccentSoft,
    background = Background,
    surface = Surface,
    surfaceVariant = SurfaceRaised,
    onBackground = Color.White,
    onSurface = Color.White,
    onSurfaceVariant = Muted,
    outline = Divider
)

@Composable
fun TcgLabTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColors,
        content = content
    )
}
