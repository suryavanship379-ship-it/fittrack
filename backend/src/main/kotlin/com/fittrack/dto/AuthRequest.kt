package com.fittrack.dto

data class AuthRequest(
    val email: String = "",
    val password: String = "",
    val role: String = ""
)
