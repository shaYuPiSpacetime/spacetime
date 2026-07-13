package com.spacetime.miniapp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.miniapp.service.impl.Prd01FieldConfigResolver;
import com.spacetime.miniapp.service.impl.MiniappPrd01ConfigServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Miniapp PRD01 config API contract")
class MiniappPrd01ConfigServiceTest {

    @Mock
    private AppConfigDao appConfigDao;

    @Test
    @DisplayName("prd01 config exposes upload limits, region scope and audit policy")
    void shouldExposePrd01ConfigContract() {
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
                        config("prd01.security.sms.rules",
                                "{\"rows\":[{\"key\":\"sendCountdownSeconds\",\"value\":\"45\"},{\"key\":\"validMinutes\",\"value\":\"3\"},{\"key\":\"dailySendLimit\",\"value\":\"8\"}]}",
                                group));
            }
            if ("PRD01_PROFILE_FIELD".equals(group)) {
                return List.of(config("prd01.profile.fieldSettings",
                        "{\"rows\":["
                                + "{\"fieldId\":\"gender\",\"visible\":false,\"required\":true},"
                                + "{\"fieldId\":\"birthday\",\"visible\":true,\"required\":true},"
                                + "{\"fieldId\":\"identity\",\"visible\":true,\"required\":false},"
                                + "{\"fieldId\":\"educationLevel\",\"visible\":true,\"required\":false},"
                                + "{\"fieldId\":\"locationProvince\",\"visible\":true,\"required\":true},"
                                + "{\"fieldId\":\"locationCity\",\"visible\":true,\"required\":true},"
                                + "{\"fieldId\":\"locationDistrict\",\"visible\":true,\"required\":false}"
                                + "]}",
                        group));
            }
            return List.of();
        });

        ObjectMapper objectMapper = new ObjectMapper();
        MiniappPrd01ConfigService service = new MiniappPrd01ConfigServiceImpl(
                appConfigDao,
                objectMapper,
                new Prd01FieldConfigResolver(appConfigDao, objectMapper));

        Map<String, Object> config = service.getPrd01Config();

        assertThat(config).containsKeys("initFields", "requiredFields", "uploadLimits", "regionScope", "auditPolicy", "openTextFields", "smsSecurity");
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
        assertThat((Map<String, Object>) config.get("uploadLimits")).containsEntry("albumMaxCount", 9);
        assertThat((Map<String, Object>) config.get("regionScope"))
                .containsEntry("supportsOverseas", false)
                .containsEntry("supportsLocation", true)
                .containsEntry("locationDictPath", "/miniapp/dict/locations");
        assertThat((Map<String, Object>) config.get("auditPolicy")).containsEntry("educationSlaHours", 24);
        assertThat((Map<String, Object>) config.get("smsSecurity"))
                .containsEntry("sendCountdownSeconds", 45)
                .containsEntry("validMinutes", 3)
                .containsEntry("dailySendLimit", 8)
                .containsEntry("providerCode", "MOCK");
        assertThat((List<String>) config.get("openTextFields")).containsExactly("ABOUT_ME", "HOPE_THEY_KNOW", "PROFILE_QA");
    }

    private AppConfig config(String key, String value, String group) {
        AppConfig config = new AppConfig();
        config.setConfigKey(key);
        config.setConfigValue(value);
        config.setConfigGroup(group);
        return config;
    }
}
