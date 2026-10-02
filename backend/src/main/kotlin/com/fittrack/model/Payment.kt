package com.fittrack.model

import jakarta.persistence.*

@Entity
@Table(name = "payments")
data class Payment(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(nullable = false)
    val memberName: String = "",

    @Column(nullable = false)
    val amount: Double = 0.0,

    val paymentDate: String = "",

    val paymentMethod: String = "UPI",

    val status: String = "Paid"
)
