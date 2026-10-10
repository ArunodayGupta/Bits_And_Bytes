package com.healthsafe.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.healthsafe.app.ui.model.UserRole
import com.healthsafe.app.ui.screens.AdminHomeScreen
import com.healthsafe.app.ui.screens.DoctorHomeScreen
import com.healthsafe.app.ui.screens.LandingScreen
import com.healthsafe.app.ui.screens.LoginScreen
import com.healthsafe.app.ui.screens.PatientHomeScreen
import com.healthsafe.app.ui.screens.PhysicianHomeScreen

@Composable
fun HealthSafeNavGraph(
    navController: NavHostController,
    isDarkTheme: Boolean,
    onToggleTheme: () -> Unit,
    modifier: Modifier = Modifier,
    startDestination: String = Screen.Landing.route
) {
    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier
    ) {
        // 1. Landing / Onboarding Screen with interactive "Next" walkthrough
        composable(Screen.Landing.route) {
            LandingScreen(
                onNavigateToLogin = {
                    navController.navigate(Screen.Login.route)
                }
            )
        }

        // 2. Login Screen with Role Tabs (Patient, Doctor, Physician, Admin)
        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSuccess = { role ->
                    when (role) {
                        UserRole.PATIENT -> navController.navigate(Screen.Patient.route)
                        UserRole.DOCTOR -> navController.navigate(Screen.Doctor.route)
                        UserRole.PHYSICIAN -> navController.navigate(Screen.Physician.route)
                        UserRole.ADMIN -> navController.navigate(Screen.Admin.route)
                    }
                },
                onBackToLanding = {
                    navController.navigate(Screen.Landing.route) {
                        popUpTo(Screen.Landing.route) { inclusive = true }
                    }
                }
            )
        }

        // 3. Patient Functionality Screen
        composable(Screen.Patient.route) {
            PatientHomeScreen(
                isDarkTheme = isDarkTheme,
                onToggleTheme = onToggleTheme,
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Landing.route) { inclusive = false }
                    }
                }
            )
        }

        // 4. Doctor Functionality Screen
        composable(Screen.Doctor.route) {
            DoctorHomeScreen(
                isDarkTheme = isDarkTheme,
                onToggleTheme = onToggleTheme,
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Landing.route) { inclusive = false }
                    }
                }
            )
        }

        // 5. Physician Functionality Screen
        composable(Screen.Physician.route) {
            PhysicianHomeScreen(
                isDarkTheme = isDarkTheme,
                onToggleTheme = onToggleTheme,
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Landing.route) { inclusive = false }
                    }
                }
            )
        }

        // 6. Admin Functionality Screen
        composable(Screen.Admin.route) {
            AdminHomeScreen(
                isDarkTheme = isDarkTheme,
                onToggleTheme = onToggleTheme,
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Landing.route) { inclusive = false }
                    }
                }
            )
        }
    }
}
