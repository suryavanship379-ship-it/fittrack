package com.fittrack.model

import jakarta.persistence.*

@Entity
@Table(name = "attendance")
data class Attendance(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(nullable = false)
    val memberName: String = "",

    val date: String = "",

    val checkInTime: String = "",

    val status: String = "Present"
)
