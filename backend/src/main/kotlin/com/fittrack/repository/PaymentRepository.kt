package com.fittrack.repository

import com.fittrack.model.Payment
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface PaymentRepository : JpaRepository<Payment, Long> {
    fun findByStatus(status: String): List<Payment>
}
