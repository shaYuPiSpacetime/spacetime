package com.spacetime.common.provider;

/**
 * 学历认证 Provider。
 *
 * <p>统一承接学信网验证码、证书编号和证书材料核验。后续可按认证方式路由到不同三方。</p>
 */
public interface EducationVerificationProvider {

    /**
     * 核验学历提交内容。
     *
     * @param educationMethod 认证方式
     * @param schoolName 学校名称
     * @param materialJson 学历提交材料
     * @return Provider 核验结果
     */
    ProviderCheckResult check(String educationMethod, String schoolName, String materialJson);
}
