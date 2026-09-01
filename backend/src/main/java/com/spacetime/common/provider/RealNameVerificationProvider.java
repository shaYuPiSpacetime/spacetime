package com.spacetime.common.provider;

/**
 * 身份证二要素核验 Provider。
 * 真实通道接入时只替换实现，不改变移动端接口和统一审核记录结构。
 */
public interface RealNameVerificationProvider {

    /**
     * 核验真实姓名与身份证号是否一致。
     */
    ProviderCheckResult check(String realName, String idCardNo);
}
