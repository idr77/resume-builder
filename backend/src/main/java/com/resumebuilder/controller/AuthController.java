package com.resumebuilder.controller;

import com.resumebuilder.config.JwtUtils;
import com.resumebuilder.dto.AuthRequest;
import com.resumebuilder.dto.AuthResponse;
import com.resumebuilder.entity.User;
import com.resumebuilder.entity.UserTokensQuota;
import com.resumebuilder.repository.UserRepository;
import com.resumebuilder.repository.UserTokensQuotaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final UserTokensQuotaRepository quotaRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    public AuthController(UserRepository userRepository, 
                          UserTokensQuotaRepository quotaRepository,
                          PasswordEncoder passwordEncoder, 
                          JwtUtils jwtUtils) {
        this.userRepository = userRepository;
        this.quotaRepository = quotaRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@RequestBody AuthRequest signupRequest) {
        if (userRepository.existsByEmail(signupRequest.email())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Cet email est déjà utilisé."));
        }

        // Create user
        User user = new User(signupRequest.email(), passwordEncoder.encode(signupRequest.password()));
        User savedUser = userRepository.save(user);

        // Initialize free quota (50k tokens)
        UserTokensQuota quota = new UserTokensQuota(savedUser, 50000, "FREE");
        quotaRepository.save(quota);

        // Generate JWT
        String token = jwtUtils.generateToken(savedUser.getEmail(), savedUser.getId());
        return ResponseEntity.ok(new AuthResponse(token, savedUser.getId(), savedUser.getEmail()));
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody AuthRequest loginRequest) {
        User user = userRepository.findByEmail(loginRequest.email())
                .orElse(null);

        if (user == null || !passwordEncoder.matches(loginRequest.password(), user.getPasswordHash())) {
            return ResponseEntity.status(401).body(Map.of("error", "Email ou mot de passe incorrect."));
        }

        String token = jwtUtils.generateToken(user.getEmail(), user.getId());
        return ResponseEntity.ok(new AuthResponse(token, user.getId(), user.getEmail()));
    }
}
