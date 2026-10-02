package com.fittrack.model

import jakarta.persistence.*

@Entity
@Table(name = "members")
data class Member(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(nullable = false)
    val name: String = "",

    @Column(nullable = false)
    val phone: String = "",

    @Column(nullable = false)
    val email: String = "",

    val plan: String = "Gold Annual (1 Year)",

    val expiry: String = "2026-12-31",

    val status: String = "Active",

    val joinDate: String = "2026-01-01"
)
