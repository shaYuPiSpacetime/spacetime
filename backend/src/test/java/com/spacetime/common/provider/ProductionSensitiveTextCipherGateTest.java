package com.spacetime.common.provider;

import com.spacetime.common.model.message.EncryptedMessageContent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("生产消息加密门禁")
class ProductionSensitiveTextCipherGateTest {

    private final ProductionSensitiveTextCipherGate gate = new ProductionSensitiveTextCipherGate();

    @Test
    @DisplayName("KMS未接入时应明确拒绝加密和解密而不是阻止应用装配")
    void shouldFailClosedUntilKmsProviderIsConfigured() {
        assertThatThrownBy(() -> gate.encrypt("消息"))
                .hasMessageContaining("KMS");
        assertThatThrownBy(() -> gate.decrypt(
                new EncryptedMessageContent(new byte[]{1}, new byte[12], "v1", "hmac")))
                .hasMessageContaining("KMS");
    }
}
