package com.healthsafe.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.healthsafe.app.ui.model.CareGap
import com.healthsafe.app.ui.theme.HealthSafeTheme

@Composable
fun CareGapBanner(
    gap: CareGap,
    onActionClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val colors = HealthSafeTheme.colors
    val bannerBg = if (gap.isUrgent) colors.eventLabBg else colors.eventCondBg
    val bannerText = if (gap.isUrgent) colors.eventLabText else colors.eventCondText

    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(bannerBg)
            .border(1.dp, bannerText.copy(alpha = 0.25f), RoundedCornerShape(16.dp))
            .padding(14.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(24.dp)
                        .clip(CircleShape)
                        .background(bannerText.copy(alpha = 0.15f))
                ) {
                    Icon(
                        imageVector = Icons.Default.WarningAmber,
                        contentDescription = "Alert",
                        tint = bannerText,
                        modifier = Modifier.size(15.dp)
                    )
                }
                Text(
                    text = if (gap.isUrgent) "RECOMMENDED CARE GAP" else "PREVENTIVE REMINDER",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                    color = bannerText
                )
            }

            Text(
                text = gap.title,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = colors.ink
            )

            Text(
                text = gap.recommendation,
                fontSize = 12.sp,
                lineHeight = 16.sp,
                color = colors.inkSoft
            )

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.End,
                modifier = Modifier.fillMaxWidth()
            ) {
                Button(
                    onClick = onActionClick,
                    shape = RoundedCornerShape(9999.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = bannerText,
                        contentColor = colors.paper
                    ),
                    modifier = Modifier.padding(top = 4.dp)
                ) {
                    Text(
                        text = gap.actionText,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                        contentDescription = null,
                        modifier = Modifier
                            .padding(start = 4.dp)
                            .size(14.dp)
                    )
                }
            }
        }
    }
}
