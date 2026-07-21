package com.spacetime.miniapp.service.impl;

import com.spacetime.miniapp.service.MiniappPrd01ConfigService;
import com.spacetime.common.service.Prd01RuntimeConfigResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 移动端 PRD01 配置服务实现。
 *
 * <p>配置表只覆盖运营可调项，接口始终返回完整结构，避免移动端缺字段时无法渲染。</p>
 */
@Service
@RequiredArgsConstructor
public class MiniappPrd01ConfigServiceImpl implements MiniappPrd01ConfigService {

    private final Prd01FieldConfigResolver fieldConfigResolver;
    private final Prd01RuntimeConfigResolver runtimeConfigResolver;

    /** 获取 PRD01 移动端初始化配置。 */
    @Override
    public Map<String, Object> getPrd01Config() {
        Prd01RuntimeConfigResolver.RuntimeConfigSnapshot snapshot = runtimeConfigResolver.snapshot();
        Prd01RuntimeConfigResolver.AuditPolicy auditPolicy = runtimeConfigResolver.auditPolicy(snapshot);

        Map<String, Object> auditPolicyData = new LinkedHashMap<>();
        auditPolicyData.put("educationSlaHours", auditPolicy.educationSlaHours());
        auditPolicyData.put("educationSlaText", auditPolicy.educationSlaText());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("accessPolicy", runtimeConfigResolver.accessPolicy(snapshot));
        result.put("initFields", fieldConfigResolver.initFieldsForMobile());
        result.put("requiredFields", fieldConfigResolver.requiredFields());
        result.put("fieldSettings", runtimeConfigResolver.fieldSettings(snapshot));
        result.put("profileCompleteness", runtimeConfigResolver.profileCompleteness(snapshot));
        result.put("copywriting", runtimeConfigResolver.copywriting(snapshot));
        result.put("uploadLimits", runtimeConfigResolver.uploadLimits(snapshot));
        result.put("regionScope", regionScope());
        result.put("auditPolicy", auditPolicyData);
        result.put("smsSecurity", runtimeConfigResolver.smsSecurity(snapshot));
        result.put("openTextFields", List.of("ABOUT_ME", "PROFILE_QA"));
        result.put("configUpdatedAt", runtimeConfigResolver.configUpdatedAt(snapshot));
        return result;
    }

    /** 地区范围按用户确认口径，不支持海外/国家入口。 */
    private Map<String, Object> regionScope() {
        Map<String, Object> scope = new LinkedHashMap<>();
        scope.put("supportsOverseas", false);
        scope.put("supportsLocation", true);
        scope.put("locationDictPath", "/miniapp/dict/locations");
        return scope;
    }
}
