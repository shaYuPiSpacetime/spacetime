package com.spacetime.admin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.admin.dto.request.FeedbackPageReq;
import com.spacetime.admin.dto.request.FeedbackStatusUpdateReq;
import com.spacetime.admin.dto.response.AdminFeedbackVO;
import com.spacetime.admin.service.UserSecurityFeedbackAdminService;
import com.spacetime.common.dao.AppUserFeedbackDao;
import com.spacetime.common.dao.AppUserSecurityAuditLogDao;
import com.spacetime.common.dao.UserDao;
import com.spacetime.common.entity.AppUserFeedback;
import com.spacetime.common.entity.AppUserSecurityAuditLog;
import com.spacetime.common.entity.SysUser;
import com.spacetime.common.enums.FeedbackStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContextHolder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserSecurityFeedbackAdminServiceImpl implements UserSecurityFeedbackAdminService {
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final AppUserFeedbackDao feedbackDao;
    private final AppUserSecurityAuditLogDao auditLogDao;
    private final UserDao userDao;
    private final ObjectMapper objectMapper;

    @Override
    public Page<AdminFeedbackVO> list(FeedbackPageReq req) {
        LambdaQueryWrapper<AppUserFeedback> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(req.getUserId() != null, AppUserFeedback::getUserId, req.getUserId());
        wrapper.eq(StringUtils.hasText(req.getFeedbackType()), AppUserFeedback::getFeedbackType, req.getFeedbackType());
        wrapper.eq(StringUtils.hasText(req.getStatus()), AppUserFeedback::getStatus, req.getStatus());
        wrapper.orderByDesc(AppUserFeedback::getCreateTime);
        Page<AppUserFeedback> result = feedbackDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<AdminFeedbackVO> voPage = new Page<>(result.getCurrent(), result.getSize(), result.getTotal());
        voPage.setRecords(result.getRecords().stream().map(this::toVO).toList());
        return voPage;
    }

    @Override
    public AdminFeedbackVO detail(Long id) {
        AppUserFeedback entity = feedbackDao.selectById(id);
        if (entity == null) {
            throw new BusinessException("反馈不存在");
        }
        return toVO(entity);
    }

    @Override
    @Transactional
    public void updateStatus(Long id, FeedbackStatusUpdateReq req) {
        AppUserFeedback entity = feedbackDao.selectById(id);
        if (entity == null) {
            throw new BusinessException("反馈不存在");
        }
        if (FeedbackStatusEnum.getByCode(req.getStatus()) == null) {
            throw new BusinessException("不支持的反馈状态");
        }
        if (!StringUtils.hasText(req.getRemark())) {
            throw new BusinessException("处理备注不能为空");
        }
        String before = entity.getStatus();
        entity.setStatus(req.getStatus());
        entity.setHandleRemark(req.getRemark());
        entity.setHandledBy(currentAdminId());
        entity.setHandledTime(LocalDateTime.now());
        feedbackDao.updateById(entity);
        writeAudit(entity.getUserId(), id, "FEEDBACK_STATUS", before, req.getStatus());
    }

    private AdminFeedbackVO toVO(AppUserFeedback entity) {
        SysUser user = userDao.selectById(entity.getUserId());
        AdminFeedbackVO vo = new AdminFeedbackVO();
        vo.setId(entity.getId());
        vo.setUserId(entity.getUserId());
        vo.setNickname(user != null && StringUtils.hasText(user.getNickname()) ? user.getNickname() : "用户" + entity.getUserId());
        vo.setFeedbackType(entity.getFeedbackType());
        vo.setContent(entity.getContent());
        vo.setImageUrls(parseImages(entity.getImageUrls()));
        vo.setContact(entity.getContact());
        vo.setStatus(entity.getStatus());
        vo.setHandleRemark(entity.getHandleRemark());
        vo.setHandledBy(entity.getHandledBy());
        vo.setHandledTime(entity.getHandledTime() != null ? entity.getHandledTime().format(FMT) : null);
        vo.setCreateTime(entity.getCreateTime() != null ? entity.getCreateTime().format(FMT) : null);
        return vo;
    }

    private List<String> parseImages(String json) {
        if (!StringUtils.hasText(json)) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private void writeAudit(Long userId, Long bizId, String action, String before, String after) {
        AppUserSecurityAuditLog log = new AppUserSecurityAuditLog();
        log.setUserId(userId);
        log.setOperatorId(currentAdminId());
        log.setBizType("FEEDBACK");
        log.setBizId(bizId);
        log.setAction(action);
        log.setBeforeValue(before);
        log.setAfterValue(after);
        auditLogDao.insert(log);
    }

    private Long currentAdminId() {
        return UserContextHolder.get() != null ? UserContextHolder.get().getId() : null;
    }
}
