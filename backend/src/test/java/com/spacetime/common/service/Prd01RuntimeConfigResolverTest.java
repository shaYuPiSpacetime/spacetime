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

    @Test
    void 语音配置缺失时默认格式只能是mp3() {
        AppConfigDao appConfigDao = mock(AppConfigDao.class);
        when(appConfigDao.selectByKeys(anyList())).thenReturn(List.of());
        Prd01RuntimeConfigResolver resolver = new Prd01RuntimeConfigResolver(appConfigDao, new ObjectMapper());

        Prd01RuntimeConfigResolver.UploadRule rule = resolver.uploadRule(resolver.snapshot(), "voice", 1, 20);

        assertThat(rule.formats()).containsExactly("mp3");
    }

    @Test
    void 语音配置行格式为空时回退mp3且背景图张数钳制为一张() {
        AppConfigDao appConfigDao = mock(AppConfigDao.class);
        AppConfig config = new AppConfig();
        config.setConfigKey("prd01.upload.rules");
        config.setConfigValue("""
                {"rows":[
                  {"key":"voice","maxCount":"1","maxMb":"20","format":" / "},
                  {"key":"profileBg","maxCount":"4","maxMb":"10","format":"jpg / png"}
                ]}
                """);
        when(appConfigDao.selectByKeys(anyList())).thenReturn(List.of(config));
        Prd01RuntimeConfigResolver resolver = new Prd01RuntimeConfigResolver(appConfigDao, new ObjectMapper());

        Map<String, Object> limits = resolver.uploadLimits(resolver.snapshot());

        assertThat(limits.get("voice")).isEqualTo(Map.of(
                "maxCount", 1, "maxMb", 20, "formats", List.of("mp3")));
        assertThat(limits.get("profileBg")).isEqualTo(Map.of(
                "maxCount", 1, "maxMb", 10, "formats", List.of("jpg", "png")));
        assertThat(limits).containsEntry("profileBgMaxCount", 1);
    }

    @Test
    void 旧地址配置必须同时关闭现居和家乡区县() {
        AppConfigDao appConfigDao = mock(AppConfigDao.class);
        AppConfig config = new AppConfig();
        config.setConfigKey("prd01.profile.fieldSettings");
        config.setConfigValue("""
                {"rows":[
                  {"fieldId":"locationDistrict","visible":true,"required":true,"scoreEnabled":true},
                  {"fieldId":"hometownDistrict","visible":true,"required":true,"scoreEnabled":true}
                ]}
                """);
        when(appConfigDao.selectByKeys(anyList())).thenReturn(List.of(config));
        Prd01RuntimeConfigResolver resolver = new Prd01RuntimeConfigResolver(appConfigDao, new ObjectMapper());

        List<Map<String, Object>> settings = resolver.fieldSettings(resolver.snapshot());

        assertThat(settings)
                .filteredOn(item -> "locationDistrict".equals(item.get("fieldId")))
                .singleElement()
                .satisfies(item -> assertThat(item)
                        .containsEntry("visible", false)
                        .containsEntry("required", false)
                        .containsEntry("requiredMode", "fixed")
                        .containsEntry("scoreEnabled", false));
        assertThat(settings)
                .filteredOn(item -> "hometownDistrict".equals(item.get("fieldId")))
                .singleElement()
                .satisfies(item -> assertThat(item)
                        .containsEntry("visible", false)
                .containsEntry("required", false)
                .containsEntry("requiredMode", "fixed")
                .containsEntry("scoreEnabled", false));
    }
}
