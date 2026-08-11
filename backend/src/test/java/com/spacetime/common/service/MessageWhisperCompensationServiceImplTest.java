package com.spacetime.common.service;

import com.spacetime.common.dao.AppMessageWhisperDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserCoinLogDao;
import com.spacetime.common.entity.AppMessageWhisper;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.entity.UserCoinLog;
import com.spacetime.common.service.impl.MessageWhisperCompensationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionOperations;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MessageWhisperCompensationServiceImplTest {
    @Mock private AppMessageWhisperDao whisperDao;
    @Mock private UserAssetDao userAssetDao;
    @Mock private UserCoinLogDao coinLogDao;
    @Mock private TransactionOperations transactionOperations;
    @Mock private AssetResultMessageNotificationService assetResultNotificationService;
    @Mock private TransactionStatus transactionStatus;

    private MessageWhisperCompensationServiceImpl service;
    private LocalDateTime now;

    @BeforeEach
    void setUp() {
        when(transactionOperations.execute(any())).thenAnswer(invocation -> {
            TransactionCallback<?> callback = invocation.getArgument(0);
            return callback.doInTransaction(transactionStatus);
        });
        service = new MessageWhisperCompensationServiceImpl(
                whisperDao, userAssetDao, coinLogDao, transactionOperations,
                assetResultNotificationService);
        now = LocalDateTime.of(2026, 8, 10, 12, 0);
    }

    @Test
    void shouldRefundCoinExactlyOnceAndWriteRefundFlow() {
        AppMessageWhisper whisper = refunding("coin", 10);
        UserAsset asset = new UserAsset();
        asset.setUserId(11L);
        asset.setCoinBalance(30);
        String refundKey = "whisper:refund:WSP-1";
        String refundFlowNo = "WRF-WSP-1";
        when(whisperDao.selectRefundingIds(100)).thenReturn(List.of(10L));
        when(whisperDao.selectByIdForUpdate(10L)).thenReturn(whisper);
        when(userAssetDao.selectByUserIdForUpdate(11L)).thenReturn(asset);
        when(coinLogDao.selectByBizIdempotencyKey(refundKey)).thenReturn(null);
        when(userAssetDao.updateCoinBalance(11L, 10)).thenReturn(1);
        when(whisperDao.markRefunded(10L, 2, refundFlowNo, now)).thenReturn(1);

        int processed = service.compensateBatch(now, 100);

        assertThat(processed).isEqualTo(1);
        ArgumentCaptor<UserCoinLog> captor = ArgumentCaptor.forClass(UserCoinLog.class);
        verify(coinLogDao).insert(captor.capture());
        assertThat(captor.getValue().getFlowType()).isEqualTo("refund");
        assertThat(captor.getValue().getChangeAmount()).isEqualTo(10);
        assertThat(captor.getValue().getBalanceBefore()).isEqualTo(30);
        assertThat(captor.getValue().getBalanceAfter()).isEqualTo(40);
        assertThat(captor.getValue().getBizIdempotencyKey()).isEqualTo(refundKey);
        verify(whisperDao).markRefunded(10L, 2, refundFlowNo, now);
        verify(assetResultNotificationService).publishWhisperCompensationAfterCommit(whisper, now);
    }

    @Test
    void shouldRestoreCurrentDayVipQuotaProjectionWithoutCoinFlow() {
        AppMessageWhisper whisper = refunding("vip_free", 0);
        whisper.setBenefitDate(now.toLocalDate());
        whisper.setQuotaSnapshot(2);
        UserAsset asset = new UserAsset();
        asset.setUserId(11L);
        when(whisperDao.selectRefundingIds(100)).thenReturn(List.of(10L));
        when(whisperDao.selectByIdForUpdate(10L)).thenReturn(whisper);
        when(userAssetDao.selectByUserIdForUpdate(11L)).thenReturn(asset);
        when(whisperDao.markRefunded(10L, 2, null, now)).thenReturn(1);
        when(whisperDao.countPaidVipFree(11L, now.toLocalDate())).thenReturn(0L);
        when(userAssetDao.updateFreeWhisperProjection(11L, 2)).thenReturn(1);

        int processed = service.compensateBatch(now, 100);

        assertThat(processed).isEqualTo(1);
        verify(userAssetDao).updateFreeWhisperProjection(11L, 2);
        verify(coinLogDao, never()).insert(any(UserCoinLog.class));
        verify(userAssetDao, never()).updateCoinBalance(any(), any());
    }

    @Test
    void shouldSkipWhisperThatWasAlreadyRefundedByAnotherWorker() {
        AppMessageWhisper whisper = refunding("coin", 10);
        whisper.setPaymentStatus("refunded");
        when(whisperDao.selectRefundingIds(100)).thenReturn(List.of(10L));
        when(whisperDao.selectByIdForUpdate(10L)).thenReturn(whisper);

        int processed = service.compensateBatch(now, 100);

        assertThat(processed).isZero();
        verify(userAssetDao, never()).selectByUserIdForUpdate(any());
        verify(whisperDao, never()).markRefunded(any(), any(Integer.class), any(), eq(now));
    }

    private AppMessageWhisper refunding(String payType, int coinAmount) {
        AppMessageWhisper whisper = new AppMessageWhisper();
        whisper.setId(10L);
        whisper.setWhisperNo("WSP-1");
        whisper.setSenderUserId(11L);
        whisper.setPayType(payType);
        whisper.setPaymentStatus("refunding");
        whisper.setCoinAmount(coinAmount);
        whisper.setVersion(2);
        return whisper;
    }
}
