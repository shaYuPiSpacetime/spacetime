package com.spacetime.common.provider;

import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.model.message.EncryptedMessageContent;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/** 生产 KMS Provider 未接入前的失败关闭门禁，避免影响应用其他模块启动。 */
@Component
@Profile("prod")
@ConditionalOnProperty(name = "message.security.provider", havingValue = "unavailable", matchIfMissing = true)
public class ProductionSensitiveTextCipherGate implements SensitiveTextCipher {
    private static final int MESSAGE_WRITE_UNAVAILABLE = 30018;
    private static final int MESSAGE_READ_UNAVAILABLE = 30024;

    @Override
    public String fingerprint(String plaintext) {
        throw new BusinessException(MESSAGE_WRITE_UNAVAILABLE, "生产消息KMS未配置，暂不可发送消息");
    }

    @Override
    public EncryptedMessageContent encrypt(String plaintext) {
        throw new BusinessException(MESSAGE_WRITE_UNAVAILABLE, "生产消息KMS未配置，暂不可发送消息");
    }

    @Override
    public String decrypt(EncryptedMessageContent content) {
        throw new BusinessException(MESSAGE_READ_UNAVAILABLE, "生产消息KMS未配置，暂不可读取消息");
    }
}
