package com.resumebuilder.repository;

import com.resumebuilder.entity.UserTokensQuota;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserTokensQuotaRepository extends JpaRepository<UserTokensQuota, UUID> {
    Optional<UserTokensQuota> findByUserId(UUID userId);
}
