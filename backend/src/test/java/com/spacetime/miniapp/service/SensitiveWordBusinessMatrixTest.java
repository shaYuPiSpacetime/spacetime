package com.spacetime.miniapp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.community.*;
import com.spacetime.common.config.WechatMiniappProperties;
import com.spacetime.common.constant.CommunityConfigKeys;
import com.spacetime.common.dao.*;
import com.spacetime.common.entity.*;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.provider.impl.WechatTextSafetyProvider;
import com.spacetime.common.service.*;
import com.spacetime.miniapp.dto.request.*;
import com.spacetime.miniapp.service.impl.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.Arguments;
import org.springframework.data.redis.core.*;
import org.springframework.test.util.ReflectionTestUtils;
import java.net.http.*;
import java.util.*;
import java.util.stream.Stream;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** L3-11/12/13/15/16: real business services + actual Wechat adapter; no network/database.
 * Profile audit persistence remains a mocked boundary: assertions prove dispatched transitions,
 * not transaction durability or public-profile database projection.
 */
class SensitiveWordBusinessMatrixTest {
    private static final String TEXT = "认真生活喜欢阅读徒步和做饭期待真诚沟通共同分享温柔而有趣的日常";
    private final LocalSensitiveWordService local = mock(LocalSensitiveWordService.class);
    private final StringRedisTemplate redis = mock(StringRedisTemplate.class);
    private final HttpClient http = mock(HttpClient.class);
    private final Map<Class<?>, Object> dependencies = new HashMap<>();

    static Stream<Arguments> matrix() {
        return Stream.of("PASS", "UNAVAILABLE").flatMap(local ->
                Stream.of("PASS", "REJECT", "REVIEW", "UNAVAILABLE").flatMap(wechat ->
                        Stream.of("community", "sincere_post", "comment", "profile")
                                .map(business -> Arguments.of(local, wechat, business))));
    }

    @ParameterizedTest(name = "local={0}, wechat={1}, business={2}")
    @MethodSource("matrix")
    void actualAdapterPreservesBusinessDecision(String localState, String wechat, String business) throws Exception {
        when(local.checkText(TEXT)).thenReturn(localState.equals("PASS")
                ? CommunitySecurityResult.pass("local_clear") : CommunitySecurityResult.unavailable("local_store_offline"));
        WechatCommunityContentSecurityAdapter adapter = adapter(wechat);
        if (business.equals("profile")) {
            assertProfile(adapter, wechat);
        } else {
            assertCommunity(community(adapter), business, wechat);
        }
        var order = inOrder(local, http);
        order.verify(local).checkText(TEXT);
        order.verify(http).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"community", "sincere_post", "comment", "profile"})
    void localRejectShortCircuitsTokenAndHttpThroughBusinessService(String business) throws Exception {
        when(local.checkText(TEXT)).thenReturn(new CommunitySecurityResult(CommunitySecurityConclusion.REJECT,
                "local_sensitive_word:9", "local_sensitive_word_hit", "{\"wordId\":9}"));
        var adapter = adapter("PASS");
        if (business.equals("profile")) assertProfile(adapter, "REJECT");
        else assertCommunity(community(adapter), business, "REJECT");
        verifyNoInteractions(http);
        verify(redis, never()).opsForValue();
    }

    @Test
    void localFailureDoesNotSwallowBusinessSaveFailure() throws Exception {
        when(local.checkText(TEXT)).thenThrow(new IllegalStateException("local offline"));
        var service = community(adapter("PASS"));
        IllegalStateException failure = new IllegalStateException("business save failed");
        doThrow(failure).when(dependency(CommunityPostDao.class)).insert(any());
        assertThatThrownBy(() -> service.createPost(1L, postRequest("community"))).isSameAs(failure);
        verify(http).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
        verify(dependency(CommunityExtensionDao.class), never()).insertAudit(any());
    }

    @Test
    void businessValidationStillStopsBeforeLocalAndWechat() throws Exception {
        var service = community(adapter("PASS"));
        var request = postRequest("community");
        request.setContent("a".repeat(501));
        assertThatThrownBy(() -> service.createPost(1L, request)).isInstanceOf(BusinessException.class);
        verifyNoInteractions(local, http);
        verify(dependency(CommunityPostDao.class), never()).insert(any());
    }

    private void assertCommunity(CommunityServiceImpl service, String business, String wechat) throws Exception {
        boolean pass = wechat.equals("PASS");
        if (business.equals("comment")) {
            var request = new CommunityCommentCreateReq(); request.setPostId(100L); request.setContent(TEXT);
            if (Set.of("REVIEW", "UNAVAILABLE").contains(wechat)) {
                assertThatThrownBy(() -> service.createComment(1L, request)).isInstanceOf(BusinessException.class)
                        .extracting("code").isEqualTo(505010);
                verify(dependency(CommunityCommentDao.class), never()).insert(any());
            } else {
                var response = service.createComment(1L, request);
                assertThat(response.getStatus()).isEqualTo(pass ? "published" : "rejected");
                assertThat(response.getCommentCount()).isEqualTo(pass ? 5 : 4);
                assertThat(new ObjectMapper().writeValueAsString(response)).doesNotContain("local_store_offline", "wordId", "local_sensitive_word");
                verify(dependency(CommunityCommentDao.class)).insert(argThat(row ->
                        (pass ? "published" : "rejected").equals(row.getStatus())
                                && (pass == (row.getPublishedAt() != null))));
            }
            verify(dependency(CommunityPostDao.class), times(pass ? 1 : 0)).updateById(any());
        } else {
            String expected = wechat.equals("REJECT") ? "rejected"
                    : pass && business.equals("community") ? "published" : "pending_manual";
            var response = service.createPost(1L, postRequest(business));
            assertThat(response.getStatus()).isEqualTo(expected);
            assertThat(new ObjectMapper().writeValueAsString(response)).doesNotContain("local_store_offline", "wordId", "local_sensitive_word");
            verify(dependency(CommunityPostDao.class)).insert(argThat(row -> expected.equals(row.getStatus())
                    && (expected.equals("published") == (row.getPublishedAt() != null))));
        }
    }

    private void assertProfile(WechatCommunityContentSecurityAdapter adapter, String wechat) throws Exception {
        AppUserAuditService audit = mock(AppUserAuditService.class);
        ExternalProviderTaskDao tasks = mock(ExternalProviderTaskDao.class);
        Prd01RuntimeConfigResolver config = mock(Prd01RuntimeConfigResolver.class);
        var snapshot = new Prd01RuntimeConfigResolver.RuntimeConfigSnapshot(Map.of());
        when(config.snapshot()).thenReturn(snapshot);
        when(config.fieldVisible(snapshot, "aboutMe", true)).thenReturn(true);
        when(config.copyText(snapshot, "safety_text_failed", "文本内容安全审核未通过")).thenReturn("文本内容安全审核未通过");
        AppUserDao users = mock(AppUserDao.class);
        AppUser user = new AppUser(); user.setId(1L); user.setOpenid("test-openid");
        when(users.selectById(1L)).thenReturn(user);
        AppUserAuditRecord record = new AppUserAuditRecord(); record.setAuditType("ABOUT_ME"); record.setStatus("PENDING");
        when(audit.latestRecord(eq(1L), any())).thenReturn(null, record);
        when(audit.submit(any())).thenAnswer(call -> { AppUserAuditRecord submitted = call.getArgument(0); submitted.setId(8L); return submitted; });
        doAnswer(call -> { ExternalProviderTask task = call.getArgument(0); task.setId(9L); return null; }).when(tasks).insert(any());
        var service = new OpenTextAuditServiceImpl(users, mock(AppUserAuditRecordDao.class), tasks,
                new WechatTextSafetyProvider(adapter), audit, config);
        var request = new IntroductionSubmitReq(); request.setAboutMe(TEXT);
        var response = service.submitIntroduction(1L, request);
        if (wechat.equals("PASS")) verify(audit).machineApprove(eq(8L), eq(9L), anyString());
        else if (wechat.equals("REJECT")) verify(audit).machineReject(eq(8L), eq(9L), anyString(), eq("文本内容安全审核未通过"));
        else verify(audit).machineStart(eq(8L), eq(9L), anyString());
        verify(audit, times(wechat.equals("PASS") ? 1 : 0)).machineApprove(any(), any(), any());
        verify(audit, times(wechat.equals("REJECT") ? 1 : 0)).machineReject(any(), any(), any(), any());
        verify(audit, times(Set.of("REVIEW", "UNAVAILABLE").contains(wechat) ? 1 : 0)).machineStart(any(), any(), any());
        verify(tasks).insert(argThat(task -> (wechat.equals("PASS") ? "SUCCESS" : wechat.equals("REJECT") ? "REJECTED" : "REVIEWING").equals(task.getTaskStatus())));
        assertThat(new ObjectMapper().writeValueAsString(response)).doesNotContain("wordId", "local_store_offline", "local_sensitive_word");
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"PASS", "REJECT", "REVIEW", "UNAVAILABLE"})
    @SuppressWarnings("unchecked")
    void localUnavailableKeepsTextBeforeImagesAndSincerePostPrivate(String outcome) throws Exception {
        when(local.checkText(TEXT)).thenReturn(CommunitySecurityResult.unavailable("local_store_offline"));
        var adapter = adapter(outcome);
        var service = community(adapter);
        ValueOperations<String, String> uploads = mock(ValueOperations.class);
        when(dependency(StringRedisTemplate.class).opsForValue()).thenReturn(uploads);
        when(uploads.get("community:upload:ticket:miniapp/1/album/a.png")).thenReturn("1");
        when(dependency(com.spacetime.common.util.OssUtil.class).objectExists("miniapp/1/album/a.png")).thenReturn(true);
        HttpResponse<String> original = mock(HttpResponse.class);
        when(original.statusCode()).thenReturn(200);
        String suggest = outcome.equals("PASS") ? "pass" : outcome.equals("REJECT") ? "risky" : "review";
        when(original.body()).thenReturn(outcome.equals("UNAVAILABLE") ? "{\"errcode\":40001}"
                : "{\"errcode\":0,\"result\":{\"suggest\":\"" + suggest + "\"}}");
        clearInvocations(http);
        HttpResponse<String> media = mock(HttpResponse.class);
        when(media.statusCode()).thenReturn(200); when(media.body()).thenReturn("{\"errcode\":0,\"trace_id\":\"image-trace\"}");
        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenAnswer(call -> {
            HttpRequest request = call.getArgument(0);
            return request.uri().getPath().endsWith("media_check_async") ? media : original;
        });
        var request = postRequest("sincere_post");
        request.setImageUrls(List.of("https://static.example.com/miniapp/1/album/a.png"));
        assertThat(service.createPost(1L, request).getStatus()).isEqualTo(outcome.equals("REJECT") ? "rejected" : "pending_manual");
        var requests = org.mockito.ArgumentCaptor.forClass(HttpRequest.class);
        verify(http, times(outcome.equals("PASS") ? 2 : 1)).send(requests.capture(), any(HttpResponse.BodyHandler.class));
        assertThat(requests.getAllValues().get(0).uri().getPath()).endsWith("msg_sec_check");
        if (outcome.equals("PASS")) assertThat(requests.getAllValues().get(1).uri().getPath()).endsWith("media_check_async");
        verify(dependency(CommunityPostDao.class)).insert(argThat(row -> row.getPublishedAt() == null));
    }
    private CommunityPostCreateReq postRequest(String type) {
        var request = new CommunityPostCreateReq(); request.setPostType(type); request.setContent(TEXT); request.setImageUrls(List.of()); return request;
    }

    @SuppressWarnings("unchecked")
    private <T> T dependency(Class<T> type) { return (T) dependencies.computeIfAbsent(type, key -> mock(type)); }

    private CommunityServiceImpl community(WechatCommunityContentSecurityAdapter adapter) throws Exception {
        // Build the real service with mocked infrastructure dependencies, keeping its real policy and adapter.
        var constructor = CommunityServiceImpl.class.getConstructors()[0];
        Object[] args = Arrays.stream(constructor.getParameterTypes()).map(type ->
                type == CommunityContentSecurityPort.class ? adapter : type == CommunityAuditPolicy.class
                        ? new CommunityAuditPolicy() : dependency(type)).toArray();
        var service = (CommunityServiceImpl) constructor.newInstance(args);
        AppUser user = new AppUser(); user.setId(1L); user.setOpenid("test-openid"); user.setPhone("13800000000");
        when(dependency(AppUserDao.class).selectById(1L)).thenReturn(user);
        SysUser staff = new SysUser(); staff.setPhone(user.getPhone()); staff.setStatus("ENABLED");
        when(dependency(UserDao.class).selectByPhone(user.getPhone())).thenReturn(staff);
        var configs = Map.of(CommunityConfigKeys.INTERACTION_GATE_MODE, "LOGIN_ONLY",
                CommunityConfigKeys.POST_MAX_IMAGES, "9", CommunityConfigKeys.POST_MAX_TEXT_LENGTH, "500");
        when(dependency(AppConfigDao.class).selectByKey(anyString())).thenAnswer(call -> {
            String key = call.getArgument(0); String value = configs.get(key); if (value == null) return null;
            AppConfig row = new AppConfig(); row.setConfigKey(key); row.setConfigValue(value); row.setStatus("ENABLED"); return row;
        });
        CommunityPost post = new CommunityPost(); post.setId(100L); post.setPostNo("POST-TEST"); post.setStatus("published"); post.setCommentCount(4);
        when(dependency(CommunityPostDao.class).selectById(100L)).thenReturn(post);
        return service;
    }

    @SuppressWarnings("unchecked")
    private WechatCommunityContentSecurityAdapter adapter(String outcome) throws Exception {
        var properties = new WechatMiniappProperties(); properties.setAppId("matrix-app"); properties.setAppSecret("matrix-secret");
        var adapter = new WechatCommunityContentSecurityAdapter(properties, redis, new ObjectMapper(), local);
        ReflectionTestUtils.setField(adapter, "httpClient", http);
        ValueOperations<String, String> values = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(values);
        when(values.get("wechat:miniapp:access_token:matrix-app")).thenReturn("matrix-token");
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(200);
        String suggest = outcome.equals("PASS") ? "pass" : outcome.equals("REJECT") ? "risky" : "review";
        when(response.body()).thenReturn(outcome.equals("UNAVAILABLE") ? "{\"errcode\":40001}"
                : "{\"errcode\":0,\"result\":{\"suggest\":\"" + suggest + "\",\"label\":100}}");
        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(response);
        clearInvocations(redis, http);
        return adapter;
    }
}
