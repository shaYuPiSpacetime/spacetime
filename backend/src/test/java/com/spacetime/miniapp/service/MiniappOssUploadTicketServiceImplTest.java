package com.spacetime.miniapp.service;

import com.spacetime.common.service.Prd01RuntimeConfigResolver;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.util.OssUtil;
import com.spacetime.miniapp.dto.response.OssUploadTicketVO;
import com.spacetime.miniapp.service.impl.MiniappOssUploadTicketServiceImpl;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import com.spacetime.common.dao.AppConfigDao;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.AfterEach;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MiniappOssUploadTicketServiceImplTest {

    private OssUtil ossUtil;
    private Prd01RuntimeConfigResolver runtimeConfigResolver;
    private MiniappOssUploadTicketServiceImpl service;
    private StringRedisTemplate redisTemplate;
    private AppConfigDao appConfigDao;

    @BeforeEach
    void setUp() {
        ossUtil = mock(OssUtil.class);
        runtimeConfigResolver = mock(Prd01RuntimeConfigResolver.class);
        redisTemplate = mock(StringRedisTemplate.class);
        ValueOperations<String, String> valueOperations = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        appConfigDao = mock(AppConfigDao.class);
        service = new MiniappOssUploadTicketServiceImpl(ossUtil, runtimeConfigResolver, redisTemplate, appConfigDao);
        UserContextHolder.set(new UserContext(1L, "tester", List.of(), List.of()));
        when(runtimeConfigResolver.snapshot()).thenReturn(new Prd01RuntimeConfigResolver.RuntimeConfigSnapshot(Map.of()));
        when(runtimeConfigResolver.uploadRule(any(), any(), any(Integer.class), any(Integer.class)))
                .thenReturn(new Prd01RuntimeConfigResolver.UploadRule(4, 10, List.of("jpg", "png")));
        when(ossUtil.createDirectUploadPolicy(any(), any(Long.class), any()))
                .thenReturn(new OssUtil.DirectUploadPolicy(
                        "https://bucket.oss-cn-shanghai.aliyuncs.com",
                        "2026/07/14/demo.jpg",
                        Map.of("key", "2026/07/14/demo.jpg", "policy", "policy", "Signature", "signature"),
                        1784030400L));
    }

    @AfterEach
    void tearDown() {
        UserContextHolder.clear();
    }

    @Test
    void 头像签发限定Key的直传凭证并返回最终CDN地址() {
        when(ossUtil.toCdnUrl("2026/07/14/demo.jpg")).thenReturn("https://static.example/demo.jpg");

        OssUploadTicketVO result = service.createAvatarTicket("avatar.jpg", 1024L);

        assertThat(result.getUploadUrl()).startsWith("https://bucket.");
        assertThat(result.getFormData()).containsEntry("key", "2026/07/14/demo.jpg");
        assertThat(result.getFileUrl()).isEqualTo("https://static.example/demo.jpg");
        assertThat(result.getProtectedFile()).isFalse();
    }

    @Test
    void 学历材料直传后只持久化稳定凭证代理地址() {
        OssUploadTicketVO result = service.createEducationTicket("degree.png", 2048L);

        assertThat(result.getFileUrl()).isEqualTo("/miniapp/file/credential/2026/07/14/demo.jpg");
        assertThat(result.getProtectedFile()).isTrue();
    }

    @Test
    void 语音直传凭证使用后台语音上传规则校验() {
        when(runtimeConfigResolver.uploadRule(any(), eq("voice"), eq(1), eq(20)))
                .thenReturn(new Prd01RuntimeConfigResolver.UploadRule(1, 20, List.of("mp3", "aac")));
        when(ossUtil.toCdnUrl("2026/07/14/demo.jpg")).thenReturn("https://static.example/voice.mp3");

        OssUploadTicketVO result = service.createVoiceTicket("intro.mp3", 4096L);

        assertThat(result.getFileUrl()).isEqualTo("https://static.example/voice.mp3");
        verify(runtimeConfigResolver).uploadRule(any(), eq("voice"), eq(1), eq(20));
    }
}
