package com.tcglab.next.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
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

private val LightColors = lightColorScheme(
    primary = Color(0xFF1E5BB8),
    onPrimary = Color.White,
    secondary = Color(0xFF3B6FB6),
    background = Color(0xFFF7F9FC),
    surface = Color.White,
    surfaceVariant = Color(0xFFE8EEF6),
    onBackground = Color(0xFF0F172A),
    onSurface = Color(0xFF0F172A),
    onSurfaceVariant = Color(0xFF475569),
    outline = Color(0xFFCBD5E1)
)

@Composable
fun TcgLabTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        content = content
    )
}
