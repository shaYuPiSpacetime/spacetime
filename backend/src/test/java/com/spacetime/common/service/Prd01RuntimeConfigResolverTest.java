package com.spacetime.common.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.entity.AppConfig;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class Prd01RuntimeConfigResolverTest {

    @Test
    void 语音格式大小及时长从同一条运行时配置读取() {
        AppConfigDao appConfigDao = mock(AppConfigDao.class);
        AppConfig config = new AppConfig();
        config.setConfigKey("prd01.upload.rules");
        config.setConfigValue("""
                {"rows":[{"key":"voice","maxCount":"1","maxMb":"18","format":"aac / wav","minDuration":"12","maxDuration":"48"}]}
                """);
        when(appConfigDao.selectByKeys(anyList())).thenReturn(List.of(config));
        Prd01RuntimeConfigResolver resolver = new Prd01RuntimeConfigResolver(appConfigDao, new ObjectMapper());

        Map<String, Object> limits = resolver.uploadLimits(resolver.snapshot());

        assertThat(limits).containsEntry("voiceMinDuration", 12).containsEntry("voiceMaxDuration", 48);
        assertThat(limits.get("voice")).isEqualTo(Map.of(
                "maxCount", 1,
                "maxMb", 18,
                "formats", List.of("aac", "wav")));
    }
}
