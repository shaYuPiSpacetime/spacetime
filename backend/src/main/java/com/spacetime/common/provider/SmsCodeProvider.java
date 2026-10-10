package com.spacetime.common.provider;

import java.security.SecureRandom;
import java.util.Locale;

/**
 * 短信验证码 Provider。
 *
 * 后续接入真实短信三方时实现该接口即可，登录接口和 Redis 频控逻辑不需要调整。
 */
public interface SmsCodeProvider {

    /** 真实登录验证码使用加密安全的随机源。 */
    SecureRandom CODE_RANDOM = new SecureRandom();

    /** Provider 编码，用于移动端配置和服务端日志识别。 */
    String providerCode();

    /** 生成验证码；真实短信通道默认使用 4 位随机数字。 */
    default String generateCode() {
        return String.format(Locale.ROOT, "%04d", CODE_RANDOM.nextInt(10_000));
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
