package com.spacetime.common.provider;

/**
 * 语音内容安全机审 Provider。
 */
public interface AudioSafetyProvider {
    /**
     * 检查语音介绍是否安全。
     *
     * @param voiceUrl 语音文件 URL
     * @param duration 语音时长，单位秒
     * @return 机审结果
     */
    ProviderCheckResult check(String voiceUrl, Integer duration);
}
