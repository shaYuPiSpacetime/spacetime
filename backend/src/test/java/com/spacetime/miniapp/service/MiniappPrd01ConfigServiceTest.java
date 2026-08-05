package com.spacetime.miniapp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.provider.SmsCodeProvider;
import com.spacetime.miniapp.service.impl.Prd01FieldConfigResolver;
import com.spacetime.miniapp.service.impl.MiniappPrd01ConfigServiceImpl;
import com.spacetime.common.service.Prd01RuntimeConfigResolver;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Miniapp PRD01 config API contract")
class MiniappPrd01ConfigServiceTest {

    @Mock
    private AppConfigDao appConfigDao;
    @Mock
    private SmsCodeProvider smsCodeProvider;

    @Test
    @DisplayName("prd01 config exposes upload limits, region scope and audit policy")
    void shouldExposePrd01ConfigContract() {
        when(smsCodeProvider.providerCode()).thenReturn("ALIYUN_SMS");
        List<AppConfig> runtimeConfigs = List.of(
                config("prd01.access.minAge", "20", "PRD01_ACCESS"),
                config("prd01.access.maxAge", "55", "PRD01_ACCESS"),
                config("prd01.upload.rules",
                        "{\"rows\":[{\"key\":\"album\",\"maxCount\":\"9\",\"maxMb\":\"10\"}]}",
                        "PRD01_UPLOAD"),
                config("prd01.audit.education.sla_hours", "24", "PRD01_AUDIT"),
                config("prd01.copy.rules",
                        "{\"rows\":[{\"group\":\"认证提示文案\",\"scene\":\"头像认证说明\",\"copyKey\":\"avatar_notice\",\"content\":\"请上传本人清晰头像\",\"enabled\":true}]}",
                        "PRD01_AUDIT"),
                config("prd01.text.length.rules",
                        "{\"rows\":[{\"group\":\"开放文本长度\",\"scene\":\"关于我\",\"copyKey\":\"text_length_about_me\",\"content\":\"关于我建议20-300字\",\"enabled\":true}]}",
                        "PRD01_AUDIT"),
                config("prd01.security.sms.rules",
                        "{\"rows\":[{\"key\":\"sendCountdownSeconds\",\"value\":\"45\"},{\"key\":\"validMinutes\",\"value\":\"3\"},{\"key\":\"dailySendLimit\",\"value\":\"8\"}]}",
                        "PRD01_AUDIT"),
                config("prd01.profile.fieldSettings",
                        "{\"rows\":["
                                + "{\"fieldId\":\"locationDistrict\",\"visible\":true,\"required\":false,\"requiredMode\":\"conditional\",\"scoreEnabled\":false},"
                                + "{\"fieldId\":\"hometownDistrict\",\"visible\":true,\"required\":true,\"requiredMode\":\"conditional\",\"scoreEnabled\":true},"
                                + "{\"fieldId\":\"aboutMe\",\"visible\":true,\"required\":true,\"scoreEnabled\":true},"
                                + "{\"fieldId\":\"avatarImage\",\"visible\":true,\"required\":true,\"scoreEnabled\":true}]}",
                        "PRD01_PROFILE_FIELD"),
                config("prd01.profile.scoreWeights",
                        "{\"rows\":[{\"fieldId\":\"aboutMe\",\"label\":\"关于我/自我描述\",\"scoreEnabled\":true,\"studentScore\":\"5\",\"workerScore\":\"5\"},{\"fieldId\":\"avatarImage\",\"label\":\"裁剪后主头像\",\"scoreEnabled\":true,\"studentScore\":\"4\",\"workerScore\":\"4\"}]}",
                        "PRD01_PROFILE_FIELD"));
        when(appConfigDao.selectByKeys(anyList())).thenReturn(runtimeConfigs);
        when(appConfigDao.selectByGroup(anyString())).thenAnswer(invocation -> {
            String group = invocation.getArgument(0);
            if ("PRD01_UPLOAD".equals(group)) {
                return List.of(config("prd01.upload.rules",
                        "{\"rows\":[{\"key\":\"album\",\"maxCount\":\"9\",\"maxMb\":\"10\"}]}",
                        group));
            }
            if ("PRD01_AUDIT".equals(group)) {
                return List.of(
                        config("prd01.audit.education.sla_hours", "24", group),
                        config("prd01.copy.rules",
                                "{\"rows\":[{\"group\":\"认证提示文案\",\"scene\":\"头像认证说明\",\"copyKey\":\"avatar_notice\",\"content\":\"请上传本人清晰头像\",\"enabled\":true}]}",
                                group),
                        config("prd01.text.length.rules",
                                "{\"rows\":[{\"group\":\"开放文本长度\",\"scene\":\"关于我\",\"copyKey\":\"text_length_about_me\",\"content\":\"关于我建议20-300字\",\"enabled\":true}]}",
                                group),
                        config("prd01.security.sms.rules",
                                "{\"rows\":[{\"key\":\"sendCountdownSeconds\",\"value\":\"45\"},{\"key\":\"validMinutes\",\"value\":\"3\"},{\"key\":\"dailySendLimit\",\"value\":\"8\"}]}",
                                group));
            }
            if ("PRD01_PROFILE_FIELD".equals(group)) {
                return List.of(
                        config("prd01.profile.fieldSettings",
                                "{\"rows\":["
                                        + "{\"group\":\"轻量资料\",\"label\":\"性别\",\"fieldId\":\"gender\",\"visible\":false,\"required\":true,\"scoreEnabled\":true},"
                                        + "{\"group\":\"轻量资料\",\"label\":\"年龄\",\"fieldId\":\"birthday\",\"visible\":true,\"required\":true,\"scoreEnabled\":true},"
                                        + "{\"fieldId\":\"identity\",\"visible\":true,\"required\":false},"
                                        + "{\"fieldId\":\"educationLevel\",\"visible\":true,\"required\":false},"
                                        + "{\"fieldId\":\"locationProvince\",\"visible\":true,\"required\":true},"
                                        + "{\"fieldId\":\"locationCity\",\"visible\":true,\"required\":true},"
                                        + "{\"fieldId\":\"locationDistrict\",\"visible\":true,\"required\":false},"
                                        + "{\"group\":\"扩展资料\",\"label\":\"关于我/自我描述\",\"fieldId\":\"aboutMe\",\"visible\":true,\"required\":true,\"scoreEnabled\":true},"
                                        + "{\"group\":\"头像认证\",\"label\":\"裁剪后主头像\",\"fieldId\":\"avatarImage\",\"visible\":true,\"required\":true,\"scoreEnabled\":true}"
                                        + "]}", group),
                        config("prd01.profile.scoreWeights",
                                "{\"rows\":[{\"fieldId\":\"aboutMe\",\"label\":\"关于我/自我描述\",\"scoreEnabled\":true,\"studentScore\":\"5\",\"workerScore\":\"5\"},{\"fieldId\":\"avatarImage\",\"label\":\"裁剪后主头像\",\"scoreEnabled\":true,\"studentScore\":\"4\",\"workerScore\":\"4\"}]}",
                                group));
            }
            if ("PRD01_ACCESS".equals(group)) {
                return List.of(
                        config("prd01.access.minAge", "20", group),
                        config("prd01.access.maxAge", "55", group));
            }
            return List.of();
        });

        ObjectMapper objectMapper = new ObjectMapper();
        MiniappPrd01ConfigService service = new MiniappPrd01ConfigServiceImpl(
                new Prd01FieldConfigResolver(appConfigDao, objectMapper),
                new Prd01RuntimeConfigResolver(appConfigDao, objectMapper),
                smsCodeProvider);

        Map<String, Object> config = service.getPrd01Config();

        assertThat(config).containsKeys("accessPolicy", "initFields", "requiredFields", "fieldSettings",
                "profileCompleteness", "copywriting", "uploadLimits", "regionScope", "auditPolicy",
                "openTextFields", "smsSecurity", "configUpdatedAt");
        assertThat((Map<String, Object>) config.get("accessPolicy"))
                .containsEntry("minAge", 20)
                .containsEntry("maxAge", 55)
                .containsEntry("tripleCertificationRequired", true);
        assertThat((List<String>) config.get("requiredFields"))
                .containsExactly("birthday", "locationProvince", "locationCity");
        assertThat((List<Map<String, Object>>) config.get("initFields"))
                .extracting(item -> item.get("fieldId"))
                .containsExactly("gender", "birthday", "identity", "educationLevel", "location");
        Map<String, Object> gender = ((List<Map<String, Object>>) config.get("initFields")).get(0);
        assertThat(gender)
                .containsEntry("label", "性别")
                .containsEntry("visible", false)
                .containsEntry("required", false)
                .containsEntry("allowEmpty", false);
        Map<String, Object> birthday = ((List<Map<String, Object>>) config.get("initFields")).get(1);
        assertThat(birthday)
                .containsEntry("label", "年龄")
                .containsEntry("visible", true)
                .containsEntry("required", true)
                .containsEntry("allowEmpty", false);
        assertThat((List<String>) birthday.get("submitFields")).containsExactly("birthday");
        Map<String, Object> location = ((List<Map<String, Object>>) config.get("initFields")).get(4);
        assertThat(location)
                .containsEntry("label", "地址")
                .containsEntry("visible", true)
                .containsEntry("required", true)
                .containsEntry("allowEmpty", false);
        assertThat((List<String>) location.get("submitFields"))
                .containsExactly("locationProvince", "locationCity", "locationDistrict");
        assertThat((List<Map<String, Object>>) config.get("fieldSettings"))
                .filteredOn(item -> "locationDistrict".equals(item.get("fieldId")))
                .singleElement()
                .satisfies(item -> assertThat(item)
                        .containsEntry("visible", true)
                        .containsEntry("required", false)
                        .containsEntry("requiredMode", "conditional")
                        .containsEntry("scoreEnabled", false));
        assertThat((List<Map<String, Object>>) config.get("fieldSettings"))
                .filteredOn(item -> "hometownDistrict".equals(item.get("fieldId")))
                .singleElement()
                .satisfies(item -> assertThat(item)
                        .containsEntry("visible", false)
                        .containsEntry("required", false)
                        .containsEntry("scoreEnabled", false));
        assertThat((Map<String, Object>) config.get("uploadLimits")).containsEntry("albumMaxCount", 9);
        assertThat((Map<String, Object>) config.get("regionScope"))
                .containsEntry("supportsOverseas", false)
                .containsEntry("supportsLocation", true)
                .containsEntry("locationDictPath", "/miniapp/dict/locations");
        assertThat((Map<String, Object>) config.get("auditPolicy")).containsEntry("educationSlaHours", 24);
        assertThat((List<Map<String, Object>>) config.get("fieldSettings"))
                .extracting(item -> item.get("fieldId"))
                .contains("aboutMe", "avatarImage");
        assertThat((Map<String, Object>) config.get("profileCompleteness"))
                .containsEntry("studentTotalScore", 9)
                .containsEntry("workerTotalScore", 9);
        assertThat((Map<String, Object>) config.get("copywriting"))
                .containsKeys("avatar_notice", "text_length_about_me");
        assertThat((Map<String, Object>) ((Map<String, Object>) config.get("uploadLimits")).get("education"))
                .containsEntry("maxCount", 4)
                .containsEntry("maxMb", 10);
        assertThat((Map<String, Object>) config.get("smsSecurity"))
                .containsEntry("sendCountdownSeconds", 45)
                .containsEntry("validMinutes", 3)
                .containsEntry("dailySendLimit", 8)
                .containsEntry("providerCode", "ALIYUN_SMS");
        assertThat((List<String>) config.get("openTextFields")).containsExactly("ABOUT_ME", "PROFILE_QA");
    }

    private AppConfig config(String key, String value, String group) {
        AppConfig config = new AppConfig();
        config.setConfigKey(key);
        config.setConfigValue(value);
        config.setConfigGroup(group);
        return config;
    }
}
