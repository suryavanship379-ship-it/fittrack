package com.fittrack.config

import com.fittrack.model.*
import com.fittrack.repository.*
import org.springframework.boot.CommandLineRunner
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Component

@Component
class DataInitializer(
    private val userRepository: UserRepository,
    private val memberRepository: MemberRepository,
    private val trainerRepository: TrainerRepository,
    private val paymentRepository: PaymentRepository,
    private val attendanceRepository: AttendanceRepository,
    private val passwordEncoder: PasswordEncoder
) : CommandLineRunner {

    override fun run(vararg args: String?) {
        if (userRepository.count() == 0L) {
            userRepository.saveAll(listOf(
                User(email = "owner@fittrack.com", password = passwordEncoder.encode("owner123"), role = "OWNER"),
                User(email = "trainer@fittrack.com", password = passwordEncoder.encode("trainer123"), role = "TRAINER"),
                User(email = "member@fittrack.com", password = passwordEncoder.encode("member123"), role = "MEMBER")
            ))
        }

        if (memberRepository.count() == 0L) {
            memberRepository.saveAll(listOf(
                Member(name = "Rohan Sharma", phone = "9876543210", email = "rohan@example.com", plan = "Gold Annual (1 Year)", expiry = "2026-12-31", status = "Active", joinDate = "2026-01-15"),
                Member(name = "Ananya Patel", phone = "9812345678", email = "ananya@example.com", plan = "Monthly Basic (1 Month)", expiry = "2026-10-15", status = "Active", joinDate = "2026-09-15"),
                Member(name = "Siddharth Rao", phone = "9900112233", email = "sid@example.com", plan = "Quarterly Pro (3 Months)", expiry = "2026-11-30", status = "Active", joinDate = "2026-08-30")
            ))
        }

        if (trainerRepository.count() == 0L) {
            trainerRepository.saveAll(listOf(
                Trainer(name = "Vikram Singh", phone = "9988776655", email = "vikram@fittrack.com", specialization = "Muscle Gain & Powerlifting", experience = "5 Years", availability = "Full-Time", salary = 45000.0),
                Trainer(name = "Priya Nair", phone = "9123456789", email = "priya@fittrack.com", specialization = "Weight Loss & Functional Cardio", experience = "3 Years", availability = "Full-Time", salary = 38000.0)
            ))
        }

        if (paymentRepository.count() == 0L) {
            paymentRepository.saveAll(listOf(
                Payment(memberName = "Rohan Sharma", amount = 9999.0, paymentDate = "2026-01-15", paymentMethod = "UPI", status = "Paid"),
                Payment(memberName = "Ananya Patel", amount = 1499.0, paymentDate = "2026-09-15", paymentMethod = "Cash", status = "Paid"),
                Payment(memberName = "Siddharth Rao", amount = 3999.0, paymentDate = "2026-08-30", paymentMethod = "Card", status = "Pending")
            ))
        }

        if (attendanceRepository.count() == 0L) {
            attendanceRepository.saveAll(listOf(
                Attendance(memberName = "Rohan Sharma", date = "2026-09-26", checkInTime = "07:30 AM", status = "Present"),
                Attendance(memberName = "Ananya Patel", date = "2026-09-26", checkInTime = "08:15 AM", status = "Present")
            ))
        }
    }
}
