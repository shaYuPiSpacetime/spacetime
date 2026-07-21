package com.spacetime.admin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.admin.dto.request.CancelRequestPageReq;
import com.spacetime.admin.dto.request.CancelRequestRemarkReq;
import com.spacetime.admin.dto.response.AdminCancelRequestVO;
import com.spacetime.admin.service.UserSecurityCancelAdminService;
import com.spacetime.common.dao.AppUserCancelRemarkDao;
import com.spacetime.common.dao.AppUserCancelRequestDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserSecurityAuditLogDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserCancelRemark;
import com.spacetime.common.entity.AppUserCancelRequest;
import com.spacetime.common.entity.AppUserSecurityAuditLog;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContextHolder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * 注销申请后台只读查询与追加备注服务。
 */
@Service
@RequiredArgsConstructor
public class UserSecurityCancelAdminServiceImpl implements UserSecurityCancelAdminService {
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final AppUserCancelRequestDao cancelRequestDao;
    private final AppUserCancelRemarkDao cancelRemarkDao;
    private final AppUserSecurityAuditLogDao auditLogDao;
    private final AppUserDao appUserDao;
    private final ObjectMapper objectMapper;

    @Override
    public Page<AdminCancelRequestVO> list(CancelRequestPageReq req) {
        LambdaQueryWrapper<AppUserCancelRequest> wrapper = new LambdaQueryWrapper<>();
        wrapper.like(StringUtils.hasText(req.getRequestNo()),
                AppUserCancelRequest::getRequestNo, req.getRequestNo());
        wrapper.eq(req.getUserId() != null, AppUserCancelRequest::getUserId, req.getUserId());
        wrapper.eq(StringUtils.hasText(req.getStatus()), AppUserCancelRequest::getStatus, req.getStatus());
        if (Boolean.TRUE.equals(req.getHasBlock())) {
            wrapper.isNotNull(AppUserCancelRequest::getBlockReason);
        } else if (Boolean.FALSE.equals(req.getHasBlock())) {
            wrapper.isNull(AppUserCancelRequest::getBlockReason);
        }
        applyKeywordFilter(wrapper, req.getKeyword(), req.getPhone());
        wrapper.orderByDesc(AppUserCancelRequest::getCreateTime);

        Page<AppUserCancelRequest> result = cancelRequestDao.selectPage(
                new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<AdminCancelRequestVO> voPage =
                new Page<>(result.getCurrent(), result.getSize(), result.getTotal());
        voPage.setRecords(result.getRecords().stream().map(this::toVO).toList());
        return voPage;
    }

    @Override
    public AdminCancelRequestVO detail(Long id) {
        return toVO(requireRequest(id));
    }

    @Override
    @Transactional
    public void remark(Long id, CancelRequestRemarkReq req) {
        AppUserCancelRequest request = requireRequest(id);
        Long operatorId = UserContextHolder.get() != null
                ? UserContextHolder.get().getId()
                : null;
        if (operatorId == null) {
            throw new BusinessException("未获取到后台操作人");
        }

        AppUserCancelRemark detail = new AppUserCancelRemark();
        detail.setRequestId(request.getId());
        detail.setUserId(request.getUserId());
        detail.setOperatorId(operatorId);
        detail.setRemark(req.getRemark().trim());
        cancelRemarkDao.insert(detail);

        String before = request.getRemark();
        request.setRemark(StringUtils.hasText(before)
                ? before + "\n" + detail.getRemark()
                : detail.getRemark());
        cancelRequestDao.updateById(request);
        writeAudit(
                request.getUserId(),
                id,
                before,
                request.getRemark(),
                operatorId);
    }

    private void applyKeywordFilter(
            LambdaQueryWrapper<AppUserCancelRequest> wrapper,
            String keyword,
            String phone) {
        String search = StringUtils.hasText(keyword) ? keyword.trim()
                : StringUtils.hasText(phone) ? phone.trim() : null;
        if (!StringUtils.hasText(search)) {
            return;
        }
        List<AppUser> users = appUserDao.selectList(new LambdaQueryWrapper<AppUser>()
                .like(AppUser::getPhone, search)
                .or()
                .like(AppUser::getNickname, search)
                .last("LIMIT 200"));
        Set<Long> userIds = new LinkedHashSet<>();
        for (AppUser user : users) {
            userIds.add(user.getId());
        }
        try {
            userIds.add(Long.parseLong(search));
        } catch (NumberFormatException ignored) {
            // 非数字关键词只按申请编号、手机号和昵称查询。
        }
        wrapper.and(condition -> {
            condition.like(AppUserCancelRequest::getRequestNo, search);
            if (!userIds.isEmpty()) {
                condition.or().in(AppUserCancelRequest::getUserId, userIds);
            }
        });
    }

    private AppUserCancelRequest requireRequest(Long id) {
        AppUserCancelRequest request = cancelRequestDao.selectById(id);
        if (request == null) {
            throw new BusinessException("注销申请不存在");
        }
        return request;
    }

    private AdminCancelRequestVO toVO(AppUserCancelRequest entity) {
        AppUser user = appUserDao.selectById(entity.getUserId());
        AdminCancelRequestVO vo = new AdminCancelRequestVO();
        vo.setId(entity.getId());
        vo.setRequestNo(entity.getRequestNo());
        vo.setUserId(entity.getUserId());
        vo.setUserCode(String.valueOf(entity.getUserId()));
        vo.setNickname(user != null && StringUtils.hasText(user.getNickname())
                ? user.getNickname()
                : null);
        vo.setPhone(user != null ? user.getPhone() : null);
        vo.setStatus(entity.getStatus());
        vo.setReason(entity.getReason());
        vo.setBlockReason(entity.getBlockReason());
        vo.setBlockReasons(blockReasons(entity));
        vo.setRemark(entity.getRemark());
        vo.setRemarks(remarks(entity));
        vo.setVipRisk(riskDescription(entity.getRiskSnapshot(), "VIP_ACTIVE"));
        vo.setRefundRisk(refundRisk(entity.getRefundSnapshot()));
        vo.setCoinBalance(entity.getCoinBalance());
        vo.setExecutionLog(entity.getExecutionLog());
        vo.setCoolingEndTime(format(entity.getCoolingEndTime()));
        vo.setRevokedTime(format(entity.getRevokedTime()));
        vo.setFinalCancelTime(format(entity.getFinalCancelTime()));
        vo.setCreateTime(format(entity.getCreateTime()));
        return vo;
    }

    private List<String> blockReasons(AppUserCancelRequest entity) {
        List<String> reasons = descriptions(entity.getHardBlockSnapshot(), null);
        if (reasons.isEmpty() && StringUtils.hasText(entity.getBlockReason())) {
            return List.of(entity.getBlockReason());
        }
        return reasons;
    }

    private List<String> remarks(AppUserCancelRequest entity) {
        List<AppUserCancelRemark> details = cancelRemarkDao.selectByRequestId(entity.getId());
        if (!details.isEmpty()) {
            return details.stream().map(AppUserCancelRemark::getRemark).toList();
        }
        if (!StringUtils.hasText(entity.getRemark())) {
            return List.of();
        }
        return List.of(entity.getRemark().split("\\n"));
    }

    private String riskDescription(String json, String code) {
        return String.join("；", descriptions(json, code));
    }

    private List<String> descriptions(String json, String code) {
        if (!StringUtils.hasText(json)) {
            return List.of();
        }
        try {
            JsonNode root = objectMapper.readTree(json);
            List<String> result = new ArrayList<>();
            if (root.isArray()) {
                for (JsonNode item : root) {
                    if (code == null || code.equals(item.path("code").asText())) {
                        String description = item.path("description").asText();
                        if (StringUtils.hasText(description)) {
                            result.add(description);
                        }
                    }
                }
            }
            return result;
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private String refundRisk(String json) {
        if (!StringUtils.hasText(json)) {
            return null;
        }
        try {
            long processingCount = objectMapper.readTree(json).path("processingCount").asLong();
            return processingCount > 0 ? "处理中退款 " + processingCount + " 笔" : null;
        } catch (Exception ignored) {
            return null;
        }
    }

    private String format(java.time.LocalDateTime value) {
        return value != null ? value.format(FMT) : null;
    }

    private void writeAudit(
            Long userId, Long bizId, String before, String after, Long operatorId) {
        AppUserSecurityAuditLog log = new AppUserSecurityAuditLog();
        log.setUserId(userId);
        log.setOperatorId(operatorId);
        log.setBizType("ACCOUNT_CANCEL");
        log.setBizId(bizId);
        log.setAction("APPEND_REMARK");
        log.setBeforeValue(before);
        log.setAfterValue(after);
        auditLogDao.insert(log);
    }
}
