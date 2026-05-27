package com.resumebuilder.repository;

import com.resumebuilder.entity.TokenUsageLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface TokenUsageLogRepository extends JpaRepository<TokenUsageLog, UUID> {
    List<TokenUsageLog> findByUserId(UUID userId);
}
