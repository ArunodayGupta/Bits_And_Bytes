package com.healthsafe.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.healthsafe.app.ui.theme.CardShape
import com.healthsafe.app.ui.theme.HealthSafeTheme

@Composable
fun StatCard(
    title: String,
    value: String,
    subtitle: String? = null,
    badgeText: String? = null,
    accentColor: Color? = null,
    modifier: Modifier = Modifier
) {
    val colors = HealthSafeTheme.colors
    val accent = accentColor ?: colors.moss600

    Box(
        modifier = modifier
            .clip(CardShape)
            .background(colors.card)
            .border(1.dp, colors.hairline, CardShape)
            .padding(14.dp)
    ) {
        Column {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = title.uppercase(),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                    color = colors.inkSoft,
                    modifier = Modifier.weight(1f)
                )
                if (badgeText != null) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(colors.moss100)
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = badgeText,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = colors.moss600
                        )
                    }
                }
            }

            Text(
                text = value,
                fontFamily = FontFamily.Serif,
                fontSize = 24.sp,
                fontWeight = FontWeight.Normal,
                color = colors.ink,
                modifier = Modifier.padding(top = 4.dp)
            )

            if (subtitle != null) {
                Text(
                    text = subtitle,
                    fontSize = 11.sp,
                    color = colors.inkSoft,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }
        }
    }
}
