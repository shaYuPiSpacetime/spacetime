package com.spacetime.miniapp.service;

import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.entity.AppConfig;
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
                return List.of(config("prd01.upload.album.max_count", "9", group));
            }
            if ("PRD01_AUDIT".equals(group)) {
                return List.of(config("prd01.audit.voice.provider", "MOCK", group));
            }
            return List.of();
        });

        MiniappPrd01ConfigService service = new MiniappPrd01ConfigServiceImpl(appConfigDao);

        Map<String, Object> config = service.getPrd01Config();

        assertThat(config).containsKeys("requiredFields", "uploadLimits", "regionScope", "auditPolicy", "openTextFields");
        assertThat((Map<String, Object>) config.get("uploadLimits")).containsEntry("albumMaxCount", 9);
        assertThat((Map<String, Object>) config.get("regionScope")).containsEntry("supportsOverseas", false);
        assertThat((Map<String, Object>) config.get("auditPolicy")).containsEntry("voiceProvider", "MOCK");
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
