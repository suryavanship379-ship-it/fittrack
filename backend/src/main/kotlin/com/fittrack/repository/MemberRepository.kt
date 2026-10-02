package com.fittrack.repository

import com.fittrack.model.Member
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface MemberRepository : JpaRepository<Member, Long> {
    fun countByStatus(status: String): Long
}
