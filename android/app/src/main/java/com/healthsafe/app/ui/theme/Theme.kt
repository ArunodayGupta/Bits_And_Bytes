package com.healthsafe.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf

val LightExtendedColors = HealthSafeExtendedColors(
    paper = PaperLight,
    paper2 = Paper2Light,
    card = CardLight,
    ink = InkLight,
    inkSoft = InkSoftLight,
    hairline = HairlineLight,
    moss600 = Moss600Light,
    moss500 = Moss500Light,
    moss100 = Moss100Light,
    teal700 = Teal700Light,
    gold400 = Gold400Light,
    eventMedText = EventMedTextLight,
    eventMedBg = EventMedBgLight,
    eventLabText = EventLabTextLight,
    eventLabBg = EventLabBgLight,
    eventCondText = EventCondTextLight,
    eventCondBg = EventCondBgLight,
    eventEncText = EventEncTextLight,
    eventEncBg = EventEncBgLight,
    heroGradientStart = HeroGradientLightStart,
    heroGradientMid = HeroGradientLightMid,
    heroGradientEnd = HeroGradientLightEnd
)

val DarkExtendedColors = HealthSafeExtendedColors(
    paper = PaperDark,
    paper2 = Paper2Dark,
    card = CardDark,
    ink = InkDark,
    inkSoft = InkSoftDark,
    hairline = HairlineDark,
    moss600 = Moss600Dark,
    moss500 = Moss500Dark,
    moss100 = Moss100Dark,
    teal700 = Teal700Dark,
    gold400 = Gold400Dark,
    eventMedText = EventMedTextDark,
    eventMedBg = EventMedBgDark,
    eventLabText = EventLabTextDark,
    eventLabBg = EventLabBgDark,
    eventCondText = EventCondTextDark,
    eventCondBg = EventCondBgDark,
    eventEncText = EventEncTextDark,
    eventEncBg = EventEncBgDark,
    heroGradientStart = HeroGradientDarkStart,
    heroGradientMid = HeroGradientDarkMid,
    heroGradientEnd = HeroGradientDarkEnd
)

val LocalHealthSafeColors = staticCompositionLocalOf { LightExtendedColors }

private val LightColorScheme = lightColorScheme(
    primary = Moss600Light,
    onPrimary = PaperLight,
    primaryContainer = Moss100Light,
    onPrimaryContainer = Moss600Light,
    secondary = Teal700Light,
    onSecondary = CardLight,
    background = PaperLight,
    onBackground = InkLight,
    surface = CardLight,
    onSurface = InkLight,
    surfaceVariant = Paper2Light,
    onSurfaceVariant = InkSoftLight,
    outline = HairlineLight
)

private val DarkColorScheme = darkColorScheme(
    primary = Moss600Dark,
    onPrimary = PaperDark,
    primaryContainer = Moss100Dark,
    onPrimaryContainer = Moss600Dark,
    secondary = Teal700Dark,
    onSecondary = PaperDark,
    background = PaperDark,
    onBackground = InkDark,
    surface = CardDark,
    onSurface = InkDark,
    surfaceVariant = Paper2Dark,
    onSurfaceVariant = InkSoftDark,
    outline = HairlineDark
)

@Composable
fun HealthSafeTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val extendedColors = if (darkTheme) DarkExtendedColors else LightExtendedColors
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    CompositionLocalProvider(
        LocalHealthSafeColors provides extendedColors
    ) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = HealthSafeTypography,
            shapes = HealthSafeShapes,
            content = content
        )
    }
}

object HealthSafeTheme {
    val colors: HealthSafeExtendedColors
        @Composable
        @ReadOnlyComposable
        get() = LocalHealthSafeColors.current
}
