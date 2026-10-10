package com.healthsafe.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.healthsafe.app.ui.theme.HealthSafeTheme

/**
 * HealthSafeLogo:
 * Clean, minimal, premium logo featuring a Safe Locker with integrated medical health cross
 * in Moss Green (#4F6B3A) and Gold (#C9A24B).
 */
@Composable
fun HealthSafeLogoIcon(
    size: Dp = 40.dp,
    modifier: Modifier = Modifier
) {
    val mossColor = HealthSafeTheme.colors.moss600
    val goldColor = HealthSafeTheme.colors.gold400
    val cardColor = HealthSafeTheme.colors.card
    val hairlineColor = HealthSafeTheme.colors.hairline
    val mossLightColor = HealthSafeTheme.colors.moss100

    Canvas(
        modifier = modifier.size(size)
    ) {
        val w = this.size.width
        val h = this.size.height

        // 1. Outer Vault / Locker Body (Solid rounded rectangular safe door)
        drawRoundRect(
            color = mossColor,
            topLeft = Offset(w * 0.08f, h * 0.08f),
            size = Size(w * 0.84f, h * 0.84f),
            cornerRadius = CornerRadius(w * 0.22f, h * 0.22f)
        )

        // 2. Safe Door Inset (Beveled inner chamber)
        drawRoundRect(
            color = mossLightColor,
            topLeft = Offset(w * 0.16f, h * 0.16f),
            size = Size(w * 0.68f, h * 0.68f),
            cornerRadius = CornerRadius(w * 0.14f, h * 0.14f)
        )

        // 3. Vault Door Hinges (Left side rivets)
        drawRoundRect(
            color = mossColor,
            topLeft = Offset(w * 0.10f, h * 0.26f),
            size = Size(w * 0.06f, h * 0.14f),
            cornerRadius = CornerRadius(w * 0.02f, h * 0.02f)
        )
        drawRoundRect(
            color = mossColor,
            topLeft = Offset(w * 0.10f, h * 0.60f),
            size = Size(w * 0.06f, h * 0.14f),
            cornerRadius = CornerRadius(w * 0.02f, h * 0.02f)
        )

        // 4. Circular Combination Vault Dial
        val dialCenter = Offset(w * 0.52f, h * 0.50f)
        val dialRadius = w * 0.25f

        // Outer dial rim
        drawCircle(
            color = mossColor,
            radius = dialRadius,
            center = dialCenter
        )

        // Inner dial face
        drawCircle(
            color = cardColor,
            radius = dialRadius * 0.82f,
            center = dialCenter
        )

        // 5. Medical Health Cross at the center of the safe locker dial
        val crossThickness = w * 0.09f
        val crossHalfLen = w * 0.12f

        // Horizontal bar of health cross
        drawRoundRect(
            color = mossColor,
            topLeft = Offset(dialCenter.x - crossHalfLen, dialCenter.y - crossThickness / 2f),
            size = Size(crossHalfLen * 2f, crossThickness),
            cornerRadius = CornerRadius(crossThickness * 0.3f, crossThickness * 0.3f)
        )

        // Vertical bar of health cross
        drawRoundRect(
            color = mossColor,
            topLeft = Offset(dialCenter.x - crossThickness / 2f, dialCenter.y - crossHalfLen),
            size = Size(crossThickness, crossHalfLen * 2f),
            cornerRadius = CornerRadius(crossThickness * 0.3f, crossThickness * 0.3f)
        )

        // 6. Safe Locker Combination Tick Marks & Gold Locking Bolt
        drawLine(
            color = goldColor,
            start = Offset(dialCenter.x, dialCenter.y - dialRadius * 0.80f),
            end = Offset(dialCenter.x, dialCenter.y - dialRadius * 0.55f),
            strokeWidth = w * 0.035f,
            cap = StrokeCap.Round
        )
        drawLine(
            color = goldColor,
            start = Offset(dialCenter.x + dialRadius * 0.55f, dialCenter.y),
            end = Offset(dialCenter.x + dialRadius * 0.80f, dialCenter.y),
            strokeWidth = w * 0.035f,
            cap = StrokeCap.Round
        )

        // Safe door bolt mechanism handle on right edge
        drawRoundRect(
            color = goldColor,
            topLeft = Offset(w * 0.78f, h * 0.46f),
            size = Size(w * 0.08f, h * 0.08f),
            cornerRadius = CornerRadius(w * 0.02f, h * 0.02f)
        )
    }
}

/**
 * Full HealthSafe Logo with Brand Typography
 */
@Composable
fun HealthSafeLogo(
    iconSize: Dp = 36.dp,
    showTagline: Boolean = false,
    modifier: Modifier = Modifier
) {
    val colors = HealthSafeTheme.colors

    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        modifier = modifier
    ) {
        HealthSafeLogoIcon(size = iconSize)

        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "Health",
                    fontFamily = FontFamily.Serif,
                    fontSize = (iconSize.value * 0.58).sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.ink,
                    letterSpacing = (-0.5).sp
                )
                Text(
                    text = "Safe",
                    fontFamily = FontFamily.Serif,
                    fontSize = (iconSize.value * 0.58).sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.moss600,
                    letterSpacing = (-0.5).sp
                )
                Box(
                    modifier = Modifier
                        .padding(start = 6.dp)
                        .background(
                            color = colors.moss100,
                            shape = RoundedCornerShape(6.dp)
                        )
                        .padding(horizontal = 5.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "ABDM",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.moss600,
                        letterSpacing = 0.5.sp
                    )
                }
            }
            if (showTagline) {
                Text(
                    text = "Your health records, in one place",
                    fontSize = 11.sp,
                    color = colors.inkSoft,
                    letterSpacing = 0.2.sp
                )
            }
        }
    }
}
