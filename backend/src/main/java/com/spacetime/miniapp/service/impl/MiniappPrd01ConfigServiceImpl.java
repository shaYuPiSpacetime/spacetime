package com.spacetime.miniapp.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.enums.ConfigGroupEnum;
import com.spacetime.miniapp.service.MiniappPrd01ConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 移动端 PRD01 配置服务实现。
 *
 * 配置表只覆盖运营可调项，接口始终返回完整结构，避免移动端缺字段时无法渲染。
 */
@Service
@RequiredArgsConstructor
public class MiniappPrd01ConfigServiceImpl implements MiniappPrd01ConfigService {

    private static final String EDUCATION_SLA_HOURS_KEY = "prd01.audit.education.sla_hours";
    private static final String UPLOAD_RULES_KEY = "prd01.upload.rules";
    private static final String SMS_RULES_KEY = "prd01.security.sms.rules";

    private final AppConfigDao appConfigDao;
    private final ObjectMapper objectMapper;
    private final Prd01FieldConfigResolver fieldConfigResolver;

    /** 获取 PRD01 移动端初始化配置。 */
    @Override
    public Map<String, Object> getPrd01Config() {
        Map<String, String> uploadConfig = loadGroup(ConfigGroupEnum.PRD01_UPLOAD.getCode());
        Map<String, String> auditConfig = loadGroup(ConfigGroupEnum.PRD01_AUDIT.getCode());

        Map<String, Object> result = new HashMap<>();
        result.put("initFields", fieldConfigResolver.initFieldsForMobile());
        result.put("requiredFields", fieldConfigResolver.requiredFields());
        result.put("uploadLimits", uploadLimits(uploadConfig));
        result.put("regionScope", regionScope());
        result.put("auditPolicy", auditPolicy(auditConfig));
        result.put("smsSecurity", smsSecurity(auditConfig));
        result.put("openTextFields", List.of("ABOUT_ME", "HOPE_THEY_KNOW", "PROFILE_QA"));
        return result;
    }

    /** 按配置分组加载 key-value，缺失分组时返回空 map。 */
    private Map<String, String> loadGroup(String group) {
        Map<String, String> values = new HashMap<>();
        List<AppConfig> configs = appConfigDao.selectByGroup(group);
        if (configs == null) {
            return values;
        }
        for (AppConfig config : configs) {
            values.put(config.getConfigKey(), config.getConfigValue());
        }
        return values;
    }

    /** 上传限制，移动端用于控制三类图片上传；语音时长固定 10-60 秒。 */
    private Map<String, Object> uploadLimits(Map<String, String> config) {
        Map<String, Object> limits = new HashMap<>();
        List<JsonNode> rules = readRows(config.get(UPLOAD_RULES_KEY));
        limits.put("educationMaterialMaxCount", uploadRuleInt(rules, "education", "maxCount", 4));
        limits.put("educationMaterialMaxMb", uploadRuleInt(rules, "education", "maxMb", 10));
        limits.put("albumMaxCount", uploadRuleInt(rules, "album", "maxCount", 9));
        limits.put("albumMaxMb", uploadRuleInt(rules, "album", "maxMb", 10));
        limits.put("profileBgMaxCount", uploadRuleInt(rules, "profileBg", "maxCount", 1));
        limits.put("profileBgMaxMb", uploadRuleInt(rules, "profileBg", "maxMb", 10));
        limits.put("imageFormats", List.of("jpg", "jpeg", "png"));
        limits.put("voiceMinDuration", 10);
        limits.put("voiceMaxDuration", 60);
        return limits;
    }

    /** 地区范围按用户确认口径，不支持海外/国家入口。 */
    private Map<String, Object> regionScope() {
        Map<String, Object> scope = new HashMap<>();
        scope.put("supportsOverseas", false);
        scope.put("supportsLocation", true);
        scope.put("locationDictPath", "/miniapp/dict/locations");
        return scope;
    }

    /** 审核策略，当前只向移动端暴露学历审核承诺时间。 */
    private Map<String, Object> auditPolicy(Map<String, String> config) {
        Map<String, Object> policy = new HashMap<>();
        int educationSlaHours = parsePositiveInt(config.get(EDUCATION_SLA_HOURS_KEY), 24);
        policy.put("educationSlaHours", educationSlaHours);
        policy.put("educationSlaText", "学历材料审核预计 " + educationSlaHours + " 小时内完成");
        return policy;
    }

    /** 短信验证码频控配置，移动端用于倒计时、有效期和每日次数展示。 */
    private Map<String, Object> smsSecurity(Map<String, String> config) {
        Map<String, Object> security = new HashMap<>();
        List<JsonNode> rows = readRows(config.get(SMS_RULES_KEY));
        security.put("sendCountdownSeconds", securityRuleInt(rows, "sendCountdownSeconds", 60));
        security.put("validMinutes", securityRuleInt(rows, "validMinutes", 5));
        security.put("dailySendLimit", securityRuleInt(rows, "dailySendLimit", 10));
        security.put("providerCode", "MOCK");
        return security;
    }

    /** 审核时限只能使用大于 0 的整数；配置异常时回退默认 24 小时。 */
    private int parsePositiveInt(String value, int defaultValue) {
        if (value == null || !value.trim().matches("[1-9]\\d*")) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException ex) {
            return defaultValue;
        }
    }

    private int parseInt(String value, int defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException ex) {
            return defaultValue;
        }
    }

    private List<JsonNode> readRows(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode rows = root.isArray() ? root : root.get("rows");
            if (rows == null || !rows.isArray()) {
                return List.of();
            }
            List<JsonNode> result = new ArrayList<>();
            rows.forEach(result::add);
            return result;
        } catch (Exception ex) {
            return List.of();
        }
    }

    private int uploadRuleInt(List<JsonNode> rows, String key, String field, int defaultValue) {
        for (JsonNode row : rows) {
            if (key.equals(row.path("key").asText())) {
                return parsePositiveInt(row.path(field).asText(), defaultValue);
            }
        }
        return defaultValue;
    }

    private int securityRuleInt(List<JsonNode> rows, String key, int defaultValue) {
        for (JsonNode row : rows) {
            if (key.equals(row.path("key").asText())) {
                return parsePositiveInt(row.path("value").asText(), defaultValue);
            }
        }
        return defaultValue;
    }
}
