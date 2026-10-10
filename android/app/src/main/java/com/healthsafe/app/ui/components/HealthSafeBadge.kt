package com.healthsafe.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.healthsafe.app.ui.model.EventCategory
import com.healthsafe.app.ui.theme.HealthSafeTheme

/**
 * Eyebrow Pill with green indicator dot matching the web design system
 */
@Composable
fun EyebrowPill(
    text: String,
    modifier: Modifier = Modifier
) {
    val colors = HealthSafeTheme.colors
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .background(
                color = colors.paper2,
                shape = CircleShape
            )
            .border(
                width = 1.dp,
                color = colors.hairline,
                shape = CircleShape
            )
            .padding(horizontal = 12.dp, vertical = 4.dp)
    ) {
        Box(
            modifier = Modifier
                .size(6.dp)
                .background(colors.moss600, CircleShape)
        )
        Text(
            text = text.uppercase(),
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.2.sp,
            color = colors.inkSoft,
            modifier = Modifier.padding(start = 6.dp)
        )
    }
}

/**
 * Event Tag Badge with colors matching web event categories
 */
@Composable
fun EventBadge(
    category: EventCategory,
    customText: String? = null,
    modifier: Modifier = Modifier
) {
    val colors = HealthSafeTheme.colors
    val (bgColor, textColor, label) = when (category) {
        EventCategory.MEDICATION -> Triple(colors.eventMedBg, colors.eventMedText, "Prescription")
        EventCategory.LAB_RESULT -> Triple(colors.eventLabBg, colors.eventLabText, "Lab Result")
        EventCategory.CONDITION -> Triple(colors.eventCondBg, colors.eventCondText, "Condition")
        EventCategory.ENCOUNTER -> Triple(colors.eventEncBg, colors.eventEncText, "Hospital Visit")
        EventCategory.ALL -> Triple(colors.moss100, colors.moss600, "Record")
    }

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(bgColor)
            .padding(horizontal = 8.dp, vertical = 3.dp)
    ) {
        Text(
            text = customText ?: label,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            color = textColor
        )
    }
}
