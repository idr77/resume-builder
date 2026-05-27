package com.resumebuilder.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

@Service
public class EncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int TAG_LENGTH_BIT = 128;
    private static final int IV_LENGTH_BYTE = 12;

    @Value("${app.security.encryption-key:MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=}") // 32-byte key base64 encoded fallback for easy local dev
    private String masterKeyBase64;

    public record EncryptionResult(String encryptedData, String iv) {}

    public EncryptionResult encrypt(String plainText) throws Exception {
        byte[] iv = new byte[IV_LENGTH_BYTE];
        new SecureRandom().nextBytes(iv);

        byte[] masterKey = Base64.getDecoder().decode(masterKeyBase64);
        SecretKeySpec keySpec = new SecretKeySpec(masterKey, "AES");
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        GCMParameterSpec parameterSpec = new GCMParameterSpec(TAG_LENGTH_BIT, iv);
        
        cipher.init(Cipher.ENCRYPT_MODE, keySpec, parameterSpec);
        byte[] cipherText = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

        return new EncryptionResult(
            Base64.getEncoder().encodeToString(cipherText),
            Base64.getEncoder().encodeToString(iv)
        );
    }

    public String decrypt(String encryptedTextBase64, String ivBase64) throws Exception {
        byte[] cipherText = Base64.getDecoder().decode(encryptedTextBase64);
        byte[] iv = Base64.getDecoder().decode(ivBase64);
        byte[] masterKey = Base64.getDecoder().decode(masterKeyBase64);

        SecretKeySpec keySpec = new SecretKeySpec(masterKey, "AES");
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        GCMParameterSpec parameterSpec = new GCMParameterSpec(TAG_LENGTH_BIT, iv);

        cipher.init(Cipher.DECRYPT_MODE, keySpec, parameterSpec);
        byte[] decryptedText = cipher.doFinal(cipherText);

        return new String(decryptedText, StandardCharsets.UTF_8);
    }
}
