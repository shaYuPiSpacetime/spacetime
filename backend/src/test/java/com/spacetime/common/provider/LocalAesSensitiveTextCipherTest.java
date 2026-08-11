package com.spacetime.common.provider;

import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.model.message.EncryptedMessageContent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("本地消息正文AES-256-GCM加密")
class LocalAesSensitiveTextCipherTest {

    @Test
    @DisplayName("相同正文应使用随机IV生成不同密文且均可解密")
    void shouldRoundTripWithRandomIv() {
        LocalAesSensitiveTextCipher cipher = cipher();

        EncryptedMessageContent first = cipher.encrypt("你好，我也想认识你");
        EncryptedMessageContent second = cipher.encrypt("你好，我也想认识你");

        assertThat(first.iv()).hasSize(12).isNotEqualTo(second.iv());
        assertThat(first.ciphertext()).isNotEqualTo(second.ciphertext());
        assertThat(cipher.decrypt(first)).isEqualTo("你好，我也想认识你");
        assertThat(cipher.decrypt(second)).isEqualTo("你好，我也想认识你");
    }

    @Test
    @DisplayName("HMAC被篡改时不得返回正文")
    void shouldRejectTamperedHmac() {
        LocalAesSensitiveTextCipher cipher = cipher();
        EncryptedMessageContent encrypted = cipher.encrypt("原始正文");
        char replacement = encrypted.hmac().charAt(0) == '0' ? '1' : '0';
        String tamperedHmac = replacement + encrypted.hmac().substring(1);
        EncryptedMessageContent tampered = new EncryptedMessageContent(
                encrypted.ciphertext(), encrypted.iv(), encrypted.keyVersion(), tamperedHmac);

        assertThatThrownBy(() -> cipher.decrypt(tampered))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("完整性校验失败");
    }

    private LocalAesSensitiveTextCipher cipher() {
        byte[] encryptionKey = new byte[32];
        byte[] hmacKey = new byte[32];
        Arrays.fill(encryptionKey, (byte) 7);
        Arrays.fill(hmacKey, (byte) 9);
        return new LocalAesSensitiveTextCipher(
                "test-v1",
                Base64.getEncoder().encodeToString(encryptionKey),
                Base64.getEncoder().encodeToString(hmacKey));
    }
}
