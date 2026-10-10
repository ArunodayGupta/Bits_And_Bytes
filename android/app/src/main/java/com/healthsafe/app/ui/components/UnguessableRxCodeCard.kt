package com.healthsafe.app.ui.components

import android.widget.Toast
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
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.healthsafe.app.ui.theme.CardShape
import com.healthsafe.app.ui.theme.HealthSafeTheme

/**
 * UnguessableRxCodeCard:
 * Displays the cryptographic, speakable Rx share code (e.g., RX-7F3A-9K2M)
 * that allows doctors to securely access records without exposing personal identifiers.
 */
@Composable
fun UnguessableRxCodeCard(
    rxCode: String,
    patientName: String,
    modifier: Modifier = Modifier
) {
    val colors = HealthSafeTheme.colors
    val clipboardManager = LocalClipboardManager.current
    val context = LocalContext.current
    var isCopied by remember { mutableStateOf(false) }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(CardShape)
            .background(colors.card)
            .border(1.dp, colors.hairline, CardShape)
            .padding(16.dp)
    ) {
        Column(
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(colors.moss100)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = "Encrypted Vault Share",
                            tint = colors.moss600,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    Column {
                        Text(
                            text = "DOCTOR ACCESS TOKEN",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp,
                            color = colors.inkSoft
                        )
                        Text(
                            text = "Speakable Prescription Code",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = colors.ink
                        )
                    }
                }

                // Privacy Shield indicator
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(colors.paper2)
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "Zero-Knowledge",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = colors.moss600
                    )
                }
            }

            // Big speakable code banner
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(colors.paper2)
                    .border(1.dp, colors.hairline, RoundedCornerShape(12.dp))
                    .padding(horizontal = 14.dp, vertical = 12.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = rxCode,
                        fontFamily = FontFamily.Monospace,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 2.sp,
                        color = colors.moss600
                    )

                    IconButton(
                        onClick = {
                            clipboardManager.setText(AnnotatedString(rxCode))
                            isCopied = true
                            Toast.makeText(context, "Copied $rxCode to clipboard", Toast.LENGTH_SHORT).show()
                        },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.ContentCopy,
                            contentDescription = "Copy Rx Code",
                            tint = colors.inkSoft,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }

            Text(
                text = "Share this temporary 8-character code with your doctor or dispensary to grant instant secure consultation access without sharing raw passwords.",
                fontSize = 12.sp,
                lineHeight = 16.sp,
                color = colors.inkSoft
            )
        }
    }
}
