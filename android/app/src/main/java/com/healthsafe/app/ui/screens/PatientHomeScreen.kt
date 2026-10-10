package com.healthsafe.app.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DocumentScanner
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.healthsafe.app.ui.components.CareGapBanner
import com.healthsafe.app.ui.components.EventBadge
import com.healthsafe.app.ui.components.HealthSafeTopBar
import com.healthsafe.app.ui.components.StatCard
import com.healthsafe.app.ui.components.UnguessableRxCodeCard
import com.healthsafe.app.ui.model.EventCategory
import com.healthsafe.app.ui.model.HealthEvent
import com.healthsafe.app.ui.model.SampleData
import com.healthsafe.app.ui.model.UserRole
import com.healthsafe.app.ui.theme.CardShape
import com.healthsafe.app.ui.theme.HeroCardShape
import com.healthsafe.app.ui.theme.HealthSafeTheme

@Composable
fun PatientHomeScreen(
    isDarkTheme: Boolean,
    onToggleTheme: () -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = HealthSafeTheme.colors
    val context = LocalContext.current
    val patient = SampleData.demoPatients[0] // Ramesh Kumar

    var selectedCategory by remember { mutableStateOf(EventCategory.ALL) }
    var timelineEvents by remember { mutableStateOf(SampleData.patientTimelineEvents) }
    var expandedEventId by remember { mutableStateOf<String?>(null) }

    // Scan & Camera State
    var showScanDialog by remember { mutableStateOf(false) }
    var isOcrScanning by remember { mutableStateOf(false) }
    var scannedResult by remember { mutableStateOf<String?>(null) }
    var capturedBitmap by remember { mutableStateOf<Bitmap?>(null) }

    // Camera launch contracts
    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicturePreview()
    ) { bitmap ->
        if (bitmap != null) {
            capturedBitmap = bitmap
            isOcrScanning = true
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                isOcrScanning = false
                scannedResult = "TSH: 2.45 µIU/mL (Normal Range 0.4 - 4.2)"
            }, 1200)
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            cameraLauncher.launch(null)
        } else {
            Toast.makeText(context, "Camera permission is required to capture paper lab reports", Toast.LENGTH_SHORT).show()
        }
    }

    val filteredEvents = remember(selectedCategory, timelineEvents) {
        if (selectedCategory == EventCategory.ALL) {
            timelineEvents
        } else {
            timelineEvents.filter { it.category == selectedCategory }
        }
    }

    Scaffold(
        topBar = {
            HealthSafeTopBar(
                currentRole = UserRole.PATIENT,
                isDarkTheme = isDarkTheme,
                onToggleTheme = onToggleTheme,
                onLogout = onLogout
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    showScanDialog = true
                    scannedResult = null
                    isOcrScanning = false
                    capturedBitmap = null
                },
                containerColor = colors.moss600,
                contentColor = colors.paper,
                shape = CircleShape,
                modifier = Modifier.padding(bottom = 8.dp, end = 4.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(horizontal = 18.dp, vertical = 12.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.DocumentScanner,
                        contentDescription = "Scan Report",
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        text = "Scan Report",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(start = 8.dp)
                    )
                }
            }
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
                .padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            // HERO CARD: "Clinical History, Ramesh Kumar"
            // High-contrast gradient styling for both light and dark mode with zero text clipping
            item {
                val heroGradient = if (isDarkTheme) {
                    Brush.linearGradient(
                        colors = listOf(
                            Color(0xFF17241B),
                            Color(0xFF1B291F),
                            Color(0xFF141E17)
                        )
                    )
                } else {
                    Brush.linearGradient(
                        colors = listOf(
                            Color(0xFF798968),
                            Color(0xFFC8C1AD),
                            Color(0xFF667362)
                        )
                    )
                }

                val heroTextColor = if (isDarkTheme) Color(0xFFF1EDE0) else Color(0xFF1D2A22)
                val heroSubtitleColor = if (isDarkTheme) Color(0xFFAAB5A6) else Color(0xFF3B483E)
                val heroBorderColor = if (isDarkTheme) Color(0x33FFFFFF) else Color(0x22000000)

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(HeroCardShape)
                        .background(heroGradient)
                        .border(1.dp, heroBorderColor, HeroCardShape)
                        .padding(20.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = "CLINICAL HISTORY & HEALTH WALLET",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.2.sp,
                                color = heroSubtitleColor
                            )
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(9999.dp))
                                    .background(if (isDarkTheme) Color(0xFF263829) else Color(0xFFE4EBD6))
                                    .padding(horizontal = 8.dp, vertical = 3.dp)
                            ) {
                                Text(
                                    text = "ABHA Active",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isDarkTheme) Color(0xFF9DBB78) else Color(0xFF4F6B3A)
                                )
                            }
                        }

                        Text(
                            text = patient.fullName,
                            fontFamily = FontFamily.Serif,
                            fontSize = 30.sp,
                            lineHeight = 36.sp,
                            fontWeight = FontWeight.Bold,
                            color = heroTextColor
                        )

                        Text(
                            text = "ABHA: ${patient.abhaId} · ${patient.age} yrs · ${patient.gender} · Blood ${patient.bloodGroup}",
                            fontSize = 13.sp,
                            lineHeight = 18.sp,
                            fontWeight = FontWeight.Medium,
                            color = heroSubtitleColor
                        )

                        Text(
                            text = "Primary Physician: ${patient.primaryCareDoctor}",
                            fontSize = 12.sp,
                            lineHeight = 16.sp,
                            color = heroSubtitleColor
                        )
                    }
                }
            }

            // UNGUESSABLE RX SHARE CODE CARD
            item {
                UnguessableRxCodeCard(
                    rxCode = patient.activeRxCode,
                    patientName = patient.fullName
                )
            }

            // CARE GAPS BANNER
            item {
                CareGapBanner(
                    gap = SampleData.careGaps[0],
                    onActionClick = {
                        Toast.makeText(context, "Consultation request sent to Apollo Hospitals", Toast.LENGTH_SHORT).show()
                    }
                )
            }

            // STATS ROW
            item {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    StatCard(
                        title = "Total Events",
                        value = "${timelineEvents.size}",
                        subtitle = "Diagnostic & Clinic",
                        badgeText = "Synced",
                        modifier = Modifier.weight(1f)
                    )
                    StatCard(
                        title = "Active Meds",
                        value = "2",
                        subtitle = "Oral hypoglycemics",
                        badgeText = "Daily",
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // TIMELINE FILTER PILLS
            item {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "LONGITUDINAL HEALTH TIMELINE",
                        fontSize = 11.sp,
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
                        EventCategory.entries.forEach { category ->
                            val isSelected = selectedCategory == category
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(9999.dp))
                                    .background(if (isSelected) colors.moss600 else colors.paper2)
                                    .border(
                                        1.dp,
                                        if (isSelected) colors.moss600 else colors.hairline,
                                        RoundedCornerShape(9999.dp)
                                    )
                                    .clickable { selectedCategory = category }
                                    .padding(horizontal = 14.dp, vertical = 7.dp)
                            ) {
                                Text(
                                    text = category.label,
                                    fontSize = 12.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isSelected) colors.paper else colors.ink
                                )
                            }
                        }
                    }
                }
            }

            // TIMELINE EVENTS LIST
            items(filteredEvents, key = { it.id }) { event ->
                val isExpanded = expandedEventId == event.id

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(CardShape)
                        .background(colors.card)
                        .border(1.dp, colors.hairline, CardShape)
                        .clickable {
                            expandedEventId = if (isExpanded) null else event.id
                        }
                        .padding(16.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            EventBadge(category = event.category)
                            Text(
                                text = event.date,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                color = colors.inkSoft
                            )
                        }

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = event.title,
                                    fontSize = 16.sp,
                                    lineHeight = 22.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.ink
                                )
                                Text(
                                    text = event.subtitle,
                                    fontSize = 12.sp,
                                    lineHeight = 16.sp,
                                    color = colors.inkSoft,
                                    modifier = Modifier.padding(top = 2.dp)
                                )
                            }

                            Icon(
                                imageVector = if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                contentDescription = "Expand details",
                                tint = colors.inkSoft,
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        // Tag / metric value
                        if (event.tag.isNotBlank()) {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(colors.paper2)
                                    .padding(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    text = event.tag,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = colors.moss600
                                )
                            }
                        }

                        // Expanded Details
                        AnimatedVisibility(visible = isExpanded) {
                            Column(
                                modifier = Modifier
                                    .padding(top = 8.dp)
                                    .border(1.dp, colors.hairline, RoundedCornerShape(8.dp))
                                    .background(colors.paper2)
                                    .padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(
                                    text = "Provider: ${event.provider}",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = colors.ink
                                )
                                if (event.notes != null) {
                                    Text(
                                        text = "Clinical Notes: ${event.notes}",
                                        fontSize = 12.sp,
                                        color = colors.inkSoft,
                                        lineHeight = 16.sp
                                    )
                                }
                            }
                        }
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(72.dp))
            }
        }
    }

    // OCR SCAN & CAMERA ACCESS DIALOG
    if (showScanDialog) {
        AlertDialog(
            onDismissRequest = { showScanDialog = false },
            title = {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.PhotoCamera,
                        contentDescription = null,
                        tint = colors.moss600
                    )
                    Text(
                        text = "Scan Paper Lab Report",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.ink
                    )
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Text(
                        text = "Capture a photo of your paper diagnostic report using your device's camera. The HealthSafe OCR Engine will extract biomarkers and store them in your locker.",
                        fontSize = 13.sp,
                        lineHeight = 18.sp,
                        color = colors.inkSoft
                    )

                    // Live camera captured preview thumbnail (if image captured)
                    if (capturedBitmap != null) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(160.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .border(1.dp, colors.moss600, RoundedCornerShape(12.dp))
                        ) {
                            Image(
                                bitmap = capturedBitmap!!.asImageBitmap(),
                                contentDescription = "Captured Lab Report Preview",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )
                        }
                    }

                    // Open Camera Action Button
                    if (scannedResult == null && !isOcrScanning) {
                        Button(
                            onClick = {
                                val hasPermission = ContextCompat.checkSelfPermission(
                                    context,
                                    Manifest.permission.CAMERA
                                ) == PackageManager.PERMISSION_GRANTED

                                if (hasPermission) {
                                    cameraLauncher.launch(null)
                                } else {
                                    permissionLauncher.launch(Manifest.permission.CAMERA)
                                }
                            },
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = colors.moss600,
                                contentColor = colors.paper
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(46.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.CameraAlt,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Text(
                                text = "Open Camera & Capture",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(start = 8.dp)
                            )
                        }

                        // Fallback sample report test button
                        OutlinedButton(
                            onClick = {
                                isOcrScanning = true
                                android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                                    isOcrScanning = false
                                    scannedResult = "TSH: 2.45 µIU/mL (Thyrocare)"
                                }, 1000)
                            },
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = "Use Sample Diagnostic Sheet",
                                fontSize = 12.sp,
                                color = colors.inkSoft
                            )
                        }
                    }

                    // Progress animation while extracting
                    if (isOcrScanning) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 14.dp)
                        ) {
                            CircularProgressIndicator(color = colors.moss600)
                            Text(
                                text = "AI OCR extracting biomarkers & clinical values...",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = colors.moss600,
                                modifier = Modifier.padding(top = 10.dp)
                            )
                        }
                    } else if (scannedResult != null) {
                        // Extracted result banner
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(colors.eventLabBg)
                                .border(1.dp, colors.eventLabText.copy(alpha = 0.25f), RoundedCornerShape(10.dp))
                                .padding(12.dp)
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(
                                    text = "Extracted Biomarker: Thyroid Profile",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.eventLabText
                                )
                                Text(
                                    text = "TSH: 2.45 µIU/mL (Normal Range 0.4 - 4.2)\nThyrocare Diagnostic Labs",
                                    fontSize = 12.sp,
                                    lineHeight = 16.sp,
                                    color = colors.ink
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                if (scannedResult != null) {
                    Button(
                        onClick = {
                            val newEvent = HealthEvent(
                                id = "EVT-${System.currentTimeMillis()}",
                                title = "Thyroid Stimulating Hormone (TSH)",
                                subtitle = "Extracted via Mobile Camera OCR Scan",
                                category = EventCategory.LAB_RESULT,
                                date = "Today",
                                provider = "Thyrocare Technologies",
                                tag = "2.45 µIU/mL (Normal)",
                                notes = "Digitized directly from physical lab report photo."
                            )
                            timelineEvents = listOf(newEvent) + timelineEvents
                            showScanDialog = false
                            Toast.makeText(context, "Added to your health timeline", Toast.LENGTH_SHORT).show()
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = colors.moss600,
                            contentColor = colors.paper
                        ),
                        shape = RoundedCornerShape(9999.dp)
                    ) {
                        Text("Save to Health Locker", fontWeight = FontWeight.Bold)
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showScanDialog = false }) {
                    Text("Cancel", color = colors.inkSoft)
                }
            },
            containerColor = colors.card,
            shape = RoundedCornerShape(22.dp)
        )
    }
}
