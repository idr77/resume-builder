package com.resumebuilder.repository;

import com.resumebuilder.entity.InterviewStep;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface InterviewStepRepository extends JpaRepository<InterviewStep, UUID> {
    List<InterviewStep> findByApplicationId(UUID applicationId);
}
