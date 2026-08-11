package com.spacetime.common.model.message;

/** AES-GCM 密文及其完整性元数据。 */
public record EncryptedMessageContent(
        byte[] ciphertext,
        byte[] iv,
        String keyVersion,
        String hmac,
        String moderationProvider,
        String moderationDecisionNo) {

    public EncryptedMessageContent(byte[] ciphertext, byte[] iv, String keyVersion, String hmac) {
        this(ciphertext, iv, keyVersion, hmac, null, null);
    }

    public EncryptedMessageContent withModeration(String provider, String decisionNo) {
        return new EncryptedMessageContent(ciphertext, iv, keyVersion, hmac, provider, decisionNo);
    }
}
