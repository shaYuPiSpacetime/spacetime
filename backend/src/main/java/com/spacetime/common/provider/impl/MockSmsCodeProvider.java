package com.spacetime.common.provider.impl;

import com.spacetime.common.provider.SmsCodeProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

/**
 * mock 短信验证码 Provider。
 *
 * 联调环境固定生成 000000，避免依赖真实短信三方；接入真实通道时替换 Provider。
 */
@Slf4j
@Primary
@Component
public class MockSmsCodeProvider implements SmsCodeProvider {

    @Override
    public String providerCode() {
        return "MOCK";
    }

    @Override
    public String generateCode() {
        return "000000";
    }

    @Override
    public void sendLoginCode(String phone, String code, int validMinutes) {
        log.info("mock sms login code sent, phone={}, validMinutes={}", phone, validMinutes);
    }
}
