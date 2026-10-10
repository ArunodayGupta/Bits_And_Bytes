package com.healthsafe.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.DocumentScanner
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Medication
import androidx.compose.material.icons.filled.Savings
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Timeline
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.healthsafe.app.ui.components.EyebrowPill
import com.healthsafe.app.ui.components.HealthSafeLogo
import com.healthsafe.app.ui.theme.HealthSafeTheme
import kotlinx.coroutines.launch

private data class OnboardingFeature(
    val stepNumber: String,
    val title: String,
    val headline: String,
    val description: String,
    val icon: ImageVector,
    val previewBadge: String,
    val previewLabel: String,
    val previewValue: String,
    val highlights: List<String>
)

private val featuresList = listOf(
    OnboardingFeature(
        stepNumber = "01 / 05",
        title = "Unified Health Records",
        headline = "All your hospital visits, lab reports & prescriptions in one timeline.",
        description = "Connect seamlessly with your ABHA Health ID. Access every blood test, discharge summary, and routine clinic visit chronologically organized without paper folders.",
        icon = Icons.Default.Timeline,
        previewBadge = "ABHA Linked",
        previewLabel = "Blood Glucose HbA1c",
        previewValue = "6.8% (Target < 7.0%)",
        highlights = listOf(
            "Auto-synced via Ayushman Bharat Digital Mission (ABDM)",
            "Zero physical paper files required",
            "Longitudinal chronological health history"
        )
    ),
    OnboardingFeature(
        stepNumber = "02 / 05",
        title = "Privacy-First Doctor Sharing",
        headline = "Share a temporary speakable prescription code with your doctor.",
        description = "Never hand over your phone or personal credentials. Generate unguessable, cryptographic share tokens (like RX-7F3A-9K2M) for instant, secure consultation access.",
        icon = Icons.Default.Share,
        previewBadge = "Secure Token",
        previewLabel = "Doctor Access Code",
        previewValue = "RX-7F3A-9K2M",
        highlights = listOf(
            "Cryptographically randomized 8-char codes",
            "Doctor gets instant read-only EHR access",
            "Auto-expires after clinical consultation"
        )
    ),
    OnboardingFeature(
        stepNumber = "03 / 05",
        title = "Smart Lab Report Digitization",
        headline = "Snap physical test papers to automatically digitize metrics.",
        description = "Tired of misplaced diagnostic reports? Snap a picture of your physical lab sheet or upload PDFs to extract diagnostic metrics directly into your secure health locker.",
        icon = Icons.Default.DocumentScanner,
        previewBadge = "AI OCR Engine",
        previewLabel = "Extracted Biomarker",
        previewValue = "Lipid Profile · LDL 94 mg/dL",
        highlights = listOf(
            "High-precision medical OCR processing",
            "Automatic range validation (normal / alert)",
            "Instant addition to your longitudinal chart"
        )
    ),
    OnboardingFeature(
        stepNumber = "04 / 05",
        title = "Generic Medicine Savings",
        headline = "Save up to 85% on recurring medicines with Jan Aushadhi equivalents.",
        description = "Discover government-certified Pradhan Mantri Jan Aushadhi (PMBJP) generic alternatives. Compare branded prices with generic costs and save thousands every month.",
        icon = Icons.Default.Savings,
        previewBadge = "PMBJP Approved",
        previewLabel = "Metformin 500mg SR",
        previewValue = "Save ₹63.50 per strip (81%)",
        highlights = listOf(
            "Govt. verified chemical bioequivalence",
            "Real-time monthly savings calculator",
            "Nearest Jan Aushadhi Kendra locator"
        )
    ),
    OnboardingFeature(
        stepNumber = "05 / 05",
        title = "Doctor & Clinician Suite",
        headline = "Instant patient EHR lookups & electronic prescription generator.",
        description = "Empowering healthcare providers to verify patient history via speakable Rx codes, consult longitudinal trends, and write digital prescriptions in seconds.",
        icon = Icons.Default.Medication,
        previewBadge = "NMC Registered",
        previewLabel = "Clinical Action",
        previewValue = "Digital Rx Issued Instantly",
        highlights = listOf(
            "Quick lookup by ABHA or Prescription Code",
            "Comprehensive past encounter history & vitals",
            "Tamper-proof verifiable e-prescriptions"
        )
    )
)

@OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)
@Composable
fun LandingScreen(
    onNavigateToLogin: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = HealthSafeTheme.colors
    val coroutineScope = rememberCoroutineScope()
    val pagerState = rememberPagerState(pageCount = { featuresList.size })

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(colors.paper)
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        // Top App Bar Header with Logo & Skip to Login
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 12.dp)
        ) {
            HealthSafeLogo(iconSize = 34.dp)

            TextButton(
                onClick = onNavigateToLogin,
                shape = CircleShape,
                modifier = Modifier
                    .clip(CircleShape)
                    .background(colors.paper2)
                    .border(1.dp, colors.hairline, CircleShape)
                    .padding(horizontal = 6.dp)
            ) {
                Text(
                    text = "Skip to Login",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.moss600
                )
            }
        }

        // SWIPEABLE FEATURE CAROUSEL (HorizontalPager allows natural swiping left/right)
        HorizontalPager(
            state = pagerState,
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
        ) { pageIndex ->
            val item = featuresList[pageIndex]

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Eyebrow badge showing current step
                EyebrowPill(text = "Feature Walkthrough · ${item.stepNumber}")

                // Headline with clean line height to avoid any clipping
                Text(
                    text = item.headline,
                    fontFamily = FontFamily.Serif,
                    fontSize = 26.sp,
                    lineHeight = 33.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.ink
                )

                // Description
                Text(
                    text = item.description,
                    fontSize = 14.sp,
                    lineHeight = 21.sp,
                    color = colors.inkSoft
                )

                // Feature Visual Card
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(22.dp))
                        .background(
                            Brush.linearGradient(
                                colors = listOf(
                                    colors.paper2,
                                    colors.card
                                )
                            )
                        )
                        .border(1.dp, colors.hairline, RoundedCornerShape(22.dp))
                        .padding(16.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.weight(1f).padding(end = 6.dp)
                            ) {
                                Box(
                                    contentAlignment = Alignment.Center,
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(CircleShape)
                                        .background(colors.moss100)
                                ) {
                                    Icon(
                                        imageVector = item.icon,
                                        contentDescription = null,
                                        tint = colors.moss600,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                                Text(
                                    text = item.title,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.ink,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }

                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(9999.dp))
                                    .background(colors.moss100)
                                    .padding(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    text = item.previewBadge,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                    softWrap = false,
                                    color = colors.moss600
                                )
                            }
                        }

                        // Metric Box
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(colors.card)
                                .border(1.dp, colors.hairline, RoundedCornerShape(12.dp))
                                .padding(12.dp)
                        ) {
                            Column {
                                Text(
                                    text = item.previewLabel.uppercase(),
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 1.sp,
                                    color = colors.inkSoft
                                )
                                Text(
                                    text = item.previewValue,
                                    fontFamily = FontFamily.Serif,
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.ink,
                                    modifier = Modifier.padding(top = 2.dp)
                                )
                            }
                        }

                        // Bullet Highlights
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            item.highlights.forEach { bullet ->
                                Row(
                                    verticalAlignment = Alignment.Top,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Check,
                                        contentDescription = null,
                                        tint = colors.moss600,
                                        modifier = Modifier
                                            .padding(top = 2.dp)
                                            .size(15.dp)
                                    )
                                    Text(
                                        text = bullet,
                                        fontSize = 13.sp,
                                        lineHeight = 18.sp,
                                        color = colors.inkSoft
                                    )
                                }
                            }

                            if (pageIndex == 0) {
                                val uriHandler = LocalUriHandler.current
                                Spacer(modifier = Modifier.height(4.dp))
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(colors.moss100.copy(alpha = 0.5f))
                                        .border(1.dp, colors.moss600.copy(alpha = 0.25f), RoundedCornerShape(10.dp))
                                        .clickable { uriHandler.openUri("https://abha.abdm.gov.in/abha/v3/") }
                                        .padding(horizontal = 12.dp, vertical = 9.dp)
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Info,
                                            contentDescription = null,
                                            tint = colors.moss600,
                                            modifier = Modifier.size(15.dp)
                                        )
                                        Text(
                                            text = "Don't have an ABHA ID? ",
                                            fontSize = 12.sp,
                                            color = colors.inkSoft
                                        )
                                        Text(
                                            text = "Create one at ABDM ↗",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = colors.moss600,
                                            textDecoration = TextDecoration.Underline
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))
            }
        }

        // Bottom Controls: Page Dots & Navigation Buttons
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(colors.card)
                .border(1.dp, colors.hairline)
                .padding(horizontal = 20.dp, vertical = 14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Indicator Dots linked to pagerState
            Row(
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                featuresList.indices.forEach { index ->
                    val isSelected = index == pagerState.currentPage
                    Box(
                        modifier = Modifier
                            .padding(horizontal = 4.dp)
                            .size(
                                width = if (isSelected) 24.dp else 8.dp,
                                height = 8.dp
                            )
                            .clip(CircleShape)
                            .background(
                                if (isSelected) colors.moss600 else colors.hairline
                            )
                    )
                }
            }

            // Buttons: Back and Next / Get Started
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                if (pagerState.currentPage > 0) {
                    OutlinedButton(
                        onClick = {
                            coroutineScope.launch {
                                pagerState.animateScrollToPage(pagerState.currentPage - 1)
                            }
                        },
                        shape = RoundedCornerShape(9999.dp),
                        modifier = Modifier
                            .weight(0.38f)
                            .defaultMinSize(minHeight = 48.dp)
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Previous",
                            tint = colors.inkSoft,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = "Back",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = colors.inkSoft,
                            modifier = Modifier.padding(start = 4.dp)
                        )
                    }
                }

                Button(
                    onClick = {
                        if (pagerState.currentPage < featuresList.size - 1) {
                            coroutineScope.launch {
                                pagerState.animateScrollToPage(pagerState.currentPage + 1)
                            }
                        } else {
                            onNavigateToLogin()
                        }
                    },
                    shape = RoundedCornerShape(9999.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = colors.moss600,
                        contentColor = colors.paper
                    ),
                    modifier = Modifier
                        .weight(if (pagerState.currentPage > 0) 0.62f else 1f)
                        .defaultMinSize(minHeight = 48.dp)
                ) {
                    Text(
                        text = if (pagerState.currentPage < featuresList.size - 1) "Next Feature" else "Get Started (Sign In)",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                        contentDescription = "Next",
                        modifier = Modifier
                            .padding(start = 6.dp)
                            .size(16.dp)
                    )
                }
            }
        }
    }
}
