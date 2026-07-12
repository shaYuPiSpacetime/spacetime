package com.spacetime.miniapp.service.impl;

import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.enums.ConfigGroupEnum;
import com.spacetime.miniapp.service.MiniappPrd01ConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

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

    private final AppConfigDao appConfigDao;

    /** 获取 PRD01 移动端初始化配置。 */
    @Override
    public Map<String, Object> getPrd01Config() {
        Map<String, String> uploadConfig = loadGroup(ConfigGroupEnum.PRD01_UPLOAD.getCode());
        Map<String, String> auditConfig = loadGroup(ConfigGroupEnum.PRD01_AUDIT.getCode());

        Map<String, Object> result = new HashMap<>();
        result.put("requiredFields", List.of(
                "gender",
                "birthday",
                "height",
                "datingGoal",
                "emotionalStatus",
                "educationLevel",
                "locationProvince",
                "locationCity"));
        result.put("uploadLimits", uploadLimits(uploadConfig));
        result.put("regionScope", regionScope());
        result.put("auditPolicy", auditPolicy(auditConfig));
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

    /** 上传限制，移动端用于控制相册数量和语音时长。 */
    private Map<String, Object> uploadLimits(Map<String, String> config) {
        Map<String, Object> limits = new HashMap<>();
        limits.put("albumMaxCount", parseInt(config.get("prd01.upload.album.max_count"), 6));
        limits.put("voiceMinDuration", parseInt(config.get("prd01.upload.voice.min_duration"), 10));
        limits.put("voiceMaxDuration", parseInt(config.get("prd01.upload.voice.max_duration"), 60));
        return limits;
    }

    /** 地区范围按用户确认口径，不支持海外/国家入口。 */
    private Map<String, Object> regionScope() {
        Map<String, Object> scope = new HashMap<>();
        scope.put("supportsOverseas", false);
        return scope;
    }

    /** 审核策略，当前语音 Provider 先走 MOCK，后续可由配置切换真实三方。 */
    private Map<String, Object> auditPolicy(Map<String, String> config) {
        Map<String, Object> policy = new HashMap<>();
        int educationSlaHours = parsePositiveInt(config.get(EDUCATION_SLA_HOURS_KEY), 24);
        policy.put("educationSlaHours", educationSlaHours);
        policy.put("educationSlaText", "学历材料审核预计 " + educationSlaHours + " 小时内完成");
        policy.put("voiceProvider", config.getOrDefault("prd01.audit.voice.provider", "MOCK"));
        policy.put("textProvider", config.getOrDefault("prd01.audit.text.provider", "MOCK"));
        return policy;
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
}
