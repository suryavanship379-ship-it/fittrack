package com.fittrack.model

import jakarta.persistence.*

@Entity
@Table(name = "trainers")
data class Trainer(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(nullable = false)
    val name: String = "",

    @Column(nullable = false)
    val phone: String = "",

    @Column(nullable = false)
    val email: String = "",

    val specialization: String = "Muscle Gain",

    val experience: String = "3 Years",

    val availability: String = "Full-Time",

    val salary: Double = 40000.0
)
