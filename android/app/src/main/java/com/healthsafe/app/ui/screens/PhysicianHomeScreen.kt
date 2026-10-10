package com.healthsafe.app.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.LocalPharmacy
import androidx.compose.material.icons.filled.Savings
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.healthsafe.app.ui.components.HealthSafeTopBar
import com.healthsafe.app.ui.components.StatCard
import com.healthsafe.app.ui.model.GenericMedicineSubstitute
import com.healthsafe.app.ui.model.SampleData
import com.healthsafe.app.ui.model.UserRole
import com.healthsafe.app.ui.theme.CardShape
import com.healthsafe.app.ui.theme.HealthSafeTheme

@Composable
fun PhysicianHomeScreen(
    isDarkTheme: Boolean,
    onToggleTheme: () -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = HealthSafeTheme.colors
    val context = LocalContext.current

    var searchQuery by remember { mutableStateOf("") }
    var allSubstitutes by remember { mutableStateOf(SampleData.genericSubstitutes) }

    val filteredList = remember(searchQuery, allSubstitutes) {
        if (searchQuery.isBlank()) {
            allSubstitutes
        } else {
            allSubstitutes.filter {
                it.brandedName.contains(searchQuery, ignoreCase = true) ||
                        it.genericName.contains(searchQuery, ignoreCase = true)
            }
        }
    }

    Scaffold(
        topBar = {
            HealthSafeTopBar(
                currentRole = UserRole.PHYSICIAN,
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
            // JAN AUSHADHI KENDRA BANNER
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
                                imageVector = Icons.Default.LocalPharmacy,
                                contentDescription = null,
                                tint = colors.moss600,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = "Jan Aushadhi Kendra",
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
                                        text = "PMBJP Kendra #0428",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = colors.moss600
                                    )
                                }
                            }
                            Text(
                                text = "Pradhan Mantri Bhartiya Janaushadhi Generic Medicine Savings Portal",
                                fontSize = 12.sp,
                                color = colors.inkSoft,
                                modifier = Modifier.padding(top = 2.dp)
                            )
                        }
                    }
                }
            }

            // MONTHLY SAVINGS SUMMARY ROW
            item {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    StatCard(
                        title = "Avg. Savings",
                        value = "79%",
                        subtitle = "Govt. bioequivalent",
                        badgeText = "PMBJP",
                        modifier = Modifier.weight(1f)
                    )
                    StatCard(
                        title = "Patient Saving",
                        value = "₹1,240/mo",
                        subtitle = "₹14,880 annually",
                        badgeText = "Verified",
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // SEARCH BAR
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "GENERIC EQUIVALENTS DATABASE",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp,
                        color = colors.inkSoft
                    )

                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        placeholder = { Text("Search branded medicine (e.g. Augmentin, Glycomet, Telma)...") },
                        leadingIcon = {
                            Icon(Icons.Default.Search, null, tint = colors.moss600)
                        },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            // MEDICINE SUBSTITUTION CARDS
            items(filteredList, key = { it.id }) { med ->
                val savedRupees = med.brandedPrice - med.genericPrice

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(CardShape)
                        .background(colors.card)
                        .border(1.dp, colors.hairline, CardShape)
                        .padding(16.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = med.brandedName,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.ink
                                )
                                Text(
                                    text = med.genericName,
                                    fontSize = 12.sp,
                                    color = colors.inkSoft,
                                    modifier = Modifier.padding(top = 2.dp)
                                )
                            }

                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(9999.dp))
                                    .background(colors.moss100)
                                    .padding(horizontal = 10.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    text = "SAVE ${med.savingsPercent}%",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.moss600
                                )
                            }
                        }

                        // Price comparison box
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(colors.paper2)
                                .border(1.dp, colors.hairline, RoundedCornerShape(10.dp))
                                .padding(12.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column {
                                    Text(
                                        text = "BRANDED MRP",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = colors.inkSoft
                                    )
                                    Text(
                                        text = "₹${"%.2f".format(med.brandedPrice)}",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Medium,
                                        textDecoration = TextDecoration.LineThrough,
                                        color = colors.inkSoft
                                    )
                                }

                                Column {
                                    Text(
                                        text = "JAN AUSHADHI PRICE",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = colors.moss600
                                    )
                                    Text(
                                        text = "₹${"%.2f".format(med.genericPrice)}",
                                        fontFamily = FontFamily.Serif,
                                        fontSize = 18.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = colors.moss600
                                    )
                                }

                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        text = "YOU SAVE",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = colors.inkSoft
                                    )
                                    Text(
                                        text = "₹${"%.2f".format(savedRupees)}",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = colors.ink
                                    )
                                }
                            }
                        }

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = "Form: ${med.dosageForm} · Govt Approved",
                                fontSize = 11.sp,
                                color = colors.inkSoft
                            )

                            Button(
                                onClick = {
                                    Toast.makeText(
                                        context,
                                        "Substituted ${med.genericName} for dispensing",
                                        Toast.LENGTH_SHORT
                                    ).show()
                                },
                                shape = RoundedCornerShape(9999.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = colors.moss600,
                                    contentColor = colors.paper
                                )
                            ) {
                                Text(
                                    text = "Dispense Generic",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
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
