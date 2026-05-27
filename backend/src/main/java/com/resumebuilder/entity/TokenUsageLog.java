package com.resumebuilder.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "token_usage_logs")
public class TokenUsageLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "feature_used", nullable = false, length = 100)
    private String featureUsed;

    @Column(nullable = false, length = 50)
    private String provider; // e.g., "SYSTEM_GEMINI", "SYSTEM_OPENAI", etc.

    @Column(name = "tokens_consumed", nullable = false)
    private Integer tokensConsumed;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public TokenUsageLog() {}

    public TokenUsageLog(User user, String featureUsed, String provider, Integer tokensConsumed) {
        this.user = user;
        this.featureUsed = featureUsed;
        this.provider = provider;
        this.tokensConsumed = tokensConsumed;
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getFeatureUsed() {
        return featureUsed;
    }

    public void setFeatureUsed(String featureUsed) {
        this.featureUsed = featureUsed;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public Integer getTokensConsumed() {
        return tokensConsumed;
    }

    public void setTokensConsumed(Integer tokensConsumed) {
        this.tokensConsumed = tokensConsumed;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
