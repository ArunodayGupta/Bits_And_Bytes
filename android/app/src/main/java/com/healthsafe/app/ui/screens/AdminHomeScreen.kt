package com.healthsafe.app.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.healthsafe.app.ui.components.HealthSafeTopBar
import com.healthsafe.app.ui.components.StatCard
import com.healthsafe.app.ui.model.SampleData
import com.healthsafe.app.ui.model.UserRole
import com.healthsafe.app.ui.theme.CardShape
import com.healthsafe.app.ui.theme.HealthSafeTheme

@Composable
fun AdminHomeScreen(
    isDarkTheme: Boolean,
    onToggleTheme: () -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = HealthSafeTheme.colors
    val context = LocalContext.current
    val auditLogs = SampleData.auditLogs

    Scaffold(
        topBar = {
            HealthSafeTopBar(
                currentRole = UserRole.ADMIN,
                isDarkTheme = isDarkTheme,
                onToggleTheme = onToggleTheme,
                onLogout = onLogout
            )
        },
        containerColor = colors.paper,
        modifier = modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding()
    ) { innerPadding ->
        LazyColumn(
            contentPadding = innerPadding,
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            // ADMIN HERO BANNER
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(CardShape)
                        .background(colors.card)
                        .border(1.dp, colors.hairline, CardShape)
                        .padding(18.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .size(44.dp)
                                .clip(CircleShape)
                                .background(colors.moss100)
                        ) {
                            Icon(
                                imageVector = Icons.Default.AdminPanelSettings,
                                contentDescription = null,
                                tint = colors.moss600,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = "System Security Console",
                                    fontFamily = FontFamily.Serif,
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.ink
                                )
                                Box(
                                    modifier = Modifier
                                        .padding(start = 6.dp)
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(colors.moss100)
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Text(
                                        text = "Root Isolation",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = colors.moss600
                                    )
                                }
                            }
                            Text(
                                text = "ABDM Gateway · Zero-Knowledge Cryptographic Auditing",
                                fontSize = 12.sp,
                                color = colors.inkSoft,
                                modifier = Modifier.padding(top = 2.dp)
                            )
                        }
                    }
                }
            }

            // TELEMETRY METRIC CARDS
            item {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    StatCard(
                        title = "Uptime SLA",
                        value = "99.98%",
                        subtitle = "Gateway operational",
                        badgeText = "Healthy",
                        modifier = Modifier.weight(1f)
                    )
                    StatCard(
                        title = "Active Tokens",
                        value = "1,492",
                        subtitle = "Doctor sessions",
                        badgeText = "Live",
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            item {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    StatCard(
                        title = "ABHA Records",
                        value = "284.1k",
                        subtitle = "Encrypted in locker",
                        badgeText = "Encrypted",
                        modifier = Modifier.weight(1f)
                    )
                    StatCard(
                        title = "Audit Hashes",
                        value = "100%",
                        subtitle = "Tamper validation",
                        badgeText = "SHA-256",
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // AUDIT TRAIL HEADER
            item {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "TAMPER-PROOF AUDIT TRAIL",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp,
                        color = colors.inkSoft
                    )

                    IconButton(
                        onClick = {
                            Toast.makeText(context, "Audit logs verified & refreshed", Toast.LENGTH_SHORT).show()
                        },
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Refresh",
                            tint = colors.moss600,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }

            // AUDIT LOG ITEMS
            items(auditLogs, key = { it.id }) { log ->
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(CardShape)
                        .background(colors.card)
                        .border(1.dp, colors.hairline, CardShape)
                        .padding(14.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = log.action,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.ink
                            )
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(colors.moss100)
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = log.role,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.moss600
                                )
                            }
                        }

                        Text(
                            text = "Actor: ${log.actor}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = colors.inkSoft
                        )

                        Text(
                            text = "Target: ${log.targetRecord}",
                            fontSize = 12.sp,
                            color = colors.inkSoft
                        )

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = log.timestamp,
                                fontSize = 10.sp,
                                color = colors.inkSoft
                            )

                            Text(
                                text = log.verificationHash,
                                fontFamily = FontFamily.Monospace,
                                fontSize = 10.sp,
                                color = colors.moss600
                            )
                        }
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(30.dp))
            }
        }
    }
}
