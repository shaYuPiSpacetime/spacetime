package com.spacetime.miniapp.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.AppRelationLikeDao;
import com.spacetime.common.dao.AppRelationVisitDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.CoinSceneConfigDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserCoinLogDao;
import com.spacetime.common.dao.UserUnlockRecordDao;
import com.spacetime.common.entity.AppRelationLike;
import com.spacetime.common.entity.AppRelationVisit;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.CoinSceneConfig;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.entity.UserUnlockRecord;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.miniapp.dto.request.RelationUnlockConfirmReq;
import com.spacetime.miniapp.dto.request.RelationUnlockQuoteReq;
import com.spacetime.miniapp.dto.response.UnlockConfirmVO;
import com.spacetime.miniapp.dto.response.UnlockQuoteVO;
import com.spacetime.miniapp.service.impl.RelationUnlockServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** 关系单条解锁的报价、复验、扣币和幂等契约。 */
@ExtendWith(MockitoExtension.class)
class RelationUnlockServiceImplTest {
    @Mock private AppUserDao appUserDao;
    @Mock private AppRelationLikeDao likeDao;
    @Mock private AppRelationVisitDao visitDao;
    @Mock private UserAssetDao userAssetDao;
    @Mock private CoinSceneConfigDao sceneConfigDao;
    @Mock private UserUnlockRecordDao unlockRecordDao;
    @Mock private UserCoinLogDao coinLogDao;
    @Mock private RelationAccessProjectionService accessProjectionService;
    @Mock private StringRedisTemplate redisTemplate;
    @Mock private ValueOperations<String, String> valueOperations;

    private RelationUnlockServiceImpl service;
    private final AtomicReference<String> quotePayload = new AtomicReference<>();

    @BeforeEach
    void setUp() {
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        service = new RelationUnlockServiceImpl(appUserDao, likeDao, visitDao, userAssetDao,
                sceneConfigDao, unlockRecordDao, coinLogDao, accessProjectionService,
                redisTemplate, objectMapper);
        org.mockito.Mockito.lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        org.mockito.Mockito.lenient().doAnswer(invocation -> {
            quotePayload.set(invocation.getArgument(1));
            return null;
        }).when(valueOperations).set(anyString(), anyString(), any(Duration.class));
        org.mockito.Mockito.lenient().when(valueOperations.get(anyString())).thenAnswer(invocation -> quotePayload.get());
    }

    @Test
    void quoteDoesNotExposeTargetIdentityBeforePaymentAndConfirmDeductsOnce() {
        AppUser current = activeUser(7L, "当前用户");
        AppUser target = activeUser(8L, "被解锁用户");
        AppRelationLike like = new AppRelationLike();
        like.setId(11L);
        like.setLikeNo("LIK-001");
        like.setFromUserId(8L);
        like.setToUserId(7L);
        like.setLikeStatus("active");
        like.setActiveMarker(1);
        UserAsset before = asset(7L, 100);
        UserAsset after = asset(7L, 92);
        CoinSceneConfig config = new CoinSceneConfig();
        config.setSceneCode("likes_unlock_one");
        config.setUnitPrice(8);
        config.setRetentionDays(0);
        config.setStatus("ENABLED");
        Page<CoinSceneConfig> configPage = new Page<>(1, 1, 1);
        configPage.setRecords(List.of(config));

        when(appUserDao.selectById(7L)).thenReturn(current);
        when(appUserDao.selectById(8L)).thenReturn(target);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(accessProjectionService.project(target)).thenReturn("OPEN");
        when(likeDao.selectOne(any())).thenReturn(like);
        when(unlockRecordDao.selectList(any())).thenReturn(List.of());
        when(sceneConfigDao.selectPage(any(), any())).thenReturn(configPage);
        when(userAssetDao.selectByUserId(7L)).thenReturn(before, after);
        when(userAssetDao.selectByUserIdForUpdate(7L)).thenReturn(before);
        when(userAssetDao.updateCoinBalance(7L, -8)).thenReturn(1);
        when(userAssetDao.updateLastConsumeTime(eq(7L), any())).thenReturn(1);

        RelationUnlockQuoteReq quoteReq = new RelationUnlockQuoteReq();
        quoteReq.setScene("likes_unlock_one");
        quoteReq.setTargetBizType("like");
        quoteReq.setTargetBizNo("LIK-001");
        UnlockQuoteVO quote = service.quote(7L, quoteReq);

        assertThat(quote.getQuoteToken()).isNotBlank();
        assertThat(quote.getTargetUserId()).isNull();
        assertThat(quote.getUnitPrice()).isEqualTo(8);

        RelationUnlockConfirmReq confirmReq = new RelationUnlockConfirmReq();
        confirmReq.setRequestId("unlock-001");
        confirmReq.setQuoteToken(quote.getQuoteToken());
        UnlockConfirmVO result = service.confirm(7L, confirmReq);

        assertThat(result.getTargetUserId()).isEqualTo(8L);
        assertThat(result.getCoinCost()).isEqualTo(8);
        assertThat(result.getCoinBalance()).isEqualTo(92);
        assertThat(result.getDisplayStatus()).isEqualTo("clear");
        verify(userAssetDao).updateCoinBalance(7L, -8);
        verify(unlockRecordDao).insert(org.mockito.ArgumentMatchers.argThat(record ->
                "like".equals(record.getTargetBizType())
                        && "LIK-001".equals(record.getTargetBizNo())
                        && Long.valueOf(8L).equals(record.getTargetUserId())));
        verify(coinLogDao).insert(any());
    }

    @Test
    void expiredQuoteCannotDeductBalance() {
        when(valueOperations.get(anyString())).thenReturn(null);
        RelationUnlockConfirmReq req = new RelationUnlockConfirmReq();
        req.setRequestId("unlock-002");
        req.setQuoteToken("expired-token");
        when(unlockRecordDao.selectList(any())).thenReturn(List.of());

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.confirm(7L, req))
                .isInstanceOf(com.spacetime.common.exception.BusinessException.class)
                .hasMessageContaining("报价");
        verify(userAssetDao, never()).updateCoinBalance(any(), any());
    }

    @Test
    void activeVipCannotCreateSingleUnlockQuote() {
        AppUser current = activeUser(7L, "current");
        AppUser target = activeUser(8L, "target");
        AppRelationLike like = activeLike();
        UserAsset vip = asset(7L, 100);
        vip.setVipStatus("active");
        vip.setVipExpireTime(LocalDateTime.now().plusDays(1));

        when(appUserDao.selectById(7L)).thenReturn(current);
        when(appUserDao.selectById(8L)).thenReturn(target);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(accessProjectionService.project(target)).thenReturn("OPEN");
        when(likeDao.selectOne(any())).thenReturn(like);
        when(userAssetDao.selectByUserId(7L)).thenReturn(vip);

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.quote(7L, likeQuote()))
                .isInstanceOf(com.spacetime.common.exception.BusinessException.class)
                .hasMessageContaining("会员");
        verify(sceneConfigDao, never()).selectPage(any(), any());
        verify(valueOperations, never()).set(anyString(), anyString(), any(Duration.class));
    }

    @Test
    void confirmCannotDeductWhenVipActivatedAfterQuote() {
        AppUser current = activeUser(7L, "current");
        AppUser target = activeUser(8L, "target");
        AppRelationLike like = activeLike();
        UserAsset ordinary = asset(7L, 100);
        UserAsset vip = asset(7L, 100);
        vip.setVipStatus("active");
        vip.setVipExpireTime(LocalDateTime.now().plusDays(1));
        CoinSceneConfig config = new CoinSceneConfig();
        config.setSceneCode("likes_unlock_one");
        config.setUnitPrice(8);
        config.setStatus("ENABLED");
        Page<CoinSceneConfig> configPage = new Page<>(1, 1, 1);
        configPage.setRecords(List.of(config));

        when(appUserDao.selectById(7L)).thenReturn(current);
        when(appUserDao.selectById(8L)).thenReturn(target);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(accessProjectionService.project(target)).thenReturn("OPEN");
        when(likeDao.selectOne(any())).thenReturn(like);
        when(unlockRecordDao.selectList(any())).thenReturn(List.of());
        when(sceneConfigDao.selectPage(any(), any())).thenReturn(configPage);
        when(userAssetDao.selectByUserId(7L)).thenReturn(ordinary);
        when(userAssetDao.selectByUserIdForUpdate(7L)).thenReturn(vip);

        UnlockQuoteVO quote = service.quote(7L, likeQuote());
        RelationUnlockConfirmReq confirmReq = new RelationUnlockConfirmReq();
        confirmReq.setRequestId("unlock-vip-after-quote");
        confirmReq.setQuoteToken(quote.getQuoteToken());

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.confirm(7L, confirmReq))
                .isInstanceOf(com.spacetime.common.exception.BusinessException.class)
                .hasMessageContaining("会员");
        verify(userAssetDao, never()).updateCoinBalance(any(), any());
        verify(unlockRecordDao, never()).insert(any());
        verify(coinLogDao, never()).insert(any());
    }

    @Test
    void requestIdCannotBeReusedWithAnotherQuoteToken() {
        UserUnlockRecord existing = new UserUnlockRecord();
        existing.setUnlockNo("ULK-001");
        existing.setRequestId("same-request");
        existing.setQuoteToken("quote-a");
        existing.setUserId(7L);
        existing.setTargetUserId(8L);
        existing.setTargetBizType("like");
        existing.setTargetBizNo("LIK-001");
        existing.setUnlockScene("likes_unlock_one");
        existing.setCoinCost(8);
        existing.setStatus("active");
        when(unlockRecordDao.selectList(any())).thenReturn(List.of(existing));

        RelationUnlockConfirmReq req = new RelationUnlockConfirmReq();
        req.setRequestId("same-request");
        req.setQuoteToken("quote-b");

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.confirm(7L, req))
                .isInstanceOf(com.spacetime.common.exception.BusinessException.class)
                .hasMessageContaining("幂等键");
        verify(userAssetDao, never()).updateCoinBalance(any(), any());
    }

    @Test
    void sameRequestAndQuoteReturnsStoredResultAfterQuoteExpires() {
        UserUnlockRecord existing = new UserUnlockRecord();
        existing.setUnlockNo("ULK-001");
        existing.setRequestId("same-request");
        existing.setQuoteToken("quote-a");
        existing.setUserId(7L);
        existing.setTargetUserId(8L);
        existing.setTargetBizType("like");
        existing.setTargetBizNo("LIK-001");
        existing.setUnlockScene("likes_unlock_one");
        existing.setCoinCost(8);
        existing.setStatus("active");
        when(unlockRecordDao.selectList(any())).thenReturn(List.of(existing));
        when(userAssetDao.selectByUserId(7L)).thenReturn(asset(7L, 92));
        RelationUnlockConfirmReq req = new RelationUnlockConfirmReq();
        req.setRequestId("same-request");
        req.setQuoteToken("quote-a");

        UnlockConfirmVO result = service.confirm(7L, req);

        assertThat(result.getUnlockNo()).isEqualTo("ULK-001");
        assertThat(result.getTargetUserId()).isEqualTo(8L);
        verify(userAssetDao, never()).updateCoinBalance(any(), any());
    }

    @Test
    void visitorUnlockIsReusedWhenTheSameVisitorHasANewerVisitRecord() {
        AppUser current = activeUser(7L, "当前用户");
        AppUser target = activeUser(8L, "同一访客");
        AppRelationVisit latestVisit = new AppRelationVisit();
        latestVisit.setVisitNo("VIS-NEW");
        latestVisit.setVisitorUserId(8L);
        latestVisit.setTargetUserId(7L);
        latestVisit.setVisitStatus("visible");
        latestVisit.setLastVisitTime(LocalDateTime.now());

        UserUnlockRecord existing = new UserUnlockRecord();
        existing.setUnlockNo("ULK-OLD");
        existing.setUserId(7L);
        existing.setTargetUserId(8L);
        existing.setTargetBizType("visit");
        existing.setTargetBizNo("VIS-OLD");
        existing.setUnlockScene("viewers_unlock_one");
        existing.setStatus("active");
        existing.setActiveMarker(1);

        CoinSceneConfig config = new CoinSceneConfig();
        config.setSceneCode("viewers_unlock_one");
        config.setUnitPrice(8);
        config.setStatus("ENABLED");
        Page<CoinSceneConfig> configPage = new Page<>(1, 1, 1);
        configPage.setRecords(List.of(config));

        when(appUserDao.selectById(7L)).thenReturn(current);
        when(appUserDao.selectById(8L)).thenReturn(target);
        when(accessProjectionService.project(current)).thenReturn("OPEN");
        when(accessProjectionService.project(target)).thenReturn("OPEN");
        when(visitDao.selectOne(any())).thenReturn(latestVisit);
        when(userAssetDao.selectByUserId(7L)).thenReturn(asset(7L, 100));
        when(unlockRecordDao.selectActiveByTargetUser(7L, "visit", 8L)).thenReturn(existing);
        when(sceneConfigDao.selectPage(any(), any())).thenReturn(configPage);

        RelationUnlockQuoteReq req = new RelationUnlockQuoteReq();
        req.setScene("viewers_unlock_one");
        req.setTargetBizType("visit");
        req.setTargetBizNo("VIS-NEW");
        UnlockQuoteVO result = service.quote(7L, req);

        assertThat(result.getAlreadyUnlocked()).isTrue();
        assertThat(result.getTargetUserId()).isEqualTo(8L);
        assertThat(result.getQuoteToken()).isNull();
        verify(valueOperations, never()).set(anyString(), anyString(), any(Duration.class));
    }

    private AppUser activeUser(Long id, String nickname) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setNickname(nickname);
        user.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        user.setFirstLoginCompleted(1);
        return user;
    }

    private UserAsset asset(Long userId, int balance) {
        UserAsset asset = new UserAsset();
        asset.setUserId(userId);
        asset.setCoinBalance(balance);
        asset.setVipStatus("inactive");
        asset.setVipExpireTime(LocalDateTime.now().minusDays(1));
        return asset;
    }

    private AppRelationLike activeLike() {
        AppRelationLike like = new AppRelationLike();
        like.setId(11L);
        like.setLikeNo("LIK-001");
        like.setFromUserId(8L);
        like.setToUserId(7L);
        like.setLikeStatus("active");
        like.setActiveMarker(1);
        return like;
    }

    private RelationUnlockQuoteReq likeQuote() {
        RelationUnlockQuoteReq req = new RelationUnlockQuoteReq();
        req.setScene("likes_unlock_one");
        req.setTargetBizType("like");
        req.setTargetBizNo("LIK-001");
        return req;
    }
}
