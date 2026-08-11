package com.spacetime.miniapp.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.constant.AuthConstant;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.dao.AppUserCancelRequestDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserSecurityAuditLogDao;
import com.spacetime.common.dao.RefundRecordDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserCancelRequest;
import com.spacetime.common.entity.RefundRecord;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.enums.CancelRequestStatusEnum;
import com.spacetime.common.enums.RelationInvalidReasonEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.AccountStatusMessageNotificationService;
import com.spacetime.common.service.RelationLifecycleService;
import com.spacetime.miniapp.dto.request.MiniappAccountCancelReq;
import com.spacetime.miniapp.dto.response.CoinBalanceVO;
import com.spacetime.miniapp.dto.response.MiniappAccountCancelCheckVO;
import com.spacetime.miniapp.dto.response.MiniappAccountCancelStatusVO;
import com.spacetime.miniapp.dto.response.VipStatusVO;
import com.spacetime.miniapp.service.CoinService;
import com.spacetime.miniapp.service.MiniappAccountSecurityService;
import com.spacetime.miniapp.service.VipService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 小程序账号注销闭环服务。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MiniappAccountSecurityServiceImpl extends UserSecurityBaseSupport
        implements MiniappAccountSecurityService {
    private static final int DEFAULT_COOLING_DAYS = 30;
    private static final Duration RECHECK_TTL = Duration.ofMinutes(5);
    private static final DateTimeFormatter REQUEST_NO_TIME = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final String RECHECK_KEY_PREFIX = "miniapp:account-cancel:recheck:";
    private static final List<String> RISK_COPY_KEYS = List.of(
            "account_cancel.risk.account_penalty.title",
            "account_cancel.risk.account_penalty.description",
            "account_cancel.risk.refund_processing.title",
            "account_cancel.risk.refund_processing.description",
            "account_cancel.risk.manual_block.title",
            "account_cancel.risk.vip_active.title",
            "account_cancel.risk.vip_active.description",
            "account_cancel.risk.coin_balance.title",
            "account_cancel.risk.coin_balance.description"
    );

    private final AppUserCancelRequestDao cancelRequestDao;
    private final AppUserSecurityAuditLogDao auditLogDao;
    private final AppConfigDao appConfigDao;
    private final AppUserDao appUserDao;
    private final RefundRecordDao refundRecordDao;
    private final VipService vipService;
    private final CoinService coinService;
    private final AccountCancellationRiskEvaluator riskEvaluator;
    private final RelationLifecycleService relationLifecycleService;
    private final AccountStatusMessageNotificationService accountStatusNotificationService;
    private final ObjectMapper objectMapper;
    private final StringRedisTemplate redisTemplate;

    @Override
    public MiniappAccountCancelStatusVO cancelStatus(Long userId) {
        return toVO(cancelRequestDao.selectLatestByUserId(userId), coolingDays());
    }

    @Override
    public MiniappAccountCancelCheckVO cancelCheck(Long userId) {
        MiniappAccountCancelCheckVO result = evaluateCancellation(userId);
        redisTemplate.opsForValue().set(
                RECHECK_KEY_PREFIX + userId,
                result.getRecheckToken(),
                RECHECK_TTL);
        return result;
    }

    @Override
    @Transactional
    public Long applyCancel(Long userId, MiniappAccountCancelReq req) {
        AppUserCancelRequest existing = cancelRequestDao.selectCoolingOffByUserId(userId);
        if (existing != null) {
            return existing.getId();
        }
        if (req == null || !Boolean.TRUE.equals(req.getConfirm())) {
            throw new BusinessException(configValue(
                    "account_cancel.confirm_required",
                    "account_cancel.description"));
        }
        validateReason(req.getReason());
        String cachedToken = redisTemplate.opsForValue().get(RECHECK_KEY_PREFIX + userId);
        if (!StringUtils.hasText(req.getRecheckToken()) || !req.getRecheckToken().equals(cachedToken)) {
            throw new BusinessException(requiredConfig("account_cancel.recheck_required"));
        }

        MiniappAccountCancelCheckVO check = evaluateCancellation(userId);
        if (!Boolean.TRUE.equals(check.getCanSubmit()) || !check.getHardBlocks().isEmpty()) {
            throw new BusinessException(check.getHardBlocks().isEmpty()
                    ? requiredConfig("account_cancel.blocked_fallback_text")
                    : check.getHardBlocks().getFirst().getDescription());
        }

        LocalDateTime now = LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS);
        AppUser user = requireUser(userId);
        VipStatusVO vip = safeVipStatus(userId);
        CoinBalanceVO coin = safeCoinBalance(userId);
        long pendingRefundCount = processingRefundCount(userId);

        AppUserCancelRequest entity = new AppUserCancelRequest();
        entity.setRequestNo(generateRequestNo(userId));
        entity.setUserId(userId);
        entity.setStatus(CancelRequestStatusEnum.COOLING_OFF.getCode());
        entity.setReason(req.getReason().trim());
        entity.setCoolingEndTime(now.plusDays(coolingDays()));
        entity.setHardBlockSnapshot(toJson(check.getHardBlocks()));
        entity.setRiskSnapshot(toJson(check.getRisks()));
        entity.setVipSnapshot(toJson(vip));
        entity.setCoinBalance(coin.getCoinBalance() != null ? coin.getCoinBalance() : 0);
        entity.setRefundSnapshot(toJson(Map.of("processingCount", pendingRefundCount)));
        entity.setDisputeSnapshot(toJson(Map.of("processingCount", 0)));
        entity.setPenaltySnapshot(toJson(Map.of("accountStatus", user.getAccountStatus())));
        entity.setExecutionLog(executionEntry("APPLY", "COOLING_OFF"));
        try {
            cancelRequestDao.insert(entity);
        } catch (DuplicateKeyException e) {
            AppUserCancelRequest concurrent = cancelRequestDao.selectCoolingOffByUserId(userId);
            if (concurrent != null) {
                return concurrent.getId();
            }
            throw e;
        }

        user.setAccountStatus(AccountStatusEnum.CANCELLING.getCode());
        user.setUpdateTime(now);
        appUserDao.updateById(user);
        relationLifecycleService.invalidateByUser(
                userId, RelationInvalidReasonEnum.ACCOUNT_DELETED, now);
        accountStatusNotificationService.publishAfterCommit(
                userId, AccountStatusEnum.CANCELLING.getCode(), now);
        redisTemplate.delete(RECHECK_KEY_PREFIX + userId);
        writeAudit(
                auditLogDao,
                userId,
                userId,
                "ACCOUNT_CANCEL",
                entity.getId(),
                "APPLY",
                null,
                entity.getStatus());
        return entity.getId();
    }

    @Override
    @Transactional
    public void revokeCancel(Long userId) {
        AppUserCancelRequest entity = cancelRequestDao.selectCoolingOffByUserId(userId);
        if (entity == null) {
            throw new BusinessException(requiredConfig("account_cancel.no_active_request"));
        }
        entity.setStatus(CancelRequestStatusEnum.RESTORED.getCode());
        entity.setRevokedTime(LocalDateTime.now());
        entity.setExecutionLog(appendExecution(
                entity.getExecutionLog(),
                executionEntry("REVOKE", CancelRequestStatusEnum.RESTORED.getCode())));
        cancelRequestDao.updateById(entity);

        AppUser user = requireUser(userId);
        user.setAccountStatus(AccountStatusEnum.NORMAL.getCode());
        appUserDao.updateById(user);
        writeAudit(
                auditLogDao,
                userId,
                userId,
                "ACCOUNT_CANCEL",
                entity.getId(),
                "REVOKE",
                CancelRequestStatusEnum.COOLING_OFF.getCode(),
                entity.getStatus());
    }

    @Override
    @Transactional
    public int executeDueCancellations() {
        List<AppUserCancelRequest> dueRequests =
                cancelRequestDao.selectDueCoolingOff(LocalDateTime.now(), 100);
        int affected = 0;
        for (AppUserCancelRequest request : dueRequests) {
            try {
                MiniappAccountCancelCheckVO check = evaluateCancellation(request.getUserId());
                if (!check.getHardBlocks().isEmpty()) {
                    request.setBlockReason(check.getHardBlocks().getFirst().getDescription());
                    request.setHardBlockSnapshot(toJson(check.getHardBlocks()));
                    request.setNextRetryTime(LocalDateTime.now().plusHours(1));
                    request.setExecutionLog(appendExecution(
                            request.getExecutionLog(),
                            executionEntry("RETRY_BLOCKED", request.getBlockReason())));
                    cancelRequestDao.updateById(request);
                    continue;
                }
                LocalDateTime now = LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS);
                AppUser user = requireUser(request.getUserId());
                user.setAccountStatus(AccountStatusEnum.CANCELLED.getCode());
                user.setUpdateTime(now);
                appUserDao.updateById(user);
                relationLifecycleService.invalidateByUser(
                        request.getUserId(), RelationInvalidReasonEnum.ACCOUNT_DELETED, now);
                accountStatusNotificationService.publishAfterCommit(
                        request.getUserId(), AccountStatusEnum.CANCELLED.getCode(), now);

                request.setStatus(CancelRequestStatusEnum.CANCELLED.getCode());
                request.setFinalCancelTime(now);
                request.setBlockReason(null);
                request.setNextRetryTime(null);
                request.setExecutionLog(appendExecution(
                        request.getExecutionLog(),
                        executionEntry("COMPLETE", CancelRequestStatusEnum.CANCELLED.getCode())));
                cancelRequestDao.updateById(request);
                writeAudit(
                        auditLogDao,
                        request.getUserId(),
                        null,
                        "ACCOUNT_CANCEL",
                        request.getId(),
                        "COMPLETE",
                        CancelRequestStatusEnum.COOLING_OFF.getCode(),
                        request.getStatus());
                affected++;
            } catch (RuntimeException e) {
                log.error("注销到期执行失败: requestId={}, userId={}",
                        request.getId(), request.getUserId(), e);
                request.setNextRetryTime(LocalDateTime.now().plusHours(1));
                request.setExecutionLog(appendExecution(
                        request.getExecutionLog(),
                        executionEntry("RETRY_ERROR", requiredConfig(
                                "account_cancel.risk.dependency_unavailable.description"))));
                cancelRequestDao.updateById(request);
            }
        }
        return affected;
    }

    @Override
    public void logout(String token) {
        if (StringUtils.hasText(token)) {
            redisTemplate.delete(AuthConstant.MINIAPP_TOKEN_PREFIX + token);
        }
    }

    private MiniappAccountCancelCheckVO evaluateCancellation(Long userId) {
        Map<String, String> copy = riskCopy();
        AppUser user = appUserDao.selectById(userId);
        String manualBlock = configOrNull("account_cancel.block_reason." + userId);
        VipStatusVO vip = null;
        CoinBalanceVO coin = null;
        boolean hasProcessingRefund = false;
        try {
            vip = safeVipStatus(userId);
            coin = safeCoinBalance(userId);
            hasProcessingRefund = processingRefundCount(userId) > 0;
        } catch (RuntimeException e) {
            log.warn("注销实时风险依赖校验失败: userId={}", userId, e);
            manualBlock = requiredConfig("account_cancel.risk.dependency_unavailable.description");
        }
        if (user == null && !StringUtils.hasText(manualBlock)) {
            manualBlock = requiredConfig("account_cancel.risk.dependency_unavailable.description");
        }
        return riskEvaluator.evaluate(
                user != null ? user.getAccountStatus() : AccountStatusEnum.CANCELLED.getCode(),
                hasProcessingRefund,
                manualBlock,
                vip,
                coin,
                coolingDays(),
                requiredConfig("account_cancel.description"),
                cancellationReasons(),
                copy);
    }

    private void validateReason(String reason) {
        if (!StringUtils.hasText(reason)) {
            throw new BusinessException(requiredConfig("account_cancel.reason_required"));
        }
        List<String> allowed = cancellationReasons();
        String normalized = reason.trim();
        boolean valid = allowed.contains(normalized)
                || (allowed.contains("其他") && normalized.startsWith("其他："));
        if (!valid) {
            throw new BusinessException(requiredConfig("account_cancel.reason_required"));
        }
    }

    private List<String> cancellationReasons() {
        String json = requiredConfig("account_cancel.reasons");
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            throw new BusinessException(requiredConfig("account_cancel.reason_required"));
        }
    }

    private Map<String, String> riskCopy() {
        Map<String, String> result = new HashMap<>();
        for (AppConfig config : appConfigDao.selectByKeys(RISK_COPY_KEYS)) {
            if (config != null && StringUtils.hasText(config.getConfigValue())) {
                result.put(
                        config.getConfigKey().replace("account_cancel.risk.", ""),
                        config.getConfigValue());
            }
        }
        return result;
    }

    private VipStatusVO safeVipStatus(Long userId) {
        VipStatusVO status = vipService.getStatus(userId);
        return status != null ? status : new VipStatusVO();
    }

    private CoinBalanceVO safeCoinBalance(Long userId) {
        CoinBalanceVO balance = coinService.getBalance(userId);
        if (balance == null) {
            balance = new CoinBalanceVO();
            balance.setCoinBalance(0);
        }
        return balance;
    }

    private long processingRefundCount(Long userId) {
        Long count = refundRecordDao.count(new LambdaQueryWrapper<RefundRecord>()
                .eq(RefundRecord::getUserId, userId)
                .eq(RefundRecord::getRefundStatus, "processing"));
        return count != null ? count : 0L;
    }

    private AppUser requireUser(Long userId) {
        AppUser user = appUserDao.selectById(userId);
        if (user == null) {
            throw new BusinessException(requiredConfig(
                    "account_cancel.risk.dependency_unavailable.description"));
        }
        return user;
    }

    private MiniappAccountCancelStatusVO toVO(AppUserCancelRequest entity, int coolingDays) {
        MiniappAccountCancelStatusVO vo = new MiniappAccountCancelStatusVO();
        vo.setCoolingDays(coolingDays);
        if (entity == null) {
            vo.setStatus("NONE");
            return vo;
        }
        vo.setId(entity.getId());
        vo.setRequestNo(entity.getRequestNo());
        vo.setStatus(entity.getStatus());
        vo.setReason(entity.getReason());
        vo.setBlockReason(entity.getBlockReason());
        vo.setCoolingEndTime(
                entity.getCoolingEndTime() != null ? entity.getCoolingEndTime().format(FMT) : null);
        return vo;
    }

    private int coolingDays() {
        String value = configOrNull("account_cancel.cooling_days");
        if (!StringUtils.hasText(value)) {
            return DEFAULT_COOLING_DAYS;
        }
        try {
            return Math.max(1, Integer.parseInt(value));
        } catch (NumberFormatException e) {
            return DEFAULT_COOLING_DAYS;
        }
    }

    private String generateRequestNo(Long userId) {
        return "CAN" + LocalDateTime.now().format(REQUEST_NO_TIME)
                + userId
                + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    }

    private String configValue(String primaryKey, String fallbackKey) {
        String value = configOrNull(primaryKey);
        return StringUtils.hasText(value) ? value : requiredConfig(fallbackKey);
    }

    private String requiredConfig(String key) {
        String value = configOrNull(key);
        if (!StringUtils.hasText(value)) {
            throw new BusinessException("缺少必要动态配置：" + key);
        }
        return value;
    }

    private String configOrNull(String key) {
        AppConfig config = appConfigDao.selectByKey(key);
        return config != null ? config.getConfigValue() : null;
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException("注销快照序列化失败", e);
        }
    }

    private String executionEntry(String action, String result) {
        return toJson(Map.of(
                "time", LocalDateTime.now().format(FMT),
                "action", action,
                "result", result != null ? result : ""));
    }

    private String appendExecution(String existing, String entry) {
        return StringUtils.hasText(existing) ? existing + "\n" + entry : entry;
    }
}
