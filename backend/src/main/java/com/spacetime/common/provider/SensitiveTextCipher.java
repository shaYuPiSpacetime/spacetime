package com.spacetime.common.provider;

import com.spacetime.common.model.message.EncryptedMessageContent;

/** 敏感消息正文加解密边界。 */
public interface SensitiveTextCipher {
    /** 使用独立 HMAC 密钥生成稳定正文指纹，用于幂等参数一致性校验。 */
    String fingerprint(String plaintext);
    EncryptedMessageContent encrypt(String plaintext);
    String decrypt(EncryptedMessageContent content);
}
