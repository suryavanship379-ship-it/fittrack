package com.fittrack.dto

data class AuthResponse(
    val token: String,
    val role: String,
    val email: String,
    val name: String
)
