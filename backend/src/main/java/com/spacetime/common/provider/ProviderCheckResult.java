package com.spacetime.common.provider;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * 第三方机审 Provider 返回结果。
 */
@Data
@AllArgsConstructor
public class ProviderCheckResult {
    /** 是否通过机审。 */
    private Boolean safe;
    /** Provider 编码，例如 MOCK_AUDIO、MOCK_TEXT。 */
    private String providerCode;
    /** Provider 原始响应，便于后台排查和审计。 */
    private String rawResponseJson;
    /** 是否 mock 结果。 */
    private Boolean mocked;
    /** 未通过原因，通过时为空。 */
    private String rejectReason;
    /** 三方异步任务编号，例如微信 media_check_async 返回的 trace_id。 */
    private String externalTaskId;

    public static ProviderCheckResult safe(String providerCode, String rawResponseJson, boolean mocked) {
        return new ProviderCheckResult(true, providerCode, rawResponseJson, mocked, null, null);
    }

    public static ProviderCheckResult unsafe(String providerCode, String rawResponseJson, boolean mocked, String rejectReason) {
        return new ProviderCheckResult(false, providerCode, rawResponseJson, mocked, rejectReason, null);
    }

    public static ProviderCheckResult pending(String providerCode, String rawResponseJson, boolean mocked,
            String externalTaskId, String detail) {
        return new ProviderCheckResult(null, providerCode, rawResponseJson, mocked, detail, externalTaskId);
    }
}
