package com.healthsafe.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.healthsafe.app.ui.model.UserRole
import com.healthsafe.app.ui.theme.HealthSafeTheme

@Composable
fun HealthSafeTopBar(
    currentRole: UserRole?,
    isDarkTheme: Boolean,
    onToggleTheme: () -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = HealthSafeTheme.colors

    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
        modifier = modifier
            .fillMaxWidth()
            .background(colors.card)
            .border(width = 1.dp, color = colors.hairline)
            .padding(horizontal = 14.dp, vertical = 10.dp)
    ) {
        // Left: Clean Brand Logo
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            HealthSafeLogoIcon(size = 30.dp)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "Health",
                    fontFamily = FontFamily.Serif,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.ink,
                    letterSpacing = (-0.5).sp
                )
                Text(
                    text = "Safe",
                    fontFamily = FontFamily.Serif,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.moss600,
                    letterSpacing = (-0.5).sp
                )
            }
        }

        // Right: Role chip + Theme toggle + Logout (properly spaced, non-overlapping)
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            if (currentRole != null) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(9999.dp))
                        .background(colors.moss100)
                        .border(1.dp, colors.moss600.copy(alpha = 0.35f), RoundedCornerShape(9999.dp))
                        .padding(horizontal = 9.dp, vertical = 5.dp)
                ) {
                    Text(
                        text = currentRole.label.split(" ")[0],
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.moss600,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            // Theme toggle: dedicated 38dp circular button with vivid high-contrast icon
            Box(
                modifier = Modifier
                    .size(38.dp)
                    .clip(CircleShape)
                    .background(if (isDarkTheme) Color(0xFF263228) else Color(0xFFFFFFFF))
                    .border(
                        width = 1.dp,
                        color = if (isDarkTheme) Color(0xFF435A46) else Color(0xFFD6DEC9),
                        shape = CircleShape
                    )
                    .clickable(onClick = onToggleTheme),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = if (isDarkTheme) Icons.Default.LightMode else Icons.Default.DarkMode,
                    contentDescription = if (isDarkTheme) "Switch to Light Mode" else "Switch to Dark Mode",
                    tint = if (isDarkTheme) Color(0xFFFBBF24) else Color(0xFF1E293B),
                    modifier = Modifier.size(20.dp)
                )
            }

            // Logout button: dedicated 38dp circular button with vivid high-contrast red accent
            if (currentRole != null) {
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .background(if (isDarkTheme) Color(0xFF381F1F) else Color(0xFFFEE2E2))
                        .border(
                            width = 1.dp,
                            color = if (isDarkTheme) Color(0xFF6E3232) else Color(0xFFFCA5A5),
                            shape = CircleShape
                        )
                        .clickable(onClick = onLogout),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.Logout,
                        contentDescription = "Sign Out",
                        tint = if (isDarkTheme) Color(0xFFF87171) else Color(0xFFDC2626),
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}
