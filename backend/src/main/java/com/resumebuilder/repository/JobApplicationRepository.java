package com.resumebuilder.repository;

import com.resumebuilder.entity.JobApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JobApplicationRepository extends JpaRepository<JobApplication, UUID> {
    List<JobApplication> findByUserId(UUID userId);
    Optional<JobApplication> findByUserIdAndId(UUID userId, UUID id);
}
