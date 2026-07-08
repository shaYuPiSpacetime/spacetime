package com.spacetime.miniapp.service;

import java.util.Map;

/**
 * 移动端 PRD01 配置服务。
 */
public interface MiniappPrd01ConfigService {
    /**
     * 获取用户准入与资料认证初始化所需的移动端配置。
     *
     * @return 必填字段、上传限制、地区范围、审核策略和开放性文字字段
     */
    Map<String, Object> getPrd01Config();
}
