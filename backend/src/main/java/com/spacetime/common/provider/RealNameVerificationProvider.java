package com.spacetime.common.provider;

/**
 * 实名三要素核验 Provider。
 * 真实通道接入时只替换实现，不改变移动端接口和统一审核记录结构。
 */
public interface RealNameVerificationProvider {

    /**
     * 核验真实姓名、身份证号与账号绑定手机号是否一致。
     */
    ProviderCheckResult check(String realName, String idCardNo, String phone);
}
