package com.resumebuilder.repository;

import com.resumebuilder.entity.ResumeVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ResumeVersionRepository extends JpaRepository<ResumeVersion, UUID> {
    List<ResumeVersion> findByResumeId(UUID resumeId);
    List<ResumeVersion> findByResumeUser_Id(UUID userId);
    Optional<ResumeVersion> findByResumeUser_IdAndId(UUID userId, UUID id);
    Optional<ResumeVersion> findByResumeUser_IdAndVersionName(UUID userId, String versionName);
}
