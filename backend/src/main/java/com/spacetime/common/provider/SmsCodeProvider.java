package com.spacetime.common.provider;

import java.util.concurrent.ThreadLocalRandom;

/**
 * 短信验证码 Provider。
 *
 * 后续接入真实短信三方时实现该接口即可，登录接口和 Redis 频控逻辑不需要调整。
 */
public interface SmsCodeProvider {

    /** Provider 编码，用于移动端配置和服务端日志识别。 */
    String providerCode();

    /** 生成验证码；真实短信通道默认使用 6 位随机数字。 */
    default String generateCode() {
        return String.format("%06d", ThreadLocalRandom.current().nextInt(0, 1_000_000));
    }

    /**
     * 发送登录验证码。
     *
     * @param phone 手机号
     * @param code 验证码
     * @param validMinutes 有效期，单位分钟
     */
    void sendLoginCode(String phone, String code, int validMinutes);
}
