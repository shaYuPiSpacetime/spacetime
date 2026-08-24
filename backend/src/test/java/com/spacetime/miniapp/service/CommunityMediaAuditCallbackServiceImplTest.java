package com.spacetime.miniapp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.community.CommunityAuditPolicy;
import com.spacetime.common.config.CommunityContentSecurityProperties;
import com.spacetime.common.dao.CommunityExtensionDao;
import com.spacetime.common.dao.CommunityPostDao;
import com.spacetime.common.dao.ExternalProviderTaskDao;
import com.spacetime.common.dao.AppUserAuditRecordDao;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.entity.CommunityMediaAuditTask;
import com.spacetime.common.entity.CommunityPost;
import com.spacetime.common.entity.ExternalProviderTask;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.AppUserAuditService;
import com.spacetime.miniapp.service.impl.CommunityMediaAuditCallbackServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CommunityMediaAuditCallbackServiceImplTest {
    @Mock private CommunityExtensionDao extensionDao;
    @Mock private CommunityPostDao postDao;
    @Mock private ExternalProviderTaskDao externalProviderTaskDao;
    @Mock private AppUserAuditRecordDao appUserAuditRecordDao;
    @Mock private AppUserAuditService appUserAuditService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private CommunityMediaAuditCallbackServiceImpl service;
    private CommunityContentSecurityProperties properties;

    @BeforeEach
    void setUp() {
        properties = new CommunityContentSecurityProperties();
        properties.setCallbackToken("callback-token");
        service = new CommunityMediaAuditCallbackServiceImpl(properties, extensionDao, postDao,
                externalProviderTaskDao, appUserAuditRecordDao, appUserAuditService,
                new CommunityAuditPolicy(), objectMapper);
    }

    @Test
    void invalidSignature_shouldFailClosed() throws Exception {
        assertThatThrownBy(() -> service.handle("bad", "1", "n",
                objectMapper.readTree("{\"trace_id\":\"t1\",\"result\":{\"suggest\":\"pass\"}}")))
                .isInstanceOf(BusinessException.class).hasMessage("media_callback_signature_invalid");
        verifyNoInteractions(extensionDao, postDao);
    }

    @Test
    void verifyUrl_shouldReturnEchoStringForValidSignature() throws Exception {
        String echoString = service.verifyUrl(signature("11", "verify"), "11", "verify", "wechat-echo");

        assertThat(echoString).isEqualTo("wechat-echo");
    }

    @Test
    void allImagesPass_shouldPublishNormalPostAndWriteOutbox() throws Exception {
        CommunityMediaAuditTask task = task("t1");
        CommunityPost post = post("community_post");
        when(extensionDao.selectMediaTaskOne(any())).thenReturn(task);
        when(extensionDao.updateMediaTaskCas(any(), eq(0))).thenReturn(1);
        when(extensionDao.selectMediaTasks(any())).thenAnswer(invocation -> List.of(task));
        when(postDao.selectById(10L)).thenReturn(post);
        when(postDao.updateCas(any(), eq(0))).thenReturn(1);

        service.handle(signature("1", "n"), "1", "n",
                objectMapper.readTree("{\"trace_id\":\"t1\",\"result\":{\"suggest\":\"pass\"}}"));

        verify(postDao).updateCas(argThat(value -> "published".equals(value.getStatus())
                && Integer.valueOf(1).equals(value.getSampleRequired())), eq(0));
        verify(extensionDao).insertOutbox(any());
        verify(extensionDao).insertAudit(any());
    }

    @Test
    void riskyImage_shouldRejectPost() throws Exception {
        CommunityMediaAuditTask task = task("t2");
        CommunityPost post = post("community_post");
        when(extensionDao.selectMediaTaskOne(any())).thenReturn(task);
        when(extensionDao.updateMediaTaskCas(any(), eq(0))).thenReturn(1);
        when(extensionDao.selectMediaTasks(any())).thenAnswer(invocation -> List.of(task));
        when(postDao.selectById(10L)).thenReturn(post);
        when(postDao.updateCas(any(), eq(0))).thenReturn(1);

        service.handle(signature("2", "m"), "2", "m",
                objectMapper.readTree("{\"trace_id\":\"t2\",\"result\":{\"suggest\":\"risky\",\"label\":\"100\"}}"));

        verify(postDao).updateCas(argThat(value -> "rejected".equals(value.getStatus())), eq(0));
    }

    @Test
    void allImagesPass_shouldKeepSincerePostPendingManual() throws Exception {
        CommunityMediaAuditTask task = task("t3");
        CommunityPost post = post("sincere_post");
        when(extensionDao.selectMediaTaskOne(any())).thenReturn(task);
        when(extensionDao.updateMediaTaskCas(any(), eq(0))).thenReturn(1);
        when(extensionDao.selectMediaTasks(any())).thenAnswer(invocation -> List.of(task));
        when(postDao.selectById(10L)).thenReturn(post);
        when(postDao.updateCas(any(), eq(0))).thenReturn(1);

        service.handle(signature("3", "z"), "3", "z",
                objectMapper.readTree("{\"trace_id\":\"t3\",\"result\":{\"suggest\":\"pass\"}}"));

        verify(postDao).updateCas(argThat(value -> "pending_manual".equals(value.getStatus())), eq(0));
    }

    @Test
    void xmlPassEvent_shouldPublishNormalPost() throws Exception {
        CommunityMediaAuditTask task = task("xml-pass");
        CommunityPost post = post("community_post");
        when(extensionDao.selectMediaTaskOne(any())).thenReturn(task);
        when(extensionDao.updateMediaTaskCas(any(), eq(0))).thenReturn(1);
        when(extensionDao.selectMediaTasks(any())).thenAnswer(invocation -> List.of(task));
        when(postDao.selectById(10L)).thenReturn(post);
        when(postDao.updateCas(any(), eq(0))).thenReturn(1);
        String xml = "<xml><Event>wxa_media_check</Event><trace_id>xml-pass</trace_id>"
                + "<detail><suggest>pass</suggest><label>0</label></detail></xml>";

        service.handleRaw(signature("4", "x"), "4", "x", "text/xml", xml);

        verify(postDao).updateCas(argThat(value -> "published".equals(value.getStatus())), eq(0));
    }

    @Test
    void xmlAnyRiskyDetail_shouldRejectPost() throws Exception {
        CommunityMediaAuditTask task = task("xml-risky");
        CommunityPost post = post("community_post");
        when(extensionDao.selectMediaTaskOne(any())).thenReturn(task);
        when(extensionDao.updateMediaTaskCas(any(), eq(0))).thenReturn(1);
        when(extensionDao.selectMediaTasks(any())).thenAnswer(invocation -> List.of(task));
        when(postDao.selectById(10L)).thenReturn(post);
        when(postDao.updateCas(any(), eq(0))).thenReturn(1);
        String xml = "<xml><Event>wxa_media_check</Event><trace_id>xml-risky</trace_id>"
                + "<detail><suggest>pass</suggest></detail><detail><suggest>risky</suggest><label>100</label></detail></xml>";

        service.handleRaw(signature("5", "y"), "5", "y", "application/xml", xml);

        verify(postDao).updateCas(argThat(value -> "rejected".equals(value.getStatus())), eq(0));
    }

    @Test
    void wrongXmlEvent_shouldFailClosed() throws Exception {
        String xml = "<xml><Event>subscribe</Event><trace_id>x</trace_id><detail><suggest>pass</suggest></detail></xml>";
        assertThatThrownBy(() -> service.handleRaw(signature("6", "e"), "6", "e", "text/xml", xml))
                .isInstanceOf(BusinessException.class).hasMessage("media_callback_event_invalid");
        verifyNoInteractions(extensionDao, postDao);
    }

    @Test
    void xxePayload_shouldBeRejected() throws Exception {
        String xml = "<!DOCTYPE xml [<!ENTITY xxe SYSTEM \"file:///etc/passwd\">]>"
                + "<xml><Event>wxa_media_check</Event><trace_id>&xxe;</trace_id></xml>";
        assertThatThrownBy(() -> service.handleRaw(signature("7", "q"), "7", "q", "text/xml", xml))
                .isInstanceOf(BusinessException.class).hasMessage("media_callback_payload_invalid");
        verifyNoInteractions(extensionDao, postDao);
    }

    @Test
    void profileImagePass_shouldApproveAuditRecord() throws Exception {
        ExternalProviderTask task = providerTask("trace-avatar", "IMAGE_SAFETY");
        AppUserAuditRecord record = auditRecord(41L, task.getId());
        when(externalProviderTaskDao.selectOne(any())).thenReturn(task);
        when(appUserAuditRecordDao.selectOne(any())).thenReturn(record);

        service.handle(signature("8", "a"), "8", "a",
                objectMapper.readTree("{\"trace_id\":\"trace-avatar\",\"result\":{\"suggest\":\"pass\"}}"));

        verify(appUserAuditService).machineApprove(eq(41L), eq(31L), contains("trace-avatar"));
        verify(externalProviderTaskDao).updateById(argThat(value -> "SUCCESS".equals(value.getTaskStatus())));
        verifyNoInteractions(extensionDao, postDao);
    }

    @Test
    void profileImageReview_shouldKeepManualReviewState() throws Exception {
        ExternalProviderTask task = providerTask("trace-image-review", "IMAGE_SAFETY");
        when(externalProviderTaskDao.selectOne(any())).thenReturn(task);
        when(appUserAuditRecordDao.selectOne(any())).thenReturn(auditRecord(42L, task.getId()));

        service.handle(signature("9", "b"), "9", "b",
                objectMapper.readTree("{\"trace_id\":\"trace-image-review\",\"result\":{\"suggest\":\"review\"}}"));

        verify(externalProviderTaskDao).updateById(argThat(value -> "REVIEWING".equals(value.getTaskStatus())));
        verifyNoInteractions(appUserAuditService);
    }

    @Test
    void profileAudioReview_shouldRejectAndRequireRerecording() throws Exception {
        ExternalProviderTask task = providerTask("trace-audio-review", "AUDIO_SAFETY");
        when(externalProviderTaskDao.selectOne(any())).thenReturn(task);
        when(appUserAuditRecordDao.selectOne(any())).thenReturn(auditRecord(43L, task.getId()));

        service.handle(signature("10", "c"), "10", "c",
                objectMapper.readTree("{\"trace_id\":\"trace-audio-review\",\"result\":{\"suggest\":\"review\"}}"));

        verify(externalProviderTaskDao).updateById(argThat(value -> "REJECTED".equals(value.getTaskStatus())));
        verify(appUserAuditService).machineReject(eq(43L), eq(31L), contains("trace-audio-review"),
                contains("重新录制"));
    }

    private CommunityMediaAuditTask task(String traceId) {
        CommunityMediaAuditTask task = new CommunityMediaAuditTask();
        task.setId(1L);
        task.setPostId(10L);
        task.setTraceId(traceId);
        task.setStatus("pending");
        task.setVersion(0);
        return task;
    }

    private CommunityPost post(String type) {
        CommunityPost post = new CommunityPost();
        post.setId(10L);
        post.setPostNo("POST-1");
        post.setPostType(type);
        post.setStatus("pending_manual");
        post.setVersion(0);
        return post;
    }

    private ExternalProviderTask providerTask(String traceId, String providerType) {
        ExternalProviderTask task = new ExternalProviderTask();
        task.setId(31L);
        task.setExternalTaskId(traceId);
        task.setProviderType(providerType);
        task.setTaskStatus("PENDING");
        return task;
    }

    private AppUserAuditRecord auditRecord(Long id, Long providerTaskId) {
        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setId(id);
        record.setProviderTaskId(providerTaskId);
        record.setStatus("REVIEWING");
        return record;
    }

    private String signature(String timestamp, String nonce) throws Exception {
        String[] values = {properties.getCallbackToken(), timestamp, nonce};
        Arrays.sort(values);
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-1")
                .digest(String.join("", values).getBytes(StandardCharsets.UTF_8)));
    }
}
