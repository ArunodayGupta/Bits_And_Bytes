package com.healthsafe.app.ui.model

enum class UserRole(val label: String, val badge: String) {
    PATIENT("Patient", "ABHA Verified"),
    DOCTOR("Doctor", "NMC Registered"),
    PHYSICIAN("Dispensary Physician", "PMBJP Kendra"),
    ADMIN("System Admin", "Security Console")
}

enum class EventCategory(val label: String) {
    ALL("All Records"),
    MEDICATION("Prescriptions"),
    LAB_RESULT("Lab Tests"),
    CONDITION("Diagnoses"),
    ENCOUNTER("Hospital Visits")
}

data class HealthEvent(
    val id: String,
    val title: String,
    val subtitle: String,
    val category: EventCategory,
    val date: String,
    val provider: String,
    val tag: String,
    val valueOrDose: String? = null,
    val status: String = "Active",
    val notes: String? = null
)

data class CareGap(
    val id: String,
    val title: String,
    val subtitle: String,
    val recommendation: String,
    val actionText: String,
    val isUrgent: Boolean = false
)

data class PrescriptionItem(
    val id: String = java.util.UUID.randomUUID().toString(),
    val drugName: String,
    val dosage: String,
    val frequency: String,
    val duration: String,
    val instructions: String = "After food"
)

data class PatientProfile(
    val abhaId: String,
    val fullName: String,
    val age: Int,
    val gender: String,
    val bloodGroup: String,
    val activeRxCode: String,
    val primaryCareDoctor: String,
    val emergencyContact: String
)

data class GenericMedicineSubstitute(
    val id: String,
    val brandedName: String,
    val genericName: String,
    val brandedPrice: Double,
    val genericPrice: Double,
    val savingsPercent: Int,
    val dosageForm: String,
    val manufacturer: String,
    val isAvailable: Boolean = true
)

data class AuditLogEntry(
    val id: String,
    val timestamp: String,
    val action: String,
    val actor: String,
    val role: String,
    val targetRecord: String,
    val verificationHash: String,
    val isSuccess: Boolean = true
)
