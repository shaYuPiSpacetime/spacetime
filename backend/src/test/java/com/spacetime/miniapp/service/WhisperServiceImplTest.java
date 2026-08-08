package com.spacetime.miniapp.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppWhisperDao;
import com.spacetime.common.dao.CoinSceneConfigDao;
import com.spacetime.common.dao.CommunityPostDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserCoinLogDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppWhisper;
import com.spacetime.common.entity.CoinSceneConfig;
import com.spacetime.common.entity.CommunityPost;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.entity.UserCoinLog;
import com.spacetime.common.enums.BizSceneEnum;
import com.spacetime.common.provider.ProviderCheckResult;
import com.spacetime.common.provider.TextSafetyProvider;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.miniapp.dto.request.WhisperCreateReq;
import com.spacetime.miniapp.dto.request.WhisperPrecheckReq;
import com.spacetime.miniapp.dto.response.WhisperCreateVO;
import com.spacetime.miniapp.dto.response.WhisperPrecheckVO;
import com.spacetime.miniapp.service.impl.WhisperServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** 动态详情悄悄话的场景报价、免费权益、扣币流水和幂等契约。 */
@ExtendWith(MockitoExtension.class)
class WhisperServiceImplTest {
    @Mock private AppWhisperDao whisperDao;
    @Mock private AppUserDao appUserDao;
    @Mock private CommunityPostDao communityPostDao;
    @Mock private UserAssetDao userAssetDao;
    @Mock private CoinSceneConfigDao sceneConfigDao;
    @Mock private UserCoinLogDao coinLogDao;
    @Mock private RelationAccessProjectionService accessProjectionService;
    @Mock private TextSafetyProvider textSafetyProvider;

    private WhisperServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new WhisperServiceImpl(whisperDao, appUserDao, communityPostDao, userAssetDao,
                sceneConfigDao, coinLogDao, accessProjectionService, textSafetyProvider);
    }

    @Test
    void precheckReturnsRuntimePriceAndBalanceWithoutCharging() {
        stubOpenUsersAndPost();
        when(userAssetDao.selectByUserId(7L)).thenReturn(asset(7L, 50, 0));
        when(sceneConfigDao.selectPage(any(), any())).thenReturn(scenePage(12));

        WhisperPrecheckVO result = service.precheck(7L, precheckReq());

        assertThat(result.getAllowed()).isTrue();
        assertThat(result.getCoinAmount()).isEqualTo(12);
        assertThat(result.getCoinBalance()).isEqualTo(50);
        assertThat(result.getFree()).isFalse();
        assertThat(result.getFreeWhisperRemain()).isZero();
        assertThat(result.getContentMaxLength()).isEqualTo(60);
        verify(userAssetDao, never()).updateCoinBalance(any(), any());
        verify(whisperDao, never()).insert(any());
    }

    @Test
    void createPaidWhisperDeductsCoinAndWritesLedgerOnce() {
        stubOpenUsersAndPost();
        when(whisperDao.selectBySenderAndIdempotencyKey(7L, "idem-paid")).thenReturn(null);
        when(userAssetDao.selectByUserIdForUpdate(7L)).thenReturn(asset(7L, 50, 0));
        when(userAssetDao.updateCoinBalance(7L, -12)).thenReturn(1);
        when(userAssetDao.updateLastConsumeTime(eq(7L), any())).thenReturn(1);
        when(sceneConfigDao.selectPage(any(), any())).thenReturn(scenePage(12));
        when(textSafetyProvider.check("whisper", "想认识你，可以聊聊吗？"))
                .thenReturn(ProviderCheckResult.safe("mock", "{}", true));

        WhisperCreateVO result = service.create(7L, "idem-paid", createReq("想认识你，可以聊聊吗？"));

        assertThat(result.getCharged()).isTrue();
        assertThat(result.getCoinCost()).isEqualTo(12);
        assertThat(result.getCoinBalance()).isEqualTo(38);
        assertThat(result.getPaymentMethod()).isEqualTo("coin");
        verify(userAssetDao).updateCoinBalance(7L, -12);
        verify(userAssetDao).updateLastConsumeTime(eq(7L), any());

        ArgumentCaptor<AppWhisper> whisperCaptor = ArgumentCaptor.forClass(AppWhisper.class);
        verify(whisperDao).insert(whisperCaptor.capture());
        assertThat(whisperCaptor.getValue())
                .extracting(AppWhisper::getSenderUserId, AppWhisper::getReceiverUserId,
                        AppWhisper::getSourcePostNo, AppWhisper::getScene,
                        AppWhisper::getCoinCost, AppWhisper::getPaymentMethod,
                        AppWhisper::getIdempotencyKey, AppWhisper::getStatus)
                .containsExactly(7L, 8L, "POST-001", "community_post", 12,
                        "coin", "idem-paid", "pending");

        ArgumentCaptor<UserCoinLog> logCaptor = ArgumentCaptor.forClass(UserCoinLog.class);
        verify(coinLogDao).insert(logCaptor.capture());
        assertThat(logCaptor.getValue())
                .extracting(UserCoinLog::getUserId, UserCoinLog::getFlowType,
                        UserCoinLog::getChangeAmount, UserCoinLog::getBalanceBefore,
                        UserCoinLog::getBalanceAfter, UserCoinLog::getBizScene,
                        UserCoinLog::getRefType)
                .containsExactly(7L, "consume", -12, 50, 38,
                        BizSceneEnum.WHISPER.getCode(), "app_whisper");
    }

    @Test
    void createUsesFreeQuotaBeforeCoinBalance() {
        stubOpenUsersAndPost();
        when(whisperDao.selectBySenderAndIdempotencyKey(7L, "idem-free")).thenReturn(null);
        when(userAssetDao.selectByUserIdForUpdate(7L)).thenReturn(asset(7L, 2, 1));
        when(userAssetDao.consumeFreeWhisper(7L)).thenReturn(1);
        when(userAssetDao.updateLastConsumeTime(eq(7L), any())).thenReturn(1);
        when(sceneConfigDao.selectPage(any(), any())).thenReturn(scenePage(12));
        when(textSafetyProvider.check(eq("whisper"), any()))
                .thenReturn(ProviderCheckResult.safe("mock", "{}", true));

        WhisperCreateVO result = service.create(7L, "idem-free", createReq("你好，很高兴认识你"));

        assertThat(result.getCharged()).isFalse();
        assertThat(result.getCoinCost()).isZero();
        assertThat(result.getPaymentMethod()).isEqualTo("free_quota");
        verify(userAssetDao).consumeFreeWhisper(7L);
        verify(userAssetDao).updateLastConsumeTime(eq(7L), any());
        verify(userAssetDao, never()).updateCoinBalance(any(), any());
        verify(coinLogDao, never()).insert(any());
    }

    @Test
    void sameIdempotencyKeyReturnsStoredResultWithoutSecondCharge() {
        AppWhisper existing = new AppWhisper();
        existing.setWhisperNo("WSP-001");
        existing.setSenderUserId(7L);
        existing.setReceiverUserId(8L);
        existing.setSourcePostNo("POST-001");
        existing.setScene("community_post");
        existing.setContent("你好，很高兴认识你");
        existing.setCoinCost(12);
        existing.setPaymentMethod("coin");
        existing.setStatus("pending");
        when(whisperDao.selectBySenderAndIdempotencyKey(7L, "idem-existing")).thenReturn(existing);
        when(userAssetDao.selectByUserId(7L)).thenReturn(asset(7L, 38, 0));

        WhisperCreateVO result = service.create(7L, "idem-existing", createReq("你好，很高兴认识你"));

        assertThat(result.getWhisperNo()).isEqualTo("WSP-001");
        assertThat(result.getCoinBalance()).isEqualTo(38);
        assertThat(result.getCharged()).isFalse();
        assertThat(result.getCoinCost()).isEqualTo(12);
        verify(userAssetDao, never()).updateCoinBalance(any(), any());
        verify(whisperDao, never()).insert(any());
        verify(coinLogDao, never()).insert(any());
    }

    @Test
    void sameIdempotencyKeyWithDifferentPayloadIsRejectedWithoutCharging() {
        AppWhisper existing = existingWhisper("原始内容");
        when(whisperDao.selectBySenderAndIdempotencyKey(7L, "idem-conflict")).thenReturn(existing);

        assertThatThrownBy(() -> service.create(7L, "idem-conflict", createReq("不同内容")))
                .hasMessageContaining("幂等键");

        verify(userAssetDao, never()).selectByUserIdForUpdate(any());
        verify(userAssetDao, never()).updateCoinBalance(any(), any());
        verify(whisperDao, never()).insert(any());
        verify(coinLogDao, never()).insert(any());
    }

    @Test
    void rechecksIdempotencyWithCurrentReadAfterLockingAsset() {
        stubOpenUsersAndPost();
        AppWhisper existing = existingWhisper("你好");
        when(whisperDao.selectBySenderAndIdempotencyKey(7L, "idem-concurrent")).thenReturn(null);
        when(whisperDao.selectBySenderAndIdempotencyKeyForUpdate(7L, "idem-concurrent"))
                .thenReturn(existing);
        when(userAssetDao.selectByUserIdForUpdate(7L)).thenReturn(asset(7L, 38, 0));
        when(sceneConfigDao.selectPage(any(), any())).thenReturn(scenePage(12));
        when(textSafetyProvider.check(eq("whisper"), any()))
                .thenReturn(ProviderCheckResult.safe("mock", "{}", true));

        WhisperCreateVO result = service.create(7L, "idem-concurrent", createReq("你好"));

        assertThat(result.getWhisperNo()).isEqualTo("WSP-001");
        assertThat(result.getCharged()).isFalse();
        assertThat(result.getCoinBalance()).isEqualTo(38);
        verify(userAssetDao, never()).updateCoinBalance(any(), any());
        verify(userAssetDao, never()).consumeFreeWhisper(any());
        verify(whisperDao, never()).insert(any());
        verify(coinLogDao, never()).insert(any());
    }

    @Test
    void unsafeContentDoesNotLockAssetOrCharge() {
        stubOpenUsersAndPost();
        when(whisperDao.selectBySenderAndIdempotencyKey(7L, "idem-unsafe")).thenReturn(null);
        when(textSafetyProvider.check("whisper", "风险内容"))
                .thenReturn(ProviderCheckResult.unsafe("mock", "{}", true, "命中风险词"));

        assertThatThrownBy(() -> service.create(7L, "idem-unsafe", createReq("风险内容")))
                .hasMessageContaining("内容安全");

        verify(userAssetDao, never()).selectByUserIdForUpdate(any());
        verify(userAssetDao, never()).updateCoinBalance(any(), any());
        verify(userAssetDao, never()).consumeFreeWhisper(any());
        verify(whisperDao, never()).insert(any());
        verify(coinLogDao, never()).insert(any());
    }

    @Test
    void safetyProviderExceptionDoesNotLockAssetOrCharge() {
        stubOpenUsersAndPost();
        when(whisperDao.selectBySenderAndIdempotencyKey(7L, "idem-provider-error")).thenReturn(null);
        when(textSafetyProvider.check("whisper", "正常内容"))
                .thenThrow(new IllegalStateException("provider unavailable"));

        assertThatThrownBy(() -> service.create(7L, "idem-provider-error", createReq("正常内容")))
                .hasMessageContaining("内容安全");

        verify(userAssetDao, never()).selectByUserIdForUpdate(any());
        verify(userAssetDao, never()).updateCoinBalance(any(), any());
        verify(userAssetDao, never()).consumeFreeWhisper(any());
        verify(whisperDao, never()).insert(any());
        verify(coinLogDao, never()).insert(any());
    }

    @Test
    void freeQuotaAtomicUpdateFailureDoesNotFallbackToCoin() {
        stubOpenUsersAndPost();
        when(whisperDao.selectBySenderAndIdempotencyKey(7L, "idem-free-race")).thenReturn(null);
        when(userAssetDao.selectByUserIdForUpdate(7L)).thenReturn(asset(7L, 50, 1));
        when(userAssetDao.consumeFreeWhisper(7L)).thenReturn(0);
        when(sceneConfigDao.selectPage(any(), any())).thenReturn(scenePage(12));
        when(textSafetyProvider.check(eq("whisper"), any()))
                .thenReturn(ProviderCheckResult.safe("mock", "{}", true));

        assertThatThrownBy(() -> service.create(7L, "idem-free-race", createReq("你好")))
                .hasMessageContaining("免费次数");

        verify(userAssetDao, never()).updateCoinBalance(any(), any());
        verify(whisperDao, never()).insert(any());
        verify(coinLogDao, never()).insert(any());
    }

    @Test
    void sourcePostAuthorMustMatchTargetUser() {
        stubOpenUsersAndPost();
        CommunityPost post = new CommunityPost();
        post.setPostNo("POST-001");
        post.setAuthorId(9L);
        post.setStatus("published");
        when(communityPostDao.selectList(any())).thenReturn(List.of(post));
        when(whisperDao.selectBySenderAndIdempotencyKey(7L, "idem-wrong-author")).thenReturn(null);

        assertThatThrownBy(() -> service.create(7L, "idem-wrong-author", createReq("你好")))
                .hasMessageContaining("动态作者");

        verify(textSafetyProvider, never()).check(any(), any());
        verify(userAssetDao, never()).selectByUserIdForUpdate(any());
        verify(whisperDao, never()).insert(any());
    }

    @Test
    void cannotSendWhisperToSelf() {
        WhisperCreateReq req = createReq("你好");
        req.setTargetUserNo("USR-000000000007");
        when(whisperDao.selectBySenderAndIdempotencyKey(7L, "idem-self")).thenReturn(null);

        assertThatThrownBy(() -> service.create(7L, "idem-self", req))
                .hasMessageContaining("自己");

        verify(appUserDao, never()).selectById(any());
        verify(userAssetDao, never()).selectByUserIdForUpdate(any());
        verify(whisperDao, never()).insert(any());
    }

    @Test
    void bothUsersMustHaveOpenRelationAccess() {
        AppUser sender = user(7L, "发送者");
        when(whisperDao.selectBySenderAndIdempotencyKey(7L, "idem-closed")).thenReturn(null);
        when(appUserDao.selectById(7L)).thenReturn(sender);
        when(accessProjectionService.project(sender)).thenReturn("CLOSED");

        assertThatThrownBy(() -> service.create(7L, "idem-closed", createReq("你好")))
                .hasMessageContaining("准入");

        verify(textSafetyProvider, never()).check(any(), any());
        verify(userAssetDao, never()).selectByUserIdForUpdate(any());
        verify(whisperDao, never()).insert(any());
    }

    @Test
    void insufficientBalanceDoesNotCreateWhisperOrLedger() {
        stubOpenUsersAndPost();
        when(whisperDao.selectBySenderAndIdempotencyKey(7L, "idem-low")).thenReturn(null);
        when(userAssetDao.selectByUserIdForUpdate(7L)).thenReturn(asset(7L, 2, 0));
        when(sceneConfigDao.selectPage(any(), any())).thenReturn(scenePage(12));
        when(textSafetyProvider.check(eq("whisper"), any()))
                .thenReturn(ProviderCheckResult.safe("mock", "{}", true));

        assertThatThrownBy(() -> service.create(7L, "idem-low", createReq("你好，很高兴认识你")))
                .hasMessageContaining("千寻币余额不足");
        verify(whisperDao, never()).insert(any());
        verify(coinLogDao, never()).insert(any());
    }

    private AppWhisper existingWhisper(String content) {
        AppWhisper existing = new AppWhisper();
        existing.setWhisperNo("WSP-001");
        existing.setSenderUserId(7L);
        existing.setReceiverUserId(8L);
        existing.setSourcePostNo("POST-001");
        existing.setScene("community_post");
        existing.setContent(content);
        existing.setCoinCost(12);
        existing.setPaymentMethod("coin");
        existing.setStatus("pending");
        return existing;
    }

    private void stubOpenUsersAndPost() {
        AppUser sender = user(7L, "发送者");
        AppUser receiver = user(8L, "接收者");
        CommunityPost post = new CommunityPost();
        post.setId(31L);
        post.setPostNo("POST-001");
        post.setAuthorId(8L);
        post.setStatus("published");
        when(appUserDao.selectById(7L)).thenReturn(sender);
        when(appUserDao.selectById(8L)).thenReturn(receiver);
        when(accessProjectionService.project(sender)).thenReturn("OPEN");
        when(accessProjectionService.project(receiver)).thenReturn("OPEN");
        when(communityPostDao.selectList(any())).thenReturn(List.of(post));
    }

    private WhisperPrecheckReq precheckReq() {
        WhisperPrecheckReq req = new WhisperPrecheckReq();
        req.setTargetUserNo("USR-000000000008");
        req.setSourcePostNo("POST-001");
        req.setScene("community_post");
        return req;
    }

    private WhisperCreateReq createReq(String content) {
        WhisperCreateReq req = new WhisperCreateReq();
        req.setTargetUserNo("USR-000000000008");
        req.setSourcePostNo("POST-001");
        req.setScene("community_post");
        req.setContent(content);
        return req;
    }

    private AppUser user(Long id, String nickname) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setNickname(nickname);
        user.setAccountStatus("active");
        return user;
    }

    private UserAsset asset(Long userId, int balance, int freeRemain) {
        UserAsset asset = new UserAsset();
        asset.setUserId(userId);
        asset.setCoinBalance(balance);
        asset.setTodayFreeWhisperRemain(freeRemain);
        return asset;
    }

    private Page<CoinSceneConfig> scenePage(int price) {
        CoinSceneConfig config = new CoinSceneConfig();
        config.setSceneCode("whisper");
        config.setUnitPrice(price);
        config.setStatus("ENABLED");
        Page<CoinSceneConfig> page = new Page<>(1, 1, 1);
        page.setRecords(List.of(config));
        return page;
    }
}
