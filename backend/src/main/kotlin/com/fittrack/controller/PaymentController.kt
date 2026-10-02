package com.fittrack.controller

import com.fittrack.model.Payment
import com.fittrack.repository.PaymentRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = ["*"])
class PaymentController(
    private val paymentRepository: PaymentRepository
) {

    @GetMapping
    fun getAllPayments(): List<Payment> {
        val list = paymentRepository.findAll()
        if (list.isEmpty()) {
            return listOf(
                Payment(id = 1, memberName = "Rohan Sharma", amount = 9999.0, paymentDate = "2026-09-01", paymentMethod = "UPI", status = "Paid"),
                Payment(id = 2, memberName = "Ananya Patel", amount = 1499.0, paymentDate = "2026-09-15", paymentMethod = "Cash", status = "Paid")
            )
        }
        return list
    }

    @PostMapping
    fun createPayment(@RequestBody payment: Payment): ResponseEntity<Payment> {
        val savedPayment = paymentRepository.save(payment)
        return ResponseEntity.ok(savedPayment)
    }
}
