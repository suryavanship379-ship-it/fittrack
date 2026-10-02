package com.fittrack.controller

import com.fittrack.dto.DashboardStatsDto
import com.fittrack.repository.AttendanceRepository
import com.fittrack.repository.MemberRepository
import com.fittrack.repository.PaymentRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.LocalDate

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = ["*"])
class DashboardController(
    private val memberRepository: MemberRepository,
    private val paymentRepository: PaymentRepository,
    private val attendanceRepository: AttendanceRepository
) {

    @GetMapping("/stats")
    fun getDashboardStats(): ResponseEntity<DashboardStatsDto> {
        val totalMembers = memberRepository.count()
        val activeMembers = memberRepository.countByStatus("Active")

        val payments = paymentRepository.findAll()
        val pendingFees = payments.filter { it.status == "Pending" }.sumOf { it.amount }
        val revenue = payments.filter { it.status == "Paid" }.sumOf { it.amount }

        val todayStr = LocalDate.now().toString()
        val todayAttendance = attendanceRepository.countByDate(todayStr)

        return ResponseEntity.ok(
            DashboardStatsDto(
                totalMembers = totalMembers,
                activeMembers = activeMembers,
                pendingFees = pendingFees,
                revenue = revenue,
                todayAttendanceCount = todayAttendance
            )
        )
    }
}
