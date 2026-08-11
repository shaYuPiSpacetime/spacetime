package com.spacetime.common.provider;

import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.model.message.EncryptedMessageContent;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/** 非生产环境使用环境变量密钥的 AES-256-GCM 实现。 */
@Component
@Profile("!prod")
public class LocalAesSensitiveTextCipher implements SensitiveTextCipher {
    private static final int MESSAGE_PARAM_ERROR = 4001;
    private static final int MESSAGE_WRITE_UNAVAILABLE = 30018;
    private static final int MESSAGE_READ_UNAVAILABLE = 30024;
    private static final int IV_LENGTH = 12;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final String keyVersion;
    private final String encryptionKeyBase64;
    private final String hmacKeyBase64;

    public LocalAesSensitiveTextCipher(
            @Value("${message.security.key-version:}") String keyVersion,
            @Value("${message.security.encryption-key-base64:}") String encryptionKeyBase64,
            @Value("${message.security.hmac-key-base64:}") String hmacKeyBase64) {
        this.keyVersion = keyVersion;
        this.encryptionKeyBase64 = encryptionKeyBase64;
        this.hmacKeyBase64 = hmacKeyBase64;
    }

    @Override
    public String fingerprint(String plaintext) {
        if (plaintext == null || plaintext.isBlank()) {
            throw new BusinessException(MESSAGE_PARAM_ERROR, "消息正文不能为空");
        }
        try {
            return hmac(keys(MESSAGE_WRITE_UNAVAILABLE).hmacKey(), plaintext);
        } catch (GeneralSecurityException ex) {
            throw new BusinessException(MESSAGE_WRITE_UNAVAILABLE, "消息正文指纹生成失败");
        }
    }

    @Override
    public EncryptedMessageContent encrypt(String plaintext) {
        if (plaintext == null || plaintext.isBlank()) {
            throw new BusinessException(MESSAGE_PARAM_ERROR, "消息正文不能为空");
        }
        Keys keys = keys(MESSAGE_WRITE_UNAVAILABLE);
        try {
            byte[] iv = new byte[IV_LENGTH];
            RANDOM.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, keys.encryptionKey(), new GCMParameterSpec(128, iv));
            cipher.updateAAD(keyVersion.getBytes(StandardCharsets.UTF_8));
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            return new EncryptedMessageContent(
                    ciphertext, iv, keyVersion, hmac(keys.hmacKey(), plaintext));
        } catch (GeneralSecurityException ex) {
            throw new BusinessException(MESSAGE_WRITE_UNAVAILABLE, "消息正文加密失败");
        }
    }

    @Override
    public String decrypt(EncryptedMessageContent content) {
        requireEncryptedContent(content);
        Keys keys = keys(MESSAGE_READ_UNAVAILABLE);
        if (!keyVersion.equals(content.keyVersion())) {
            throw new BusinessException(MESSAGE_READ_UNAVAILABLE, "消息正文密钥版本不可用");
        }
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, keys.encryptionKey(),
                    new GCMParameterSpec(128, content.iv()));
            cipher.updateAAD(content.keyVersion().getBytes(StandardCharsets.UTF_8));
            String plaintext = new String(cipher.doFinal(content.ciphertext()), StandardCharsets.UTF_8);
            byte[] expected = HexFormat.of().parseHex(content.hmac());
            byte[] actual = HexFormat.of().parseHex(hmac(keys.hmacKey(), plaintext));
            if (!MessageDigest.isEqual(expected, actual)) {
                throw new BusinessException(MESSAGE_READ_UNAVAILABLE, "消息正文完整性校验失败");
            }
            return plaintext;
        } catch (BusinessException ex) {
            throw ex;
        } catch (GeneralSecurityException | IllegalArgumentException ex) {
            throw new BusinessException(MESSAGE_READ_UNAVAILABLE, "消息正文解密失败");
        }
    }

    private Keys keys(int errorCode) {
        if (keyVersion == null || keyVersion.isBlank()
                || encryptionKeyBase64 == null || encryptionKeyBase64.isBlank()
                || hmacKeyBase64 == null || hmacKeyBase64.isBlank()) {
            throw new BusinessException(errorCode, "消息正文密钥未配置");
        }
        try {
            byte[] encryption = Base64.getDecoder().decode(encryptionKeyBase64);
            byte[] hmac = Base64.getDecoder().decode(hmacKeyBase64);
            if (encryption.length != 32 || hmac.length < 32) {
                throw new IllegalArgumentException("invalid key length");
            }
            return new Keys(new SecretKeySpec(encryption, "AES"), new SecretKeySpec(hmac, "HmacSHA256"));
        } catch (IllegalArgumentException ex) {
            throw new BusinessException(errorCode, "消息正文密钥格式错误");
        }
    }

    private String hmac(SecretKeySpec key, String plaintext) throws GeneralSecurityException {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(key);
        return HexFormat.of().formatHex(mac.doFinal(plaintext.getBytes(StandardCharsets.UTF_8)));
    }

    private void requireEncryptedContent(EncryptedMessageContent content) {
        if (content == null || content.ciphertext() == null || content.ciphertext().length == 0
                || content.iv() == null || content.iv().length != IV_LENGTH
                || content.keyVersion() == null || content.keyVersion().isBlank()
                || content.hmac() == null || content.hmac().isBlank()) {
            throw new BusinessException(MESSAGE_READ_UNAVAILABLE, "消息正文密文不完整");
        }
    }

    private record Keys(SecretKeySpec encryptionKey, SecretKeySpec hmacKey) {
    }
}
