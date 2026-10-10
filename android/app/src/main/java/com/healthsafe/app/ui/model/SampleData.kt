package com.healthsafe.app.ui.model

object SampleData {

    val demoPatients = listOf(
        PatientProfile(
            abhaId = "91-1234-5678-9012",
            fullName = "Ramesh Kumar",
            age = 48,
            gender = "Male",
            bloodGroup = "B+",
            activeRxCode = "RX-7F3A-9K2M",
            primaryCareDoctor = "Dr. Rajesh Rao, MD",
            emergencyContact = "+91 98765 43210"
        ),
        PatientProfile(
            abhaId = "91-2345-6789-0123",
            fullName = "Priya Sharma",
            age = 34,
            gender = "Female",
            bloodGroup = "O+",
            activeRxCode = "RX-4N8B-2X9L",
            primaryCareDoctor = "Dr. Ananya Sen, MS",
            emergencyContact = "+91 98123 45678"
        ),
        PatientProfile(
            abhaId = "91-3456-7890-1234",
            fullName = "Arun Patel",
            age = 62,
            gender = "Male",
            bloodGroup = "A+",
            activeRxCode = "RX-8D1P-6Q4V",
            primaryCareDoctor = "Dr. Rajesh Rao, MD",
            emergencyContact = "+91 98901 23456"
        )
    )

    val patientTimelineEvents = listOf(
        HealthEvent(
            id = "EVT-101",
            title = "HbA1c Glycated Hemoglobin",
            subtitle = "Metabolic Panel · Diagnostic Lab",
            category = EventCategory.LAB_RESULT,
            date = "Oct 08, 2026",
            provider = "Thyrocare Technologies",
            tag = "6.8% (Target < 7.0%)",
            valueOrDose = "6.8%",
            status = "Optimal",
            notes = "Three month average blood glucose reflects good glycemic control."
        ),
        HealthEvent(
            id = "EVT-102",
            title = "Metformin Hydrochloride",
            subtitle = "500 mg Tablet · Twice Daily",
            category = EventCategory.MEDICATION,
            date = "Sep 28, 2026",
            provider = "Apollo Hospitals · Dr. Rajesh Rao",
            tag = "Active Rx",
            valueOrDose = "500mg BD",
            status = "Refilled",
            notes = "Take immediately after morning and evening meals."
        ),
        HealthEvent(
            id = "EVT-103",
            title = "Type 2 Diabetes Mellitus",
            subtitle = "Endocrine Diagnostic Assessment",
            category = EventCategory.CONDITION,
            date = "Sep 15, 2026",
            provider = "Apollo Hospitals",
            tag = "Chronic · Stable",
            valueOrDose = "ICD-10 E11",
            status = "Monitored",
            notes = "Lifestyle intervention + oral hypoglycemics maintained."
        ),
        HealthEvent(
            id = "EVT-104",
            title = "Cardiology Routine Evaluation",
            subtitle = "General Checkup & Echo Review",
            category = EventCategory.ENCOUNTER,
            date = "Aug 20, 2026",
            provider = "Fortis Escorts Heart Institute",
            tag = "Completed",
            valueOrDose = "BP 124/82 mmHg",
            status = "Completed",
            notes = "Normal sinus rhythm, normal left ventricular systolic function."
        ),
        HealthEvent(
            id = "EVT-105",
            title = "Lipid Profile Panel",
            subtitle = "Cardiovascular Risk Biomarkers",
            category = EventCategory.LAB_RESULT,
            date = "Jul 12, 2026",
            provider = "Dr. Lal PathLabs",
            tag = "LDL 94 mg/dL",
            valueOrDose = "Total: 168 mg/dL",
            status = "Normal",
            notes = "Triglycerides: 142 mg/dL, HDL: 46 mg/dL."
        ),
        HealthEvent(
            id = "EVT-106",
            title = "Atorvastatin Calcium",
            subtitle = "10 mg Tablet · Once Daily at Bedtime",
            category = EventCategory.MEDICATION,
            date = "Jun 14, 2026",
            provider = "Apollo Hospitals · Dr. Rajesh Rao",
            tag = "Active Rx",
            valueOrDose = "10mg Nightly",
            status = "Active",
            notes = "Lipid management therapy."
        )
    )

    val careGaps = listOf(
        CareGap(
            id = "GAP-1",
            title = "Annual Diabetic Retinopathy Screen",
            subtitle = "Recommended every 12 months for Type 2 Diabetes",
            recommendation = "Last ophthalmology examination was 14 months ago.",
            actionText = "Schedule Eye Exam",
            isUrgent = true
        ),
        CareGap(
            id = "GAP-2",
            title = "Microalbuminuria Urine Test",
            subtitle = "Routine renal protection marker due in 30 days",
            recommendation = "Monitor kidney status alongside stable HbA1c.",
            actionText = "Order Lab Panel",
            isUrgent = false
        )
    )

    val genericSubstitutes = listOf(
        GenericMedicineSubstitute(
            id = "GEN-01",
            brandedName = "Augmentin 625 Duo (10 Tab)",
            genericName = "Amoxicillin & Potassium Clavulanate (500mg+125mg)",
            brandedPrice = 224.50,
            genericPrice = 60.00,
            savingsPercent = 73,
            dosageForm = "Tablet",
            manufacturer = "PMBJP Jan Aushadhi Pharma",
            isAvailable = true
        ),
        GenericMedicineSubstitute(
            id = "GEN-02",
            brandedName = "Glycomet-SR 500 (20 Tab)",
            genericName = "Metformin Hydrochloride Prolonged Release 500mg",
            brandedPrice = 78.00,
            genericPrice = 14.50,
            savingsPercent = 81,
            dosageForm = "Tablet",
            manufacturer = "Jan Aushadhi Scheme",
            isAvailable = true
        ),
        GenericMedicineSubstitute(
            id = "GEN-03",
            brandedName = "Lipitor 10mg (15 Tab)",
            genericName = "Atorvastatin Calcium 10mg",
            brandedPrice = 115.00,
            genericPrice = 18.00,
            savingsPercent = 84,
            dosageForm = "Tablet",
            manufacturer = "PMBJP Generic Formulations",
            isAvailable = true
        ),
        GenericMedicineSubstitute(
            id = "GEN-04",
            brandedName = "Telma 40mg (15 Tab)",
            genericName = "Telmisartan Tablets IP 40mg",
            brandedPrice = 142.00,
            genericPrice = 22.00,
            savingsPercent = 85,
            dosageForm = "Tablet",
            manufacturer = "Jan Aushadhi Scheme",
            isAvailable = true
        ),
        GenericMedicineSubstitute(
            id = "GEN-05",
            brandedName = "Pan-D Capsule (15 Cap)",
            genericName = "Pantoprazole 40mg + Domperidone 30mg SR",
            brandedPrice = 199.00,
            genericPrice = 45.00,
            savingsPercent = 77,
            dosageForm = "Capsule",
            manufacturer = "PMBJP Kendra Approved",
            isAvailable = true
        )
    )

    val auditLogs = listOf(
        AuditLogEntry(
            id = "LOG-9812",
            timestamp = "10 Oct 2026, 16:45:12 IST",
            action = "Electronic Prescription Issued",
            actor = "Dr. Rajesh Rao (MCI-2018-98421)",
            role = "Doctor",
            targetRecord = "RX-7F3A-9K2M (Ramesh Kumar)",
            verificationHash = "sha256:7f81a...d9e3"
        ),
        AuditLogEntry(
            id = "LOG-9811",
            timestamp = "10 Oct 2026, 16:42:05 IST",
            action = "EHR Record Access Granted",
            actor = "Patient Consent Token",
            role = "Patient",
            targetRecord = "ABHA: 91-1234-5678-9012",
            verificationHash = "sha256:4b19c...281f"
        ),
        AuditLogEntry(
            id = "LOG-9810",
            timestamp = "10 Oct 2026, 15:30:19 IST",
            action = "Jan Aushadhi Generic Substitution Check",
            actor = "Dispensary Physician (PMBJP-KEN-0428)",
            role = "Physician",
            targetRecord = "Substitute: Amoxicillin Clavulanate",
            verificationHash = "sha256:1a2c3...90de"
        ),
        AuditLogEntry(
            id = "LOG-9809",
            timestamp = "10 Oct 2026, 14:12:00 IST",
            action = "Paper Lab Report Digitization (OCR)",
            actor = "HealthSafe OCR Engine v2.4",
            role = "System",
            targetRecord = "Thyrocare Lab Panel PDF/Image",
            verificationHash = "sha256:990fe...14ba"
        )
    )
}
