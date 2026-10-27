package com.resumebuilder.repository;

import com.resumebuilder.entity.ResumeVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ResumeVersionRepository extends JpaRepository<ResumeVersion, UUID> {
    List<ResumeVersion> findByResumeId(UUID resumeId);

    @Query("SELECT rv FROM ResumeVersion rv WHERE rv.resume.user.id = :userId ORDER BY rv.createdAt DESC")
    List<ResumeVersion> findByResumeUser_Id(@Param("userId") UUID userId);

    @Query("SELECT rv FROM ResumeVersion rv WHERE rv.resume.user.id = :userId AND rv.id = :id")
    Optional<ResumeVersion> findByResumeUser_IdAndId(@Param("userId") UUID userId, @Param("id") UUID id);

    @Query("SELECT rv FROM ResumeVersion rv WHERE rv.resume.user.id = :userId AND rv.versionName = :versionName ORDER BY rv.createdAt DESC")
    List<ResumeVersion> findAllByUserIdAndVersionName(@Param("userId") UUID userId, @Param("versionName") String versionName);
}
