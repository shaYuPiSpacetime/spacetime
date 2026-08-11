package com.spacetime.common.service.impl;

import com.spacetime.common.dao.AppMessageWhisperDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserCoinLogDao;
import com.spacetime.common.entity.AppMessageWhisper;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.entity.UserCoinLog;
import com.spacetime.common.enums.BizSceneEnum;
import com.spacetime.common.enums.FlowTypeEnum;
import com.spacetime.common.service.AssetResultMessageNotificationService;
import com.spacetime.common.service.MessageWhisperCompensationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionOperations;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

/** 以悄悄话行为幂等事实，原子退还千寻币或恢复当日会员免费次数投影。 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MessageWhisperCompensationServiceImpl implements MessageWhisperCompensationService {
    private static final String PAY_COIN = "coin";
    private static final String PAY_VIP_FREE = "vip_free";

    private final AppMessageWhisperDao whisperDao;
    private final UserAssetDao userAssetDao;
    private final UserCoinLogDao coinLogDao;
    private final TransactionOperations transactionOperations;
    private final AssetResultMessageNotificationService assetResultNotificationService;

    @Override
    public int compensateBatch(LocalDateTime now, int limit) {
        LocalDateTime effectiveNow = now == null ? LocalDateTime.now() : now;
        List<Long> ids = whisperDao.selectRefundingIds(Math.max(1, Math.min(limit, 500)));
        int processed = 0;
        for (Long id : ids) {
            try {
                AppMessageWhisper compensated = transactionOperations.execute(
                        status -> compensateOne(id, effectiveNow));
                if (compensated != null) {
                    processed++;
                    assetResultNotificationService.publishWhisperCompensationAfterCommit(
                            compensated, effectiveNow);
                }
            } catch (RuntimeException ex) {
                log.warn("Whisper compensation failed, whisperId={}", id, ex);
            }
        }
        return processed;
    }

    private AppMessageWhisper compensateOne(Long whisperId, LocalDateTime now) {
        AppMessageWhisper whisper = whisperDao.selectByIdForUpdate(whisperId);
        if (whisper == null || !"refunding".equals(whisper.getPaymentStatus())) {
            return null;
        }
        UserAsset asset = userAssetDao.selectByUserIdForUpdate(whisper.getSenderUserId());
        if (asset == null) {
            throw new IllegalStateException("Whisper refund asset missing");
        }
        if (PAY_COIN.equals(whisper.getPayType())) {
            refundCoin(whisper, asset, now);
            whisper.setPaymentStatus("refunded");
            whisper.setUpdateTime(now);
            return whisper;
        }
        if (PAY_VIP_FREE.equals(whisper.getPayType())) {
            refundVipFree(whisper, now);
            whisper.setPaymentStatus("refunded");
            whisper.setUpdateTime(now);
            return whisper;
        }
        throw new IllegalStateException("Whisper refund pay type unsupported");
    }

    private void refundCoin(AppMessageWhisper whisper, UserAsset asset, LocalDateTime now) {
        int amount = valueOrZero(whisper.getCoinAmount());
        if (amount <= 0) {
            throw new IllegalStateException("Whisper refund amount invalid");
        }
        String idempotencyKey = "whisper:refund:" + whisper.getWhisperNo();
        String refundFlowNo = "WRF-" + whisper.getWhisperNo();
        UserCoinLog existing = coinLogDao.selectByBizIdempotencyKey(idempotencyKey);
        if (existing == null) {
            int before = valueOrZero(asset.getCoinBalance());
            if (userAssetDao.updateCoinBalance(whisper.getSenderUserId(), amount) != 1) {
                throw new IllegalStateException("Whisper coin refund failed");
            }
            UserCoinLog log = new UserCoinLog();
            log.setFlowNo(refundFlowNo);
            log.setUserId(whisper.getSenderUserId());
            log.setFlowType(FlowTypeEnum.REFUND.getCode());
            log.setChangeAmount(amount);
            log.setBalanceBefore(before);
            log.setBalanceAfter(before + amount);
            log.setBizScene(BizSceneEnum.WHISPER.getCode());
            log.setBizDesc("悄悄话发送失败退款 " + whisper.getWhisperNo());
            log.setRefId(whisper.getId());
            log.setRefType("app_message_whisper");
            log.setBizIdempotencyKey(idempotencyKey);
            coinLogDao.insert(log);
        } else if (!Objects.equals(existing.getUserId(), whisper.getSenderUserId())
                || !Objects.equals(existing.getChangeAmount(), amount)
                || !FlowTypeEnum.REFUND.getCode().equals(existing.getFlowType())) {
            throw new IllegalStateException("Whisper refund idempotency conflict");
        } else {
            refundFlowNo = existing.getFlowNo();
        }
        markRefunded(whisper, refundFlowNo, now);
    }

    private void refundVipFree(AppMessageWhisper whisper, LocalDateTime now) {
        markRefunded(whisper, null, now);
        if (whisper.getBenefitDate() == null || !whisper.getBenefitDate().equals(now.toLocalDate())) {
            return;
        }
        int quota = Math.max(0, valueOrZero(whisper.getQuotaSnapshot()));
        long used = whisperDao.countPaidVipFree(whisper.getSenderUserId(), whisper.getBenefitDate());
        int remain = Math.max(0, quota - Math.toIntExact(Math.min(used, Integer.MAX_VALUE)));
        if (userAssetDao.updateFreeWhisperProjection(whisper.getSenderUserId(), remain) != 1) {
            throw new IllegalStateException("Whisper VIP quota projection refund failed");
        }
    }

    private void markRefunded(AppMessageWhisper whisper, String refundFlowNo, LocalDateTime now) {
        if (whisperDao.markRefunded(whisper.getId(), valueOrZero(whisper.getVersion()),
                refundFlowNo, now) != 1) {
            throw new IllegalStateException("Whisper refund state conflict");
        }
    }

    private int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }
}
