package com.fittrack.controller

import com.fittrack.model.Attendance
import com.fittrack.repository.AttendanceRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/attendance")
@CrossOrigin(origins = ["*"])
class AttendanceController(
    private val attendanceRepository: AttendanceRepository
) {

    @GetMapping
    fun getAllAttendance(): List<Attendance> {
        val list = attendanceRepository.findAll()
        if (list.isEmpty()) {
            return listOf(
                Attendance(id = 1, memberName = "Rohan Sharma", date = "2026-09-26", checkInTime = "07:30 AM", status = "Present")
            )
        }
        return list
    }

    @PostMapping
    fun markAttendance(@RequestBody attendance: Attendance): ResponseEntity<Attendance> {
        val savedAttendance = attendanceRepository.save(attendance)
        return ResponseEntity.ok(savedAttendance)
    }
}
