package com.healthsafe.app.ui.theme

import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color

// Light Theme Tokens (Matching web index.css :root)
val PaperLight = Color(0xFFFBF8F0)
val Paper2Light = Color(0xFFF4EFE2)
val CardLight = Color(0xFFFFFDF7)
val InkLight = Color(0xFF1D2A22)
val InkSoftLight = Color(0xFF55645A)
val HairlineLight = Color(0xFFE3DCCB)
val Moss600Light = Color(0xFF4F6B3A)
val Moss500Light = Color(0xFF6F8F4E)
val Moss100Light = Color(0xFFE4EBD6)
val Teal700Light = Color(0xFF1F5F5B)
val Gold400Light = Color(0xFFC9A24B)

// Light Event Colors
val EventMedTextLight = Color(0xFF3F6F9E)
val EventMedBgLight = Color(0xFFE6EEF6)
val EventLabTextLight = Color(0xFFB5473B)
val EventLabBgLight = Color(0xFFF7E6E2)
val EventCondTextLight = Color(0xFFA9741A)
val EventCondBgLight = Color(0xFFF8EDD2)
val EventEncTextLight = Color(0xFF5E665F)
val EventEncBgLight = Color(0xFFECE9DF)

// Dark Theme Tokens (Matching web index.css .dark)
val PaperDark = Color(0xFF141915)
val Paper2Dark = Color(0xFF1B221C)
val CardDark = Color(0xFF202820)
val InkDark = Color(0xFFF1EDE0)
val InkSoftDark = Color(0xFFAAB5A6)
val HairlineDark = Color(0xFF2F3A2F)
val Moss600Dark = Color(0xFF9DBB78)
val Moss500Dark = Color(0xFF89A968)
val Moss100Dark = Color(0xFF1E2B1E)
val Teal700Dark = Color(0xFF5FB3AA)
val Gold400Dark = Color(0xFFE0B95C)

// Dark Event Colors
val EventMedTextDark = Color(0xFF8DB6DC)
val EventMedBgDark = Color(0xFF1E2A36)
val EventLabTextDark = Color(0xFFE58B7F)
val EventLabBgDark = Color(0xFF34211E)
val EventCondTextDark = Color(0xFFE3B35A)
val EventCondBgDark = Color(0xFF332A15)
val EventEncTextDark = Color(0xFFB7BEB4)
val EventEncBgDark = Color(0xFF262B26)

// Hero Gradient Colors
val HeroGradientLightStart = Color(0xFF798968)
val HeroGradientLightMid = Color(0xFFC8C1AD)
val HeroGradientLightEnd = Color(0xFF667362)

// Dark Mode Hero Gradient Colors (specifically updated to resolve contrast)
val HeroGradientDarkStart = Color(0xFF17241B)
val HeroGradientDarkMid = Color(0xFF1B291F)
val HeroGradientDarkEnd = Color(0xFF141E17)

@Immutable
data class HealthSafeExtendedColors(
    val paper: Color,
    val paper2: Color,
    val card: Color,
    val ink: Color,
    val inkSoft: Color,
    val hairline: Color,
    val moss600: Color,
    val moss500: Color,
    val moss100: Color,
    val teal700: Color,
    val gold400: Color,
    // Events
    val eventMedText: Color,
    val eventMedBg: Color,
    val eventLabText: Color,
    val eventLabBg: Color,
    val eventCondText: Color,
    val eventCondBg: Color,
    val eventEncText: Color,
    val eventEncBg: Color,
    // Hero Gradient
    val heroGradientStart: Color,
    val heroGradientMid: Color,
    val heroGradientEnd: Color
)
