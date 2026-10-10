package com.healthsafe.app.ui.screens

import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.MedicalServices
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.healthsafe.app.ui.components.HealthSafeTopBar
import com.healthsafe.app.ui.model.PatientProfile
import com.healthsafe.app.ui.model.PrescriptionItem
import com.healthsafe.app.ui.model.SampleData
import com.healthsafe.app.ui.model.UserRole
import com.healthsafe.app.ui.theme.CardShape
import com.healthsafe.app.ui.theme.HealthSafeTheme
import java.security.SecureRandom

// Generates unguessable, cryptographically secure speakable Rx code (RX-XXXX-XXXX)
private fun generateSecureRxCode(): String {
    val charPool = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ" // avoids ambiguous chars (0/O, 1/I)
    val random = SecureRandom()
    val part1 = (1..4).map { charPool[random.nextInt(charPool.length)] }.joinToString("")
    val part2 = (1..4).map { charPool[random.nextInt(charPool.length)] }.joinToString("")
    return "RX-$part1-$part2"
}

@Composable
fun DoctorHomeScreen(
    isDarkTheme: Boolean,
    onToggleTheme: () -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = HealthSafeTheme.colors
    val context = LocalContext.current

    var searchCodeInput by remember { mutableStateOf("RX-7F3A-9K2M") }
    var loadedPatient by remember { mutableStateOf<PatientProfile?>(SampleData.demoPatients[0]) }
    var searchError by remember { mutableStateOf<String?>(null) }

    // Prescription form state
    var diagnosisInput by remember { mutableStateOf("Type 2 Diabetes Mellitus - Review & Maintenance") }
    var newDrugName by remember { mutableStateOf("Empagliflozin") }
    var newDrugDosage by remember { mutableStateOf("10 mg") }
    var newDrugFreq by remember { mutableStateOf("Once daily (Morning)") }
    var newDrugDuration by remember { mutableStateOf("30 Days") }

    val prescriptionItems = remember {
        mutableStateListOf(
            PrescriptionItem(
                drugName = "Metformin Hydrochloride",
                dosage = "500 mg",
                frequency = "Twice daily",
                duration = "30 Days",
                instructions = "After meals"
            ),
            PrescriptionItem(
                drugName = "Atorvastatin Calcium",
                dosage = "10 mg",
                frequency = "Once daily",
                duration = "30 Days",
                instructions = "At bedtime"
            )
        )
    }

    var generatedRxCode by remember { mutableStateOf(generateSecureRxCode()) }
    var isPrescriptionIssued by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            HealthSafeTopBar(
                currentRole = UserRole.DOCTOR,
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // DOCTOR CREDENTIALS HERO CARD
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
                            imageVector = Icons.Default.MedicalServices,
                            contentDescription = null,
                            tint = colors.moss600,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = "Dr. Rajesh Rao, MD",
                                fontFamily = FontFamily.Serif,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.ink,
                                modifier = Modifier.weight(1f, fill = false)
                            )
                            Box(
                                modifier = Modifier
                                    .padding(start = 8.dp)
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(colors.moss100)
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = "NMC Verified",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    softWrap = false,
                                    maxLines = 1,
                                    color = colors.moss600
                                )
                            }
                        }
                        Text(
                            text = "Senior Physician · Apollo Hospitals · Reg: MCI-2018-98421",
                            fontSize = 12.sp,
                            color = colors.inkSoft,
                            modifier = Modifier.padding(top = 2.dp)
                        )
                    }
                }
            }

            // PATIENT LOOKUP SECTION
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(CardShape)
                    .background(colors.card)
                    .border(1.dp, colors.hairline, CardShape)
                    .padding(18.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "PATIENT EHR LOOKUP",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp,
                        color = colors.inkSoft
                    )

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        OutlinedTextField(
                            value = searchCodeInput,
                            onValueChange = {
                                searchCodeInput = it
                                searchError = null
                            },
                            placeholder = { Text("Enter Rx Code (RX-XXXX-XXXX) or ABHA") },
                            leadingIcon = {
                                Icon(Icons.Default.Search, null, tint = colors.moss600)
                            },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )

                        Button(
                            onClick = {
                                val match = SampleData.demoPatients.find {
                                    it.activeRxCode.equals(searchCodeInput.trim(), ignoreCase = true) ||
                                            it.abhaId.contains(searchCodeInput.trim())
                                }
                                if (match != null) {
                                    loadedPatient = match
                                    Toast.makeText(context, "Loaded records for ${match.fullName}", Toast.LENGTH_SHORT).show()
                                } else {
                                    searchError = "No matching patient or active prescription found for this code."
                                }
                            },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = colors.moss600,
                                contentColor = colors.paper
                            ),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Find", fontWeight = FontWeight.Bold)
                        }
                    }

                    if (searchError != null) {
                        Text(
                            text = searchError ?: "",
                            fontSize = 12.sp,
                            color = colors.eventLabText
                        )
                    }

                    // Demo quick buttons with horizontal scroll and clean pills
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "Try Demo:",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = colors.inkSoft
                        )
                        SampleData.demoPatients.forEach { pat ->
                            val isSelected = loadedPatient?.abhaId == pat.abhaId
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(9999.dp))
                                    .background(if (isSelected) colors.moss100 else colors.paper2)
                                    .border(
                                        1.dp,
                                        if (isSelected) colors.moss600 else colors.hairline,
                                        RoundedCornerShape(9999.dp)
                                    )
                                    .clickable {
                                        searchCodeInput = pat.activeRxCode
                                        loadedPatient = pat
                                        searchError = null
                                    }
                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Text(
                                    text = pat.fullName,
                                    fontSize = 11.sp,
                                    color = if (isSelected) colors.moss600 else colors.ink,
                                    fontWeight = FontWeight.SemiBold,
                                    softWrap = false,
                                    maxLines = 1
                                )
                            }
                        }
                    }
                }
            }

            // PATIENT SUMMARY CARD (IF LOADED)
            if (loadedPatient != null) {
                val patient = loadedPatient!!

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(CardShape)
                        .background(colors.paper2)
                        .border(1.dp, colors.hairline, CardShape)
                        .padding(16.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(
                                modifier = Modifier
                                    .weight(1f)
                                    .padding(end = 8.dp)
                            ) {
                                Text(
                                    text = patient.fullName,
                                    fontFamily = FontFamily.Serif,
                                    fontSize = 19.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.ink,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    text = "ABHA: ${patient.abhaId} · Age: ${patient.age} · Blood: ${patient.bloodGroup}",
                                    fontSize = 12.sp,
                                    color = colors.inkSoft,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(colors.moss100)
                                    .padding(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    text = "Consent Verified",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    softWrap = false,
                                    maxLines = 1,
                                    color = colors.moss600
                                )
                            }
                        }

                        // Clinical summary tags
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .horizontalScroll(rememberScrollState())
                        ) {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(colors.eventLabBg)
                                    .padding(horizontal = 8.dp, vertical = 3.dp)
                            ) {
                                Text(
                                    text = "HbA1c: 6.8%",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    softWrap = false,
                                    maxLines = 1,
                                    color = colors.eventLabText
                                )
                            }
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(colors.eventCondBg)
                                    .padding(horizontal = 8.dp, vertical = 3.dp)
                            ) {
                                Text(
                                    text = "Type 2 Diabetes",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    softWrap = false,
                                    maxLines = 1,
                                    color = colors.eventCondText
                                )
                            }
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(colors.eventMedBg)
                                    .padding(horizontal = 8.dp, vertical = 3.dp)
                            ) {
                                Text(
                                    text = "Metformin 500mg",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    softWrap = false,
                                    maxLines = 1,
                                    color = colors.eventMedText
                                )
                            }
                        }
                    }
                }
            }

            // ELECTRONIC PRESCRIPTION GENERATOR
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(CardShape)
                    .background(colors.card)
                    .border(1.dp, colors.hairline, CardShape)
                    .padding(18.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "ELECTRONIC PRESCRIPTION WRITER",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp,
                            color = colors.inkSoft,
                            modifier = Modifier
                                .weight(1f)
                                .padding(end = 8.dp)
                        )
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(colors.moss100)
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = "Unguessable Code",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                softWrap = false,
                                maxLines = 1,
                                color = colors.moss600
                            )
                        }
                    }

                    OutlinedTextField(
                        value = diagnosisInput,
                        onValueChange = { diagnosisInput = it },
                        label = { Text("Clinical Assessment / Diagnosis") },
                        singleLine = false,
                        maxLines = 3,
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Current Medications in Prescription
                    Text(
                        text = "Prescribed Medications (${prescriptionItems.size}):",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.ink
                    )

                    prescriptionItems.forEachIndexed { index, item ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(colors.paper2)
                                .padding(horizontal = 12.dp, vertical = 8.dp)
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "${item.drugName} · ${item.dosage}",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.ink
                                )
                                Text(
                                    text = "${item.frequency} · ${item.duration} · ${item.instructions}",
                                    fontSize = 11.sp,
                                    color = colors.inkSoft
                                )
                            }
                            IconButton(
                                onClick = { prescriptionItems.removeAt(index) },
                                modifier = Modifier.size(28.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Delete,
                                    contentDescription = "Remove item",
                                    tint = colors.eventLabText,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    }

                    // Add Medication Row
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        OutlinedTextField(
                            value = newDrugName,
                            onValueChange = { newDrugName = it },
                            placeholder = { Text("Drug name (e.g. Empagliflozin)") },
                            singleLine = true,
                            modifier = Modifier.weight(1.2f)
                        )
                        OutlinedTextField(
                            value = newDrugDosage,
                            onValueChange = { newDrugDosage = it },
                            placeholder = { Text("Dosage (10mg)") },
                            singleLine = true,
                            modifier = Modifier.weight(0.8f)
                        )
                    }

                    Row(
                        horizontalArrangement = Arrangement.End,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Button(
                            onClick = {
                                if (newDrugName.isNotBlank()) {
                                    prescriptionItems.add(
                                        PrescriptionItem(
                                            drugName = newDrugName,
                                            dosage = newDrugDosage,
                                            frequency = newDrugFreq,
                                            duration = newDrugDuration
                                        )
                                    )
                                    newDrugName = ""
                                    newDrugDosage = ""
                                }
                            },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = colors.paper2,
                                contentColor = colors.moss600
                            ),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Icon(Icons.Default.Add, null, modifier = Modifier.size(16.dp))
                            Text(
                                text = "Add Medicine",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(start = 4.dp)
                            )
                        }
                    }

                    // Generated Unique Code Banner
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
                            Column(
                                modifier = Modifier
                                    .weight(1f)
                                    .padding(end = 8.dp)
                            ) {
                                Text(
                                    text = "Generated Speakable Prescription Code",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.inkSoft
                                )
                                Text(
                                    text = generatedRxCode,
                                    fontFamily = FontFamily.Monospace,
                                    fontSize = 17.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.moss600
                                )
                            }

                            Button(
                                onClick = { generatedRxCode = generateSecureRxCode() },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = colors.moss100,
                                    contentColor = colors.moss600
                                ),
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                modifier = Modifier.defaultMinSize(minWidth = 1.dp, minHeight = 32.dp)
                            ) {
                                Text(
                                    text = "Regenerate",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    softWrap = false,
                                    maxLines = 1
                                )
                            }
                        }
                    }

                    // Issue Prescription Action
                    Button(
                        onClick = {
                            isPrescriptionIssued = true
                            Toast.makeText(context, "Electronic Prescription $generatedRxCode Issued", Toast.LENGTH_LONG).show()
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = colors.moss600,
                            contentColor = colors.paper
                        ),
                        shape = RoundedCornerShape(9999.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .defaultMinSize(minHeight = 48.dp)
                    ) {
                        Text(
                            text = "Issue Digital Prescription & Sync with ABHA",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                    }

                    AnimatedVisibility(visible = isPrescriptionIssued) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(colors.moss100)
                                .padding(12.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = colors.moss600,
                                    modifier = Modifier.size(20.dp)
                                )
                                Column {
                                    Text(
                                        text = "Prescription $generatedRxCode Issued",
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = colors.moss600
                                    )
                                    Text(
                                        text = "Tamper-proof verifiable token stored on HealthSafe network.",
                                        fontSize = 11.sp,
                                        color = colors.inkSoft
                                    )
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(30.dp))
        }
    }
}
