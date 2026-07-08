package com.spacetime.common.provider;

/**
 * 开放性文字内容安全机审 Provider。
 */
public interface TextSafetyProvider {
    /**
     * 检查开放性文字是否安全。
     *
     * @param fieldName 字段类型
     * @param contentText 文本内容
     * @return 机审结果
     */
    ProviderCheckResult check(String fieldName, String contentText);
}
