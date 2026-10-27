package com.resumebuilder.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "resume_versions")
public class ResumeVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resume_id", nullable = false)
    private Resume resume;

    @Column(name = "version_name", nullable = false, length = 255)
    private String versionName;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "resume_data", nullable = false)
    private Map<String, Object> resumeData;

    @Column(name = "is_locked")
    private Boolean isLocked = false;

    @Column(name = "created_at")
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public ResumeVersion() {}

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Resume getResume() {
        return resume;
    }

    public void setResume(Resume resume) {
        this.resume = resume;
    }

    public String getVersionName() {
        return versionName;
    }

    public void setVersionName(String versionName) {
        this.versionName = versionName;
    }

    public Map<String, Object> getResumeData() {
        return resumeData;
    }

    public void setResumeData(Map<String, Object> resumeData) {
        this.resumeData = resumeData;
    }

    public Boolean getIsLocked() {
        return isLocked;
    }

    public void setIsLocked(Boolean isLocked) {
        this.isLocked = isLocked;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
