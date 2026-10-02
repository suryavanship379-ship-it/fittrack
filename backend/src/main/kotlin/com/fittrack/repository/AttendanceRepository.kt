package com.fittrack.repository

import com.fittrack.model.Attendance
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface AttendanceRepository : JpaRepository<Attendance, Long> {
    fun countByDate(date: String): Long
}
