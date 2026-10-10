package com.healthsafe.app.ui.navigation

sealed class Screen(val route: String) {
    data object Landing : Screen("landing")
    data object Login : Screen("login")
    data object Patient : Screen("patient")
    data object Doctor : Screen("doctor")
    data object Physician : Screen("physician")
    data object Admin : Screen("admin")
}
