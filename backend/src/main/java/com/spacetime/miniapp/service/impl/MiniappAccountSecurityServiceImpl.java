package com.spacetime.miniapp.service.impl;

import com.spacetime.common.constant.AuthConstant;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.dao.AppUserCancelRequestDao;
import com.spacetime.common.dao.AppUserSecurityAuditLogDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.entity.AppUserCancelRequest;
import com.spacetime.common.enums.CancelRequestStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.request.MiniappAccountCancelReq;
import com.spacetime.miniapp.dto.response.MiniappAccountCancelStatusVO;
import com.spacetime.miniapp.service.MiniappAccountSecurityService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class MiniappAccountSecurityServiceImpl extends UserSecurityBaseSupport implements MiniappAccountSecurityService {
    private static final int DEFAULT_COOLING_DAYS = 30;

    private final AppUserCancelRequestDao cancelRequestDao;
    private final AppUserSecurityAuditLogDao auditLogDao;
    private final AppConfigDao appConfigDao;
    private final StringRedisTemplate redisTemplate;

    @Override
    public MiniappAccountCancelStatusVO cancelStatus(Long userId) {
        return toVO(cancelRequestDao.selectLatestByUserId(userId), coolingDays());
    }

    @Override
    @Transactional
    public Long applyCancel(Long userId, MiniappAccountCancelReq req) {
        if (req.getConfirm() == null || !req.getConfirm()) {
            throw new BusinessException("请确认注销风险后再提交");
        }
        AppUserCancelRequest existing = cancelRequestDao.selectCoolingOffByUserId(userId);
        if (existing != null) {
            return existing.getId();
        }
        String blockReason = cancelBlockReason(userId);
        if (StringUtils.hasText(blockReason)) {
            throw new BusinessException(blockReason);
        }
        AppUserCancelRequest entity = new AppUserCancelRequest();
        entity.setUserId(userId);
        entity.setStatus(CancelRequestStatusEnum.COOLING_OFF.getCode());
        entity.setReason(req.getReason());
        entity.setCoolingEndTime(LocalDateTime.now().plusDays(coolingDays()));
        cancelRequestDao.insert(entity);
        writeAudit(auditLogDao, userId, userId, "ACCOUNT_CANCEL", entity.getId(), "APPLY", null, entity.getStatus());
        return entity.getId();
    }

    @Override
    @Transactional
    public void revokeCancel(Long userId) {
        AppUserCancelRequest entity = cancelRequestDao.selectCoolingOffByUserId(userId);
        if (entity == null) {
            throw new BusinessException("当前没有可撤销的注销申请");
        }
        entity.setStatus(CancelRequestStatusEnum.REVOKED.getCode());
        entity.setRevokedTime(LocalDateTime.now());
        cancelRequestDao.updateById(entity);
        writeAudit(auditLogDao, userId, userId, "ACCOUNT_CANCEL", entity.getId(), "REVOKE", CancelRequestStatusEnum.COOLING_OFF.getCode(), entity.getStatus());
    }

    @Override
    public void logout(String token) {
        if (StringUtils.hasText(token)) {
            redisTemplate.delete(AuthConstant.MINIAPP_TOKEN_PREFIX + token);
        }
    }

    private MiniappAccountCancelStatusVO toVO(AppUserCancelRequest entity, int coolingDays) {
        MiniappAccountCancelStatusVO vo = new MiniappAccountCancelStatusVO();
        vo.setCoolingDays(coolingDays);
        if (entity == null) {
            vo.setStatus("NONE");
            return vo;
        }
        vo.setId(entity.getId());
        vo.setStatus(entity.getStatus());
        vo.setReason(entity.getReason());
        vo.setBlockReason(entity.getBlockReason());
        vo.setCoolingEndTime(entity.getCoolingEndTime() != null ? entity.getCoolingEndTime().format(FMT) : null);
        return vo;
    }

    /**
     * 注销前置阻断校验
     * TODO: PRD-01/04 接入后补充真实阻断逻辑：
     *   1. 查询用户是否存在封禁处罚中
     *   2. 查询用户是否存在未完成退款
     *   3. 查询用户是否存在进行中的付费争议
     *   4. 查询用户是否存在未到期 VIP 权益
     * 当前仅从 app_config 读取手动配置的阻断原因作为占位
     */
    private String cancelBlockReason(Long userId) {
        AppConfig config = appConfigDao.selectByKey("account_cancel.block_reason." + userId);
        return config != null ? config.getConfigValue() : null;
    }

    private int coolingDays() {
        AppConfig config = appConfigDao.selectByKey("account_cancel.cooling_days");
        if (config == null || !StringUtils.hasText(config.getConfigValue())) {
            return DEFAULT_COOLING_DAYS;
        }
        try {
            return Integer.parseInt(config.getConfigValue());
        } catch (NumberFormatException e) {
            return DEFAULT_COOLING_DAYS;
        }
    }
}
