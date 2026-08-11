package com.spacetime.common.provider;

/** 即时通信渠道错误，显式区分可重试与永久失败。 */
public class InstantMessageException extends RuntimeException {
    private final String providerCode;
    private final boolean retryable;

    public InstantMessageException(String providerCode, String message, boolean retryable) {
        super(message);
        this.providerCode = providerCode;
        this.retryable = retryable;
    }

    public String getProviderCode() {
        return providerCode;
    }

    public boolean isRetryable() {
        return retryable;
    }
}
