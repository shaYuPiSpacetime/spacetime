package com.spacetime.common.service;

import cn.hutool.core.util.StrUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.entity.AppConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * PRD01 移动端运行时配置解析器。
 *
 * <p>只读取管理后台已经保存的配置，不修改配置结构和配置值。配置查询、提交校验和准入判断
 * 统一使用该解析器，避免同一规则在多个接口中出现不同的硬编码。</p>
 */
@Component
@RequiredArgsConstructor
public class Prd01RuntimeConfigResolver {

    static final String MIN_AGE_KEY = "prd01.access.minAge";
    static final String MAX_AGE_KEY = "prd01.access.maxAge";
    static final String FIELD_SETTINGS_KEY = "prd01.profile.fieldSettings";
    static final String SCORE_WEIGHTS_KEY = "prd01.profile.scoreWeights";
    static final String UPLOAD_RULES_KEY = "prd01.upload.rules";
    static final String EDUCATION_SLA_HOURS_KEY = "prd01.audit.education.sla_hours";
    static final String COPY_RULES_KEY = "prd01.copy.rules";
    static final String TEXT_LENGTH_RULES_KEY = "prd01.text.length.rules";
    static final String SMS_RULES_KEY = "prd01.security.sms.rules";

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final List<String> CONFIG_KEYS = List.of(
            MIN_AGE_KEY, MAX_AGE_KEY, FIELD_SETTINGS_KEY, SCORE_WEIGHTS_KEY, UPLOAD_RULES_KEY,
            EDUCATION_SLA_HOURS_KEY, COPY_RULES_KEY, TEXT_LENGTH_RULES_KEY, SMS_RULES_KEY);

    private final AppConfigDao appConfigDao;
    private final ObjectMapper objectMapper;

    /** 一次查询组装当前配置快照，保证单次接口响应使用同一版本配置。 */
    public RuntimeConfigSnapshot snapshot() {
        List<AppConfig> configs = appConfigDao.selectByKeys(CONFIG_KEYS);
        Map<String, AppConfig> byKey = configs == null ? Map.of() : configs.stream()
                .collect(Collectors.toMap(AppConfig::getConfigKey, Function.identity(), (left, right) -> right));
        return new RuntimeConfigSnapshot(byKey);
    }

    /** 移动端准入门槛；三重认证是固定业务规则，不提供运营开关。 */
    public Map<String, Object> accessPolicy(RuntimeConfigSnapshot snapshot) {
        int minAge = positiveInt(snapshot.value(MIN_AGE_KEY), 18);
        int maxAge = positiveInt(snapshot.value(MAX_AGE_KEY), 60);
        if (maxAge < minAge) {
            minAge = 18;
            maxAge = 60;
        }
        Map<String, Object> policy = new LinkedHashMap<>();
        policy.put("minAge", minAge);
        policy.put("maxAge", maxAge);
        policy.put("tripleCertificationRequired", true);
        policy.put("requiredCertifications", List.of("REAL_NAME", "AVATAR", "EDUCATION"));
        return policy;
    }

    /** 原样保留字段业务信息，并将开关值规范为布尔类型。 */
    public List<Map<String, Object>> fieldSettings(RuntimeConfigSnapshot snapshot) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (JsonNode row : rows(snapshot.value(FIELD_SETTINGS_KEY))) {
            String fieldId = row.path("fieldId").asText();
            if (StrUtil.isBlank(fieldId)) {
                continue;
            }
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("group", text(row, "group"));
            item.put("label", text(row, "label"));
            item.put("fieldId", fieldId);
            item.put("pageMenu", text(row, "pageMenu"));
            item.put("visible", row.path("visible").asBoolean(true));
            item.put("required", row.path("required").asBoolean(false));
            item.put("scoreEnabled", row.path("scoreEnabled").asBoolean(false));
            result.add(item);
        }
        return result;
    }

    /** 向移动端下发当前计分字段及在校生、职场人两套总分。 */
    public Map<String, Object> profileCompleteness(RuntimeConfigSnapshot snapshot) {
        Map<String, Boolean> scoreEnabled = fieldSettings(snapshot).stream()
                .collect(Collectors.toMap(
                        item -> String.valueOf(item.get("fieldId")),
                        item -> Boolean.TRUE.equals(item.get("visible")) && Boolean.TRUE.equals(item.get("scoreEnabled")),
                        (left, right) -> right));
        List<Map<String, Object>> items = new ArrayList<>();
        int studentTotal = 0;
        int workerTotal = 0;
        for (JsonNode row : rows(snapshot.value(SCORE_WEIGHTS_KEY))) {
            String fieldId = row.path("fieldId").asText();
            if (StrUtil.isBlank(fieldId) || !scoreEnabled.getOrDefault(fieldId, row.path("scoreEnabled").asBoolean(false))) {
                continue;
            }
            int studentScore = nonNegativeInt(row.path("studentScore").asText(), 0);
            int workerScore = nonNegativeInt(row.path("workerScore").asText(), 0);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("fieldId", fieldId);
            item.put("label", text(row, "label"));
            item.put("studentScore", studentScore);
            item.put("workerScore", workerScore);
            items.add(item);
            studentTotal += studentScore;
            workerTotal += workerScore;
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("studentTotalScore", studentTotal);
        result.put("workerTotalScore", workerTotal);
        result.put("items", items);
        return result;
    }

    /** 文案按 copyKey 返回；enabled=false 时由移动端隐藏。 */
    public Map<String, Object> copywriting(RuntimeConfigSnapshot snapshot) {
        Map<String, Object> result = new LinkedHashMap<>();
        appendCopyRows(result, snapshot.value(COPY_RULES_KEY));
        appendCopyRows(result, snapshot.value(TEXT_LENGTH_RULES_KEY));
        return result;
    }

    /** 上传限制，同时保留旧版扁平字段，避免破坏已经接入的客户端。 */
    public Map<String, Object> uploadLimits(RuntimeConfigSnapshot snapshot) {
        UploadRule education = uploadRule(snapshot, "education", 4, 10);
        UploadRule album = uploadRule(snapshot, "album", 9, 10);
        UploadRule profileBg = uploadRule(snapshot, "profileBg", 1, 10);
        UploadRule voice = uploadRule(snapshot, "voice", 1, 20);
        DurationRange voiceDuration = voiceDurationRange(snapshot);
        Map<String, Object> limits = new LinkedHashMap<>();
        limits.put("education", education.toMap());
        limits.put("album", album.toMap());
        limits.put("profileBg", profileBg.toMap());
        limits.put("voice", voice.toMap());
        limits.put("educationMaterialMaxCount", education.maxCount());
        limits.put("educationMaterialMaxMb", education.maxMb());
        limits.put("albumMaxCount", album.maxCount());
        limits.put("albumMaxMb", album.maxMb());
        limits.put("profileBgMaxCount", profileBg.maxCount());
        limits.put("profileBgMaxMb", profileBg.maxMb());
        limits.put("imageFormats", education.formats());
        limits.put("voiceMinDuration", voiceDuration.min());
        limits.put("voiceMaxDuration", voiceDuration.max());
        return limits;
    }

    /** 语音时长与语音上传规则使用同一配置行，保证客户端提示和服务端校验一致。 */
    public DurationRange voiceDurationRange(RuntimeConfigSnapshot snapshot) {
        for (JsonNode row : rows(snapshot.value(UPLOAD_RULES_KEY))) {
            if (!"voice".equals(row.path("key").asText())) {
                continue;
            }
            int min = positiveInt(row.path("minDuration").asText(), 10);
            int max = positiveInt(row.path("maxDuration").asText(), 60);
            return max >= min ? new DurationRange(min, max) : new DurationRange(10, 60);
        }
        return new DurationRange(10, 60);
    }

    public UploadRule uploadRule(RuntimeConfigSnapshot snapshot, String key, int defaultCount, int defaultMb) {
        for (JsonNode row : rows(snapshot.value(UPLOAD_RULES_KEY))) {
            if (!key.equals(row.path("key").asText())) {
                continue;
            }
            return new UploadRule(
                    positiveInt(row.path("maxCount").asText(), defaultCount),
                    positiveInt(row.path("maxMb").asText(), defaultMb),
                    formats(row.path("format").asText("jpg / jpeg / png")));
        }
        return new UploadRule(defaultCount, defaultMb, List.of("jpg", "jpeg", "png"));
    }

    public AuditPolicy auditPolicy(RuntimeConfigSnapshot snapshot) {
        int hours = positiveInt(snapshot.value(EDUCATION_SLA_HOURS_KEY), 24);
        return new AuditPolicy(hours, "学历认证预计" + hours + "小时内完成");
    }

    /** 短信验证码倒计时、有效期和每日次数沿用现有安全配置。 */
    public Map<String, Object> smsSecurity(RuntimeConfigSnapshot snapshot) {
        int countdown = 60;
        int validMinutes = 5;
        int dailyLimit = 10;
        for (JsonNode row : rows(snapshot.value(SMS_RULES_KEY))) {
            String key = row.path("key").asText();
            int value = positiveInt(row.path("value").asText(), 0);
            if (value <= 0) {
                continue;
            }
            switch (key) {
                case "sendCountdownSeconds" -> countdown = value;
                case "validMinutes" -> validMinutes = value;
                case "dailySendLimit" -> dailyLimit = value;
                default -> {
                    // 其他安全配置由对应业务接入后再消费。
                }
            }
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("sendCountdownSeconds", countdown);
        result.put("validMinutes", validMinutes);
        result.put("dailySendLimit", dailyLimit);
        result.put("providerCode", "MOCK");
        return result;
    }

    /** 当前快照中最新更新时间，供移动端判断是否需要刷新本地缓存。 */
    public String configUpdatedAt(RuntimeConfigSnapshot snapshot) {
        return snapshot.values().stream()
                .map(AppConfig::getUpdateTime)
                .filter(time -> time != null)
                .max(Comparator.naturalOrder())
                .map(TIME_FORMATTER::format)
                .orElse(null);
    }

    public boolean fieldVisible(RuntimeConfigSnapshot snapshot, String fieldId, boolean fallback) {
        return fieldSettings(snapshot).stream()
                .filter(item -> fieldId.equals(item.get("fieldId")))
                .map(item -> Boolean.TRUE.equals(item.get("visible")))
                .findFirst()
                .orElse(fallback);
    }

    public String copyText(RuntimeConfigSnapshot snapshot, String copyKey, String fallback) {
        Object value = copywriting(snapshot).get(copyKey);
        if (!(value instanceof Map<?, ?> item) || !Boolean.TRUE.equals(item.get("enabled"))) {
            return fallback;
        }
        String content = item.get("content") == null ? null : String.valueOf(item.get("content"));
        return StrUtil.blankToDefault(content, fallback);
    }

    private void appendCopyRows(Map<String, Object> target, String json) {
        for (JsonNode row : rows(json)) {
            String copyKey = row.path("copyKey").asText();
            if (StrUtil.isBlank(copyKey)) {
                continue;
            }
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("group", text(row, "group"));
            item.put("scene", text(row, "scene"));
            item.put("enabled", row.path("enabled").asBoolean(true));
            item.put("content", text(row, "content"));
            target.put(copyKey, item);
        }
    }

    private List<JsonNode> rows(String json) {
        if (StrUtil.isBlank(json)) {
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
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private List<String> formats(String value) {
        if (StrUtil.isBlank(value)) {
            return List.of("jpg", "jpeg", "png");
        }
        return List.of(value.split("/|,|\\|" )).stream()
                .map(String::trim)
                .filter(StrUtil::isNotBlank)
                .map(item -> item.toLowerCase(Locale.ROOT))
                .distinct()
                .toList();
    }

    private String text(JsonNode row, String field) {
        String value = row.path(field).asText();
        return StrUtil.isBlank(value) ? null : value;
    }

    private int positiveInt(String value, int fallback) {
        if (StrUtil.isBlank(value) || !value.trim().matches("[1-9]\\d*")) {
            return fallback;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException ignored) {
            return fallback;
        }
    }

    private int nonNegativeInt(String value, int fallback) {
        if (StrUtil.isBlank(value) || !value.trim().matches("\\d+")) {
            return fallback;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException ignored) {
            return fallback;
        }
    }

    public record RuntimeConfigSnapshot(Map<String, AppConfig> configs) {
        String value(String key) {
            AppConfig config = configs.get(key);
            return config == null ? null : config.getConfigValue();
        }

        List<AppConfig> values() {
            return List.copyOf(configs.values());
        }
    }

    public record UploadRule(int maxCount, int maxMb, List<String> formats) {
        Map<String, Object> toMap() {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("maxCount", maxCount);
            result.put("maxMb", maxMb);
            result.put("formats", formats);
            return result;
        }
    }

    public record DurationRange(int min, int max) {}

    public record AuditPolicy(int educationSlaHours, String educationSlaText) {
        public Map<String, Object> toMap() {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("educationSlaHours", educationSlaHours);
            result.put("educationSlaText", educationSlaText);
            return result;
        }
    }
}
