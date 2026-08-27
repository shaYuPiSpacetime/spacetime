package com.spacetime.miniapp.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.AppMessageDeliveryOutboxDao;
import com.spacetime.common.dao.AppMessageRecordDao;
import com.spacetime.common.dao.AppMessageRuleVersionDao;
import com.spacetime.common.dao.AppMessageRuntimeControlDao;
import com.spacetime.common.dao.AppMessageWhisperDao;
import com.spacetime.common.dao.AppRelationMatchDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserRelationBlockDao;
import com.spacetime.common.dao.CoinSceneConfigDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserCoinLogDao;
import com.spacetime.common.dao.VipBenefitDao;
import com.spacetime.common.entity.AppMessageDeliveryOutbox;
import com.spacetime.common.entity.AppMessageRecord;
import com.spacetime.common.entity.AppMessageRuleVersion;
import com.spacetime.common.entity.AppMessageRuntimeControl;
import com.spacetime.common.entity.AppMessageWhisper;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.CoinSceneConfig;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.entity.UserCoinLog;
import com.spacetime.common.entity.VipBenefit;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.miniapp.dto.request.WhisperCreateReq;
import com.spacetime.miniapp.dto.request.WhisperPrecheckReq;
import com.spacetime.miniapp.dto.response.WhisperCreateVO;
import com.spacetime.miniapp.dto.response.WhisperPrecheckVO;
import com.spacetime.miniapp.service.WhisperQuoteStore.WhisperQuoteSnapshot;
import com.spacetime.miniapp.service.impl.WhisperServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** 悄悄话发送的报价、支付、三表原子落库与正文边界。 */
@ExtendWith(MockitoExtension.class)
class WhisperServiceImplTest {
    @Mock private AppMessageWhisperDao whisperDao;
    @Mock private AppMessageRecordDao recordDao;
    @Mock private AppMessageDeliveryOutboxDao outboxDao;
    @Mock private AppUserDao appUserDao;
    @Mock private UserAssetDao userAssetDao;
    @Mock private CoinSceneConfigDao sceneConfigDao;
    @Mock private UserCoinLogDao coinLogDao;
    @Mock private VipBenefitDao vipBenefitDao;
    @Mock private AppRelationMatchDao matchDao;
    @Mock private AppUserRelationBlockDao relationBlockDao;
    @Mock private AppMessageRuleVersionDao ruleVersionDao;
    @Mock private AppMessageRuntimeControlDao runtimeControlDao;
    @Mock private RelationAccessProjectionService accessProjectionService;
    @Mock private WhisperQuoteStore quoteStore;

    private WhisperServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new WhisperServiceImpl(whisperDao, recordDao, outboxDao, appUserDao,
                userAssetDao, sceneConfigDao, coinLogDao, vipBenefitDao, matchDao,
                relationBlockDao, ruleVersionDao, runtimeControlDao,
                accessProjectionService, quoteStore, new ObjectMapper().findAndRegisterModules());
    }

    @Test
    void precheckCreatesTrustedVipQuoteWithoutCharging() {
        stubEligibleUsers();
        UserAsset asset = asset(7L, 50, "active");
        asset.setVipExpireTime(LocalDateTime.now().plusDays(5));
        when(userAssetDao.selectByUserId(7L)).thenReturn(asset);
        when(vipBenefitDao.selectPage(any(), any())).thenReturn(benefitPage(2));
        when(whisperDao.countPaidVipFree(eq(7L), any(LocalDate.class))).thenReturn(1L);
        when(quoteStore.issue(any())).thenReturn("wq-token");

        WhisperPrecheckVO result = service.precheck(7L, precheckReq());

        assertThat(result.getCanSend()).isTrue();
        assertThat(result.getPayType()).isEqualTo("vip_free");
        assertThat(result.getCoinAmount()).isZero();
        assertThat(result.getFreeWhisperRemain()).isEqualTo(1);
        assertThat(result.getQuoteToken()).isEqualTo("wq-token");
        assertThat(result.getWhisperExpireDays()).isEqualTo(7);
        assertThat(result.getCooldownDays()).isEqualTo(7);
        verify(userAssetDao, never()).updateCoinBalance(any(), any());
        verify(recordDao, never()).insert(any());
        verify(whisperDao, never()).insert(any());
        verify(outboxDao, never()).insert(any());
    }

    @Test
    void paidCreateWritesPlaintextOnlyToMessageAndMetadataOnlyToOutbox() {
        stubEligibleUsers();
        when(quoteStore.read("wq-paid")).thenReturn(quote("coin", 12, 0));
        when(userAssetDao.selectByUserIdForUpdate(7L)).thenReturn(asset(7L, 50, "inactive"));
        when(userAssetDao.updateCoinBalance(7L, -12)).thenReturn(1);
        when(userAssetDao.updateLastConsumeTime(eq(7L), any())).thenReturn(1);
        assignInsertIds();

        WhisperCreateVO result = service.create(7L, "idem-paid", createReq("wq-paid", "想认识你，可以聊聊吗？"));

        assertThat(result.getSendStatus()).isEqualTo("sending");
        assertThat(result.getPaymentStatus()).isEqualTo("paid");
        assertThat(result.getPayType()).isEqualTo("coin");
        assertThat(result.getCoinAmount()).isEqualTo(12);
        assertThat(result.getCoinBalance()).isEqualTo(38);
        assertThat(result.getCharged()).isTrue();

        ArgumentCaptor<AppMessageRecord> messageCaptor = ArgumentCaptor.forClass(AppMessageRecord.class);
        verify(recordDao).insert(messageCaptor.capture());
        AppMessageRecord message = messageCaptor.getValue();
        assertThat(message.getContentText()).isEqualTo("想认识你，可以聊聊吗？");
        assertThat(message.getMessageType()).isEqualTo("whisper");
        assertThat(message.getSendStatus()).isEqualTo("queued");

        ArgumentCaptor<AppMessageWhisper> whisperCaptor = ArgumentCaptor.forClass(AppMessageWhisper.class);
        verify(whisperDao).insert(whisperCaptor.capture());
        assertThat(whisperCaptor.getValue())
                .extracting(AppMessageWhisper::getSendRequestId, AppMessageWhisper::getPayType,
                        AppMessageWhisper::getPaymentStatus, AppMessageWhisper::getDeliveryStatus,
                        AppMessageWhisper::getRequestMessageId)
                .containsExactly("idem-paid", "coin", "paid", "queued", 20L);

        ArgumentCaptor<AppMessageDeliveryOutbox> outboxCaptor =
                ArgumentCaptor.forClass(AppMessageDeliveryOutbox.class);
        verify(outboxDao).insert(outboxCaptor.capture());
        assertThat(outboxCaptor.getValue().getAggregateId()).isEqualTo(20L);
        assertThat(outboxCaptor.getValue().getEventType()).isEqualTo("whisper_request");
        assertThat(outboxCaptor.getValue().getPayloadJson())
                .contains("whisperNo", "NoUnread", "NoLastMsg", "NoMsgCheck")
                .doesNotContain("想认识你", "content", "contentText");

        ArgumentCaptor<UserCoinLog> logCaptor = ArgumentCaptor.forClass(UserCoinLog.class);
        verify(coinLogDao).insert(logCaptor.capture());
        assertThat(logCaptor.getValue().getBizIdempotencyKey()).isEqualTo("whisper:send:7:idem-paid");
        assertThat(logCaptor.getValue().getRefType()).isEqualTo("app_message_whisper");
    }

    @Test
    void vipCreateUsesDailyFactAndDoesNotDeductCoin() {
        stubEligibleUsers();
        when(quoteStore.read("wq-free")).thenReturn(quote("vip_free", 0, 1));
        UserAsset asset = asset(7L, 2, "active");
        asset.setVipExpireTime(LocalDateTime.now().plusDays(5));
        when(userAssetDao.selectByUserIdForUpdate(7L)).thenReturn(asset);
        when(vipBenefitDao.selectPage(any(), any())).thenReturn(benefitPage(2));
        when(whisperDao.countPaidVipFree(eq(7L), any(LocalDate.class))).thenReturn(1L);
        when(userAssetDao.updateFreeWhisperProjection(7L, 0)).thenReturn(1);
        when(userAssetDao.updateLastConsumeTime(eq(7L), any())).thenReturn(1);
        assignInsertIds();

        WhisperCreateVO result = service.create(7L, "idem-free", createReq("wq-free", "你好"));

        assertThat(result.getPayType()).isEqualTo("vip_free");
        assertThat(result.getCoinAmount()).isZero();
        assertThat(result.getCharged()).isFalse();
        verify(userAssetDao, never()).updateCoinBalance(any(), any());
        verify(coinLogDao, never()).insert(any());
        verify(userAssetDao).updateFreeWhisperProjection(7L, 0);
    }

    @Test
    void sameRequestReturnsStoredResultWithoutReadingExpiredQuoteOrChargingAgain() {
        AppMessageWhisper existing = existingWhisper("idem-existing");
        AppMessageRecord message = requestMessage("你好");
        when(whisperDao.selectBySenderRequestId(7L, "idem-existing")).thenReturn(existing);
        when(recordDao.selectById(20L)).thenReturn(message);
        when(userAssetDao.selectByUserId(7L)).thenReturn(asset(7L, 38, "inactive"));

        WhisperCreateVO result = service.create(7L, "idem-existing", createReq("expired-token", "你好"));

        assertThat(result.getWhisperNo()).isEqualTo("WSP-001");
        assertThat(result.getCharged()).isFalse();
        verify(quoteStore, never()).read(any());
        verify(userAssetDao, never()).updateCoinBalance(any(), any());
        verify(recordDao, never()).insert(any());
        verify(outboxDao, never()).insert(any());
    }

    @Test
    void sameRequestWithDifferentBodyIsRejected() {
        AppMessageWhisper existing = existingWhisper("idem-conflict");
        when(whisperDao.selectBySenderRequestId(7L, "idem-conflict")).thenReturn(existing);
        when(recordDao.selectById(20L)).thenReturn(requestMessage("原始内容"));

        assertThatThrownBy(() -> service.create(7L, "idem-conflict",
                createReq("wq-any", "不同内容")))
                .hasMessageContaining("幂等键");

        verify(quoteStore, never()).read(any());
        verify(userAssetDao, never()).selectByUserIdForUpdate(any());
    }

    @Test
    void precheckRejectsExistingPendingPair() {
        stubEligibleUsers();
        AppMessageWhisper pending = existingWhisper("other-request");
        when(whisperDao.selectActivePair(7L, 8L)).thenReturn(pending);

        assertThatThrownBy(() -> service.precheck(7L, precheckReq()))
                .hasMessageContaining("待回复");

        verify(quoteStore, never()).issue(any());
    }

    @Test
    void precheckAllowsNormalReceiverWithoutTripleCertification() {
        stubEligibleUsers();
        when(accessProjectionService.project(any(AppUser.class)))
                .thenAnswer(invocation -> Objects.equals(
                        ((AppUser) invocation.getArgument(0)).getId(), 7L) ? "OPEN" : "CLOSED");
        when(userAssetDao.selectByUserId(7L)).thenReturn(asset(7L, 50, "inactive"));
        when(quoteStore.issue(any())).thenReturn("wq-normal-receiver");

        WhisperPrecheckVO result = service.precheck(7L, precheckReq());

        assertThat(result.getCanSend()).isTrue();
        assertThat(result.getQuoteToken()).isEqualTo("wq-normal-receiver");
    }

    @Test
    void precheckRejectsReceiverWithAbnormalAccountStatus() {
        stubEligibleUsers();
        AppUser receiver = user(8L, "接收者");
        receiver.setAccountStatus(AccountStatusEnum.FROZEN.getCode());
        when(appUserDao.selectById(8L)).thenReturn(receiver);

        assertThatThrownBy(() -> service.precheck(7L, precheckReq()))
                .hasMessageContaining("接收方账号状态异常");

        verify(quoteStore, never()).issue(any());
    }

    @Test
    void createRejectsChangedPriceInsideAssetLock() {
        stubEligibleUsers();
        when(quoteStore.read("wq-price")).thenReturn(quote("coin", 10, 0));
        when(userAssetDao.selectByUserIdForUpdate(7L)).thenReturn(asset(7L, 50, "inactive"));

        assertThatThrownBy(() -> service.create(7L, "idem-price", createReq("wq-price", "你好")))
                .hasMessageContaining("价格已变化");

        verify(userAssetDao, never()).updateCoinBalance(any(), any());
        verify(recordDao, never()).insert(any());
    }

    @Test
    void globalSwitchBlocksPrecheck() {
        AppMessageRuntimeControl control = new AppMessageRuntimeControl();
        control.setEnabled(0);
        when(runtimeControlDao.selectByControlKey("global_send_enabled")).thenReturn(control);

        assertThatThrownBy(() -> service.precheck(7L, precheckReq()))
                .hasMessageContaining("暂停");

        verify(appUserDao, never()).selectById(anyLong());
    }

    private void stubEligibleUsers() {
        AppMessageRuntimeControl control = new AppMessageRuntimeControl();
        control.setEnabled(1);
        when(runtimeControlDao.selectByControlKey("global_send_enabled")).thenReturn(control);
        lenient().when(ruleVersionDao.selectCurrent("global")).thenReturn(rule());
        when(appUserDao.selectById(7L)).thenReturn(user(7L, "发送者"));
        when(appUserDao.selectById(8L)).thenReturn(user(8L, "接收者"));
        lenient().when(accessProjectionService.project(any(AppUser.class))).thenReturn("OPEN");
        lenient().when(sceneConfigDao.selectPage(any(), any())).thenReturn(scenePage(12));
    }

    private void assignInsertIds() {
        doAnswer(invocation -> {
            ((AppMessageRecord) invocation.getArgument(0)).setId(20L);
            return null;
        }).when(recordDao).insert(any());
        doAnswer(invocation -> {
            ((AppMessageWhisper) invocation.getArgument(0)).setId(30L);
            return null;
        }).when(whisperDao).insert(any());
        doAnswer(invocation -> {
            ((AppMessageDeliveryOutbox) invocation.getArgument(0)).setId(40L);
            return null;
        }).when(outboxDao).insert(any());
    }

    private WhisperQuoteSnapshot quote(String payType, int coinAmount, int freeRemain) {
        return new WhisperQuoteSnapshot(7L, 8L, "USR-000000000008",
                "profile", null, payType,
                coinAmount, freeRemain, "MSG-RULE-V1", 7, 7,
                LocalDateTime.now().plusMinutes(5));
    }

    private AppMessageRuleVersion rule() {
        AppMessageRuleVersion rule = new AppMessageRuleVersion();
        rule.setVersionNo("MSG-RULE-V1");
        rule.setWhisperExpireDays(7);
        rule.setWhisperCooldownDays(7);
        return rule;
    }

    private AppMessageWhisper existingWhisper(String requestId) {
        AppMessageWhisper whisper = new AppMessageWhisper();
        whisper.setId(30L);
        whisper.setWhisperNo("WSP-001");
        whisper.setSendRequestId(requestId);
        whisper.setSenderUserId(7L);
        whisper.setReceiverUserId(8L);
        whisper.setSourceScene("profile");
        whisper.setStatus("pending");
        whisper.setPayType("coin");
        whisper.setPaymentStatus("paid");
        whisper.setCoinAmount(12);
        whisper.setDeliveryStatus("queued");
        whisper.setRequestMessageId(20L);
        whisper.setCreateTime(LocalDateTime.now());
        whisper.setExpiresAt(LocalDateTime.now().plusDays(7));
        return whisper;
    }

    private AppMessageRecord requestMessage(String content) {
        AppMessageRecord record = new AppMessageRecord();
        record.setId(20L);
        record.setSenderUserId(7L);
        record.setReceiverUserId(8L);
        record.setMessageType("whisper");
        record.setContentText(content);
        return record;
    }

    private WhisperPrecheckReq precheckReq() {
        WhisperPrecheckReq req = new WhisperPrecheckReq();
        req.setTargetUserNo("USR-000000000008");
        req.setSourceScene("profile");
        return req;
    }

    private WhisperCreateReq createReq(String quoteToken, String content) {
        WhisperCreateReq req = new WhisperCreateReq();
        req.setTargetUserNo("USR-000000000008");
        req.setSourceScene("profile");
        req.setQuoteToken(quoteToken);
        req.setContent(content);
        return req;
    }

    private AppUser user(Long id, String nickname) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setNickname(nickname);
        user.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        return user;
    }

    private UserAsset asset(Long userId, int balance, String vipStatus) {
        UserAsset asset = new UserAsset();
        asset.setUserId(userId);
        asset.setCoinBalance(balance);
        asset.setVipStatus(vipStatus);
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

    private Page<VipBenefit> benefitPage(int dailyQuota) {
        VipBenefit benefit = new VipBenefit();
        benefit.setBenefitCode("free_whisper");
        benefit.setBenefitValue(dailyQuota);
        benefit.setStatus("ENABLED");
        Page<VipBenefit> page = new Page<>(1, 1, 1);
        page.setRecords(List.of(benefit));
        return page;
    }
}
