package com.healthsafe.app.ui.theme

import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

val HealthSafeShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(20.dp),
    extraLarge = RoundedCornerShape(28.dp)
)

val PillShape = CircleShape
val CardShape = RoundedCornerShape(20.dp)
val HeroCardShape = RoundedCornerShape(28.dp)
val DialogShape = RoundedCornerShape(24.dp)
val ChipShape = RoundedCornerShape(9999.dp)
