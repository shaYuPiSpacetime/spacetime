package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.constant.ProfileDictType;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.enums.ConfigGroupEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.response.BasicProfileFieldVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * PRD01 首登字段配置解析器。
 *
 * 后台字段配置存储的是原子字段；移动端首登流程需要按 5 个业务步骤展示，
 * 因此这里统一负责“原子字段 -> 首登业务字段”的转换和必填校验。
 */
@Component
@RequiredArgsConstructor
public class Prd01FieldConfigResolver {

    static final String PROFILE_FIELD_CONFIG_KEY = "prd01.profile.fieldSettings";
    private static final String MIN_AGE_KEY = "prd01.access.minAge";
    private static final String MAX_AGE_KEY = "prd01.access.maxAge";

    /** 基本资料页字段顺序和不可配置的交互元数据。 */
    private static final List<BasicFieldDefinition> BASIC_FIELDS = List.of(
            field("nickname", "nickname", "昵称", "input", true, null, null, null, 2, 12),
            field("gender", "gender", "性别", "select", true, null, null, null, null, null),
            field("birthday", "birthday", "出生日期", "date", true, null, null, null, null, null),
            field("locationProvince", "locationProvince", "现居省份", "region", true, null, null, null, null, null),
            field("locationCity", "locationCity", "现居城市", "region", true, null, null, null, null, null),
            field("locationDistrict", "locationDistrict", "现居区县", "region", true, null, null, null, null, null),
            field("height", "height", "身高", "number", true, null, 140, 220, null, null),
            field("weight", "weight", "体重", "number", true, null, 30, 200, null, null),
            field("hometownProvince", "hometownProvince", "家乡省份", "region", true, null, null, null, null, null),
            field("hometownCity", "hometownCity", "家乡城市", "region", true, null, null, null, null, null),
            field("hometownDistrict", "hometownDistrict", "家乡区县", "region", true, null, null, null, null, null),
            field("identity", "identity", "身份", "dict", true, ProfileDictType.IDENTITY, null, null, null, null, "identityType"),
            field("educationLevel", "educationLevel", "最高学历", "dict", true, ProfileDictType.EDUCATION_LEVEL, null, null, null, null),
            field("industry", "industry", "行业", "dict", true, ProfileDictType.INDUSTRY, null, null, null, null),
            field("occupation", "occupation", "职业", "dict", true, ProfileDictType.OCCUPATION, null, null, null, null),
            field("company", "company", "公司", "input", true, null, null, null, 2, 50),
            field("annualIncome", "annualIncomeRange", "年收入", "dict", true, ProfileDictType.ANNUAL_INCOME, null, null, null, null),
            field("school", "school", "学校", "input", true, null, null, null, 2, 50),
            field("major", "major", "专业", "input", true, null, null, null, null, 100),
            field("maritalStatus", "maritalStatus", "婚姻状况", "dict", true, ProfileDictType.MARITAL_STATUS, null, null, null, null)
    );

    private final AppConfigDao appConfigDao;
    private final ObjectMapper objectMapper;

    /** 返回移动端首登 5 个业务字段的展示、必填和提交字段配置。 */
    List<Map<String, Object>> initFieldsForMobile() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (InitFieldRule rule : initRules()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("step", rule.step);
            item.put("fieldId", rule.fieldId);
            item.put("label", rule.label);
            item.put("visible", rule.visible);
            item.put("required", rule.required);
            item.put("allowEmpty", rule.visible && !rule.required);
            item.put("submitFields", rule.submitFields);
            result.add(item);
        }
        return result;
    }

    /** 返回首登配置中真正需要后端校验的原子字段。 */
    List<String> requiredFields() {
        List<String> fields = new ArrayList<>();
        for (InitFieldRule rule : initRules()) {
            fields.addAll(rule.requiredSubmitFields);
        }
        return fields;
    }

    /** 返回基础资料页全量字段配置；隐藏字段也返回，移动端按 visible 决定是否渲染。 */
    List<BasicProfileFieldVO> basicFieldsForMobile() {
        Map<String, FieldState> states = loadFieldStates();
        List<BasicProfileFieldVO> result = new ArrayList<>();
        for (BasicFieldDefinition definition : BASIC_FIELDS) {
            FieldState state = state(states, definition.configFieldId, definition.aliases);
            BasicProfileFieldVO item = new BasicProfileFieldVO();
            item.setFieldId(definition.fieldId);
            item.setLabel(definition.label);
            item.setFieldType(definition.fieldType);
            item.setVisible(state.visible);
            item.setRequired(state.visible && state.required);
            item.setEditable(definition.editable);
            item.setDictType(definition.dictType);
            item.setMinValue(definition.minValue);
            item.setMaxValue(definition.maxValue);
            item.setMinLength(definition.minLength);
            item.setMaxLength(definition.maxLength);
            result.add(item);
        }
        return result;
    }

    /** 返回当前用户缺失的“展示且必填”基础资料字段。 */
    List<String> missingRequiredBasicFields(AppUser user, List<BasicProfileFieldVO> settings) {
        List<String> result = new ArrayList<>();
        for (BasicProfileFieldVO setting : settings) {
            if (Boolean.TRUE.equals(setting.getVisible())
                    && Boolean.TRUE.equals(setting.getRequired())
                    && !isFieldFilled(user, setting.getFieldId())) {
                result.add(setting.getFieldId());
            }
        }
        return result;
    }

    /** 基础资料保存前校验所有动态必填项。 */
    void validateRequiredBasicFields(AppUser user, List<BasicProfileFieldVO> settings) {
        List<String> missing = missingRequiredBasicFields(user, settings);
        if (missing.isEmpty()) {
            return;
        }
        String fieldId = missing.getFirst();
        String label = settings.stream()
                .filter(item -> fieldId.equals(item.getFieldId()))
                .map(BasicProfileFieldVO::getLabel)
                .findFirst()
                .orElse(fieldId);
        throw new BusinessException(label + "不能为空");
    }

    /** 判断某个基础资料字段当前是否展示；隐藏字段不允许被保存接口改写。 */
    boolean isBasicFieldVisible(List<BasicProfileFieldVO> settings, String fieldId) {
        return settings.stream()
                .anyMatch(item -> fieldId.equals(item.getFieldId()) && Boolean.TRUE.equals(item.getVisible()));
    }

    /** 读取后台年龄范围配置，配置缺失或非法时回退 18-60。 */
    AgeRange ageRange() {
        int minAge = 18;
        int maxAge = 60;
        List<AppConfig> configs = appConfigDao.selectByGroup(ConfigGroupEnum.PRD01_ACCESS.getCode());
        if (configs != null) {
            for (AppConfig config : configs) {
                if (MIN_AGE_KEY.equals(config.getConfigKey())) {
                    minAge = positiveInt(config.getConfigValue(), minAge);
                } else if (MAX_AGE_KEY.equals(config.getConfigKey())) {
                    maxAge = positiveInt(config.getConfigValue(), maxAge);
                }
            }
        }
        return maxAge >= minAge ? new AgeRange(minAge, maxAge) : new AgeRange(18, 60);
    }

    /** 兼容历史用户：尚未保存显式进度时，根据必填资料推断下一步。 */
    int inferNextStep(AppUser user) {
        for (InitFieldRule rule : initRules()) {
            if (rule.required && !isRuleFilled(user, rule)) {
                return rule.step;
            }
        }
        Integer lastStep = lastVisibleStep();
        return lastStep == null ? 1 : lastStep;
    }

    /** 返回指定步骤及其后的第一个可展示步骤；全部完成时返回空。 */
    Integer nextVisibleStep(int fromStep) {
        for (InitFieldRule rule : initRules()) {
            if (rule.step >= fromStep && rule.visible) {
                return rule.step;
            }
        }
        return null;
    }

    /** 校验提交步骤当前是否允许展示。 */
    void validateVisibleStep(int step) {
        InitFieldRule rule = rule(step);
        if (!rule.visible) {
            throw new BusinessException("第" + step + "步当前未启用");
        }
    }

    /** 校验当前步骤配置为必填的字段。 */
    void validateRequiredStepFields(AppUser user, int step) {
        InitFieldRule rule = rule(step);
        if (rule.required && !isRuleFilled(user, rule)) {
            throw new BusinessException(rule.label + "不能为空");
        }
    }

    /** 返回当前进度前已经走过的可见步骤。 */
    List<Integer> completedVisibleSteps(Integer nextStep) {
        List<Integer> result = new ArrayList<>();
        for (InitFieldRule rule : initRules()) {
            if (rule.visible && (nextStep == null || rule.step < nextStep)) {
                result.add(rule.step);
            }
        }
        return result;
    }

    /** 返回最后一个可见步骤；没有可见步骤时返回空。 */
    Integer lastVisibleStep() {
        Integer result = null;
        for (InitFieldRule rule : initRules()) {
            if (rule.visible) {
                result = rule.step;
            }
        }
        return result;
    }

    /** 完成首登时只校验后台配置为展示且必填的 5 类基础字段。 */
    void validateRequiredInitFields(AppUser user) {
        for (InitFieldRule rule : initRules()) {
            if (rule.required && !isRuleFilled(user, rule)) {
                throw new BusinessException(rule.label + "不能为空");
            }
        }
    }

    private InitFieldRule rule(int step) {
        return initRules().stream()
                .filter(item -> item.step == step)
                .findFirst()
                .orElseThrow(() -> new BusinessException("首登步骤必须在1-5之间"));
    }

    private List<InitFieldRule> initRules() {
        Map<String, FieldState> states = loadFieldStates();
        List<InitFieldRule> rules = new ArrayList<>();
        rules.add(simpleRule(1, "gender", "性别", state(states, "gender")));
        rules.add(simpleRule(2, "birthday", "年龄", state(states, "birthday")));
        rules.add(simpleRule(3, "identity", "身份", state(states, "identity", "identityType")));
        rules.add(simpleRule(4, "educationLevel", "学历", state(states, "educationLevel")));
        rules.add(locationRule(states));
        return rules;
    }

    private InitFieldRule simpleRule(int step, String fieldId, String label, FieldState state) {
        List<String> submitFields = List.of(fieldId);
        List<String> requiredSubmitFields = state.visible && state.required ? submitFields : List.of();
        return new InitFieldRule(step, fieldId, label, state.visible, !requiredSubmitFields.isEmpty(), submitFields, requiredSubmitFields);
    }

    private InitFieldRule locationRule(Map<String, FieldState> states) {
        List<String> submitFields = List.of("locationProvince", "locationCity", "locationDistrict");
        List<String> requiredSubmitFields = new ArrayList<>();
        boolean visible = false;
        for (String field : submitFields) {
            FieldState state = state(states, field);
            visible = visible || state.visible;
            if (state.visible && state.required) {
                requiredSubmitFields.add(field);
            }
        }
        return new InitFieldRule(5, "location", "地址", visible, !requiredSubmitFields.isEmpty(), submitFields, requiredSubmitFields);
    }

    private FieldState state(Map<String, FieldState> states, String fieldId, String... aliases) {
        FieldState state = states.get(fieldId);
        if (state != null) {
            return state;
        }
        for (String alias : aliases) {
            state = states.get(alias);
            if (state != null) {
                return state;
            }
        }
        return defaultState(fieldId);
    }

    private Map<String, FieldState> loadFieldStates() {
        Map<String, FieldState> states = new HashMap<>();
        String json = loadFieldConfigJson();
        if (StrUtil.isBlank(json)) {
            return states;
        }
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode rows = root.isArray() ? root : root.get("rows");
            if (rows == null || !rows.isArray()) {
                return states;
            }
            for (JsonNode row : rows) {
                String fieldId = row.path("fieldId").asText();
                if (StrUtil.isBlank(fieldId)) {
                    continue;
                }
                FieldState fallback = defaultState(fieldId);
                boolean visible = row.has("visible") ? row.path("visible").asBoolean(fallback.visible) : fallback.visible;
                boolean required = row.has("required") ? row.path("required").asBoolean(fallback.required) : fallback.required;
                states.put(fieldId, new FieldState(visible, required));
            }
        } catch (Exception ignored) {
            return states;
        }
        return states;
    }

    private String loadFieldConfigJson() {
        List<AppConfig> configs = appConfigDao.selectByGroup(ConfigGroupEnum.PRD01_PROFILE_FIELD.getCode());
        if (configs == null) {
            return null;
        }
        for (AppConfig config : configs) {
            if (PROFILE_FIELD_CONFIG_KEY.equals(config.getConfigKey())) {
                return config.getConfigValue();
            }
        }
        return null;
    }

    private FieldState defaultState(String fieldId) {
        return switch (fieldId) {
            case "gender", "birthday", "identity", "identityType", "educationLevel", "locationProvince", "locationCity" ->
                    new FieldState(true, true);
            case "nickname" -> new FieldState(true, true);
            case "locationDistrict", "height", "weight", "hometownProvince", "hometownCity", "hometownDistrict",
                    "industry", "occupation", "company", "annualIncome", "annualIncomeRange", "school", "major", "maritalStatus" ->
                    new FieldState(true, false);
            default -> new FieldState(false, false);
        };
    }

    private boolean isRuleFilled(AppUser user, InitFieldRule rule) {
        for (String field : rule.requiredSubmitFields) {
            if (!isFieldFilled(user, field)) {
                return false;
            }
        }
        return true;
    }

    private boolean isFieldFilled(AppUser user, String field) {
        return switch (field) {
            case "gender" -> StrUtil.isNotBlank(user.getGender());
            case "birthday" -> user.getBirthday() != null;
            case "identity" -> StrUtil.isNotBlank(user.getIdentity());
            case "educationLevel" -> StrUtil.isNotBlank(user.getEducationLevel());
            case "locationProvince" -> StrUtil.isNotBlank(user.getLocationProvince());
            case "locationCity" -> StrUtil.isNotBlank(user.getLocationCity());
            case "locationDistrict" -> StrUtil.isNotBlank(user.getLocationDistrict());
            case "nickname" -> StrUtil.isNotBlank(user.getNickname());
            case "height" -> user.getHeight() != null;
            case "weight" -> user.getWeight() != null;
            case "hometownProvince" -> StrUtil.isNotBlank(user.getHometownProvince());
            case "hometownCity" -> StrUtil.isNotBlank(user.getHometownCity());
            case "hometownDistrict" -> StrUtil.isNotBlank(user.getHometownDistrict());
            case "industry" -> StrUtil.isNotBlank(user.getIndustry());
            case "occupation" -> StrUtil.isNotBlank(user.getOccupation());
            case "company" -> StrUtil.isNotBlank(user.getCompany());
            case "annualIncome" -> StrUtil.isNotBlank(user.getAnnualIncome());
            case "school" -> StrUtil.isNotBlank(user.getSchool());
            case "major" -> StrUtil.isNotBlank(user.getMajor());
            case "maritalStatus" -> StrUtil.isNotBlank(user.getMaritalStatus());
            default -> true;
        };
    }

    private int positiveInt(String value, int fallback) {
        if (StrUtil.isBlank(value) || !value.trim().matches("[1-9]\\d*")) {
            return fallback;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    private static BasicFieldDefinition field(
            String fieldId,
            String configFieldId,
            String label,
            String fieldType,
            boolean editable,
            String dictType,
            Integer minValue,
            Integer maxValue,
            Integer minLength,
            Integer maxLength,
            String... aliases) {
        return new BasicFieldDefinition(fieldId, configFieldId, label, fieldType, editable, dictType,
                minValue, maxValue, minLength, maxLength, aliases);
    }

    private record FieldState(boolean visible, boolean required) {
    }

    record AgeRange(int minAge, int maxAge) {
    }

    private record BasicFieldDefinition(
            String fieldId,
            String configFieldId,
            String label,
            String fieldType,
            boolean editable,
            String dictType,
            Integer minValue,
            Integer maxValue,
            Integer minLength,
            Integer maxLength,
            String[] aliases) {
    }

    private record InitFieldRule(
            int step,
            String fieldId,
            String label,
            boolean visible,
            boolean required,
            List<String> submitFields,
            List<String> requiredSubmitFields) {
    }
}
