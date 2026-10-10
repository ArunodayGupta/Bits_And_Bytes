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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.LocalPharmacy
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.MedicalServices
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.healthsafe.app.ui.components.EyebrowPill
import com.healthsafe.app.ui.components.HealthSafeLogo
import com.healthsafe.app.ui.model.SampleData
import com.healthsafe.app.ui.model.UserRole
import com.healthsafe.app.ui.theme.CardShape
import com.healthsafe.app.ui.theme.HealthSafeTheme

@Composable
fun LoginScreen(
    onLoginSuccess: (UserRole) -> Unit,
    onBackToLanding: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = HealthSafeTheme.colors
    val context = LocalContext.current

    var selectedTabIndex by remember { mutableIntStateOf(0) }
    val roles = listOf(UserRole.PATIENT, UserRole.DOCTOR, UserRole.PHYSICIAN, UserRole.ADMIN)

    // Patient Form State
    var abhaInput by remember { mutableStateOf("91-1234-5678-9012") }
    var hasConsented by remember { mutableStateOf(true) }
    var patientOtpStep by remember { mutableStateOf(false) }
    var otpCode by remember { mutableStateOf("482910") }
    var patientError by remember { mutableStateOf<String?>(null) }

    // Doctor Form State
    var doctorMci by remember { mutableStateOf("MCI-2018-98421") }
    var doctorName by remember { mutableStateOf("Dr. Rajesh Rao, MD") }
    var doctorHospital by remember { mutableStateOf("Apollo Hospitals") }

    // Physician Form State
    var pmbjpReg by remember { mutableStateOf("PMBJP-KEN-0428") }
    var dispensaryName by remember { mutableStateOf("Jan Aushadhi Kendra #0428") }

    // Admin State
    var adminKey by remember { mutableStateOf("HS-ADMIN-SECURE-8821") }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(colors.paper)
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        // Top Header
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 12.dp)
        ) {
            HealthSafeLogo(iconSize = 34.dp)

            TextButton(onClick = onBackToLanding) {
                Text(
                    text = "Walkthrough",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = colors.moss600
                )
            }
        }

        // Scrollable Body
        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            EyebrowPill(text = "Secure Portal Access")

            Column {
                Text(
                    text = "Welcome to HealthSafe",
                    fontFamily = FontFamily.Serif,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.ink
                )
                Text(
                    text = "Select your role to access encrypted health records and clinical services.",
                    fontSize = 14.sp,
                    color = colors.inkSoft,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }

            // Role Selector Tabs
            // Role Selection Tabs (Segmented bar layout to prevent tab clipping on mobile screens)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(colors.paper2)
                    .border(1.dp, colors.hairline, RoundedCornerShape(12.dp))
                    .padding(4.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                roles.forEachIndexed { index, role ->
                    val isSelected = selectedTabIndex == index
                    val tabLabel = when (role) {
                        UserRole.PATIENT -> "Patient"
                        UserRole.DOCTOR -> "Doctor"
                        UserRole.PHYSICIAN -> "Pharmacy"
                        UserRole.ADMIN -> "Admin"
                    }
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isSelected) colors.card else Color.Transparent)
                            .then(
                                if (isSelected) Modifier.border(1.dp, colors.moss600.copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                                else Modifier
                            )
                            .clickable { selectedTabIndex = index }
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = tabLabel,
                            fontSize = 12.sp,
                            maxLines = 1,
                            softWrap = false,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            color = if (isSelected) colors.moss600 else colors.inkSoft
                        )
                    }
                }
            }


            // TAB 1: PATIENT
            if (selectedTabIndex == 0) {
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
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Person,
                                contentDescription = null,
                                tint = colors.moss600,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = "Patient Login via ABHA ID",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.ink
                            )
                        }

                        Text(
                            text = "Access your digital records linked to your 14-digit Ayushman Bharat Health Account.",
                            fontSize = 13.sp,
                            color = colors.inkSoft
                        )

                        // ABHA ID Creation link banner (matches website LoginPage.tsx)
                        val uriHandler = LocalUriHandler.current
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(colors.moss100.copy(alpha = 0.5f))
                                .border(1.dp, colors.moss600.copy(alpha = 0.25f), RoundedCornerShape(12.dp))
                                .clickable { uriHandler.openUri("https://abha.abdm.gov.in/abha/v3/") }
                                .padding(horizontal = 12.dp, vertical = 10.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Info,
                                    contentDescription = null,
                                    tint = colors.moss600,
                                    modifier = Modifier.size(16.dp)
                                )
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Text(
                                        text = "Don't have an ABHA ID?",
                                        fontSize = 12.sp,
                                        color = colors.inkSoft
                                    )
                                    Text(
                                        text = "Create one here ↗",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = colors.moss600,
                                        textDecoration = TextDecoration.Underline
                                    )
                                }
                            }
                        }

                        // Demo Patient Quick Selection Chips
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(
                                text = "QUICK DEMO PATIENTS (TAP TO FILL):",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp,
                                color = colors.inkSoft
                            )
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                SampleData.demoPatients.forEach { demo ->
                                    val isSelected = abhaInput == demo.abhaId
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
                                                abhaInput = demo.abhaId
                                                patientError = null
                                            }
                                            .padding(horizontal = 12.dp, vertical = 6.dp)
                                    ) {
                                        Text(
                                            text = "${demo.fullName} (${demo.abhaId.takeLast(4)})",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = if (isSelected) colors.moss600 else colors.ink
                                        )
                                    }
                                }
                            }
                        }

                        // ABHA ID Input Field
                        OutlinedTextField(
                            value = abhaInput,
                            onValueChange = { input ->
                                patientError = null
                                val digits = input.filter { it.isDigit() }
                                val formatted = buildString {
                                    for (i in digits.indices) {
                                        if (i == 2 || i == 6 || i == 10) append('-')
                                        append(digits[i])
                                        if (length >= 17) break
                                    }
                                }
                                abhaInput = formatted
                            },
                            label = { Text("ABHA Health ID (14 digits)") },
                            placeholder = { Text("91-XXXX-XXXX-XXXX") },
                            leadingIcon = {
                                Icon(
                                    imageVector = Icons.Default.Shield,
                                    contentDescription = null,
                                    tint = colors.moss600
                                )
                            },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = colors.moss600,
                                unfocusedBorderColor = colors.hairline,
                                focusedLabelColor = colors.moss600
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )

                        // ABDM Consent Checkbox
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { hasConsented = !hasConsented }
                        ) {
                            Checkbox(
                                checked = hasConsented,
                                onCheckedChange = { hasConsented = it },
                                colors = CheckboxDefaults.colors(
                                    checkedColor = colors.moss600,
                                    checkmarkColor = colors.paper
                                )
                            )
                            Text(
                                text = "I grant permission to access my clinical records under Ayushman Bharat Digital Mission (ABDM) guidelines.",
                                fontSize = 12.sp,
                                lineHeight = 16.sp,
                                color = colors.inkSoft,
                                modifier = Modifier.padding(start = 4.dp)
                            )
                        }

                        // OTP Step (if requested)
                        AnimatedVisibility(visible = patientOtpStep) {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedTextField(
                                    value = otpCode,
                                    onValueChange = { otpCode = it.take(6) },
                                    label = { Text("Enter 6-Digit OTP") },
                                    placeholder = { Text("482910") },
                                    leadingIcon = {
                                        Icon(
                                            imageVector = Icons.Default.Key,
                                            contentDescription = null,
                                            tint = colors.moss600
                                        )
                                    },
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                    modifier = Modifier.fillMaxWidth()
                                )
                                Text(
                                    text = "Demo OTP sent to Aadhaar-linked mobile: 482910",
                                    fontSize = 11.sp,
                                    color = colors.moss600
                                )
                            }
                        }

                        if (patientError != null) {
                            Text(
                                text = patientError ?: "",
                                fontSize = 12.sp,
                                color = colors.eventLabText
                            )
                        }

                        // Action Button
                        Button(
                            onClick = {
                                if (!hasConsented) {
                                    patientError = "Please check ABDM consent to proceed."
                                    return@Button
                                }
                                if (abhaInput.length < 14) {
                                    patientError = "Please enter a valid 14-digit ABHA ID."
                                    return@Button
                                }

                                if (!patientOtpStep) {
                                    patientOtpStep = true
                                    Toast.makeText(context, "OTP Sent to registered mobile", Toast.LENGTH_SHORT).show()
                                } else {
                                    onLoginSuccess(UserRole.PATIENT)
                                }
                            },
                            shape = RoundedCornerShape(9999.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = colors.moss600,
                                contentColor = colors.paper
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .defaultMinSize(minHeight = 48.dp)
                        ) {
                            Text(
                                text = if (!patientOtpStep) "Verify & Send OTP" else "Complete Sign In",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }
            }

            // TAB 2: DOCTOR
            if (selectedTabIndex == 1) {
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
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.MedicalServices,
                                contentDescription = null,
                                tint = colors.teal700,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = "Doctor Clinical Portal",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.ink
                            )
                        }

                        Text(
                            text = "Licensed Medical Practitioner authentication via National Medical Commission (NMC).",
                            fontSize = 13.sp,
                            color = colors.inkSoft
                        )

                        OutlinedTextField(
                            value = doctorMci,
                            onValueChange = { doctorMci = it },
                            label = { Text("Medical Registration / NMC ID") },
                            leadingIcon = { Icon(Icons.Default.Shield, null, tint = colors.teal700) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )

                        OutlinedTextField(
                            value = doctorName,
                            onValueChange = { doctorName = it },
                            label = { Text("Doctor Full Name") },
                            leadingIcon = { Icon(Icons.Default.Person, null, tint = colors.teal700) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )

                        OutlinedTextField(
                            value = doctorHospital,
                            onValueChange = { doctorHospital = it },
                            label = { Text("Affiliated Hospital / Clinic") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )

                        Button(
                            onClick = { onLoginSuccess(UserRole.DOCTOR) },
                            shape = RoundedCornerShape(9999.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = colors.ink,
                                contentColor = colors.paper
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .defaultMinSize(minHeight = 48.dp)
                        ) {
                            Text(
                                text = "Enter Doctor Consultation Suite",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }
            }

            // TAB 3: PHYSICIAN / DISPENSARY
            if (selectedTabIndex == 2) {
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
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.LocalPharmacy,
                                contentDescription = null,
                                tint = colors.moss600,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = "Jan Aushadhi Dispensary Portal",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.ink
                            )
                        }

                        Text(
                            text = "Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP) verified pharmacy dispensary access.",
                            fontSize = 13.sp,
                            color = colors.inkSoft
                        )

                        OutlinedTextField(
                            value = pmbjpReg,
                            onValueChange = { pmbjpReg = it },
                            label = { Text("PMBJP Kendra License ID") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )

                        OutlinedTextField(
                            value = dispensaryName,
                            onValueChange = { dispensaryName = it },
                            label = { Text("Kendra Facility Name") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )

                        Button(
                            onClick = { onLoginSuccess(UserRole.PHYSICIAN) },
                            shape = RoundedCornerShape(9999.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = colors.moss600,
                                contentColor = colors.paper
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .defaultMinSize(minHeight = 48.dp)
                        ) {
                            Text(
                                text = "Open Jan Aushadhi Savings Engine",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }
            }

            // TAB 4: ADMIN
            if (selectedTabIndex == 3) {
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
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.AdminPanelSettings,
                                contentDescription = null,
                                tint = colors.gold400,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = "System Security Console",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.ink
                            )
                        }

                        Text(
                            text = "Platform auditing, provider identity verification, and role access telemetry.",
                            fontSize = 13.sp,
                            color = colors.inkSoft
                        )

                        OutlinedTextField(
                            value = adminKey,
                            onValueChange = { adminKey = it },
                            label = { Text("Security Officer Access Token") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )

                        Button(
                            onClick = { onLoginSuccess(UserRole.ADMIN) },
                            shape = RoundedCornerShape(9999.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = colors.ink,
                                contentColor = colors.paper
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .defaultMinSize(minHeight = 48.dp)
                        ) {
                            Text(
                                text = "Launch Security Console",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
