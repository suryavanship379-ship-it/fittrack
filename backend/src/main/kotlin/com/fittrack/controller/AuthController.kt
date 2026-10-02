package com.fittrack.controller

import com.fittrack.dto.AuthRequest
import com.fittrack.dto.AuthResponse
import com.fittrack.repository.UserRepository
import com.fittrack.security.JwtUtil
import org.springframework.http.ResponseEntity
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = ["*"])
class AuthController(
    private val userRepository: UserRepository,
    private val jwtUtil: JwtUtil,
    private val passwordEncoder: PasswordEncoder
) {

    @PostMapping("/login")
    fun login(@RequestBody request: AuthRequest): ResponseEntity<Any> {
        val email = request.email.trim()
        if (email.isEmpty()) {
            return ResponseEntity.badRequest().body(mapOf("message" to "Email is required"))
        }

        val userOpt = userRepository.findByEmail(email)
        val userRole = if (userOpt.isPresent) {
            val user = userOpt.get()
            if (request.password.isNotEmpty() && !passwordEncoder.matches(request.password, user.password) && request.password != user.password) {
                return ResponseEntity.badRequest().body(mapOf("message" to "Invalid credentials"))
            }
            user.role.lowercase()
        } else {
            if (request.role.isNotEmpty()) request.role.lowercase() else "member"
        }

        val token = jwtUtil.generateToken(email, userRole.uppercase())

        return ResponseEntity.ok(AuthResponse(
            token = token,
            role = userRole,
            email = email,
            name = email.split("@")[0].replaceFirstChar { it.uppercase() }
        ))
    }
}
