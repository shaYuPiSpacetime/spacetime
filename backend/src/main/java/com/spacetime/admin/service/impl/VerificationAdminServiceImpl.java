package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.support.SFunction;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.ModerationAuditReq;
import com.spacetime.admin.dto.request.VerificationPageReq;
import com.spacetime.admin.dto.response.VerificationVO;
import com.spacetime.admin.service.VerificationAdminService;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserVerificationDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserVerification;
import com.spacetime.common.enums.VerificationStatusEnum;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 管理后台 — 认证审核服务实现
 * 覆盖实名认证、学历认证、头像认证的列表查询与审核操作
 * 审核通过后自动重算认证等级
 */
@Service
@RequiredArgsConstructor
public class VerificationAdminServiceImpl implements VerificationAdminService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final AppUserVerificationDao verificationDao;
    private final AppUserDao appUserDao;

    /**
     * 实名认证分页列表
     * @param req 筛选条件（用户ID/状态）
     * @return 分页数据（含用户头像和昵称）
     */
    @Override
    public Page<VerificationVO> getRealNamePage(VerificationPageReq req) {
        return queryVerification(req, AppUserVerification::getRealNameStatus, AppUserVerification::getRealNameSubmitTime);
    }

    /**
     * 学历认证分页列表
     * @param req 筛选条件（用户ID/状态）
     * @return 分页数据（含用户头像和昵称）
     */
    @Override
    public Page<VerificationVO> getEducationPage(VerificationPageReq req) {
        return queryVerification(req, AppUserVerification::getEducationStatus, AppUserVerification::getEducationSubmitTime);
    }

    /**
     * 头像认证分页列表
     * @param req 筛选条件（用户ID/状态）
     * @return 分页数据（含用户头像和昵称）
     */
    @Override
    public Page<VerificationVO> getAvatarPage(VerificationPageReq req) {
        return queryVerification(req, AppUserVerification::getAvatarVerifyStatus, AppUserVerification::getAvatarVerifySubmitTime);
    }

    /** 通用认证分页查询，支持按用户ID筛选，按提交时间倒序 */
    private Page<VerificationVO> queryVerification(VerificationPageReq req,
            SFunction<AppUserVerification, String> statusGetter,
            SFunction<AppUserVerification, LocalDateTime> submitTimeGetter) {
        LambdaQueryWrapper<AppUserVerification> wrapper = new LambdaQueryWrapper<AppUserVerification>()
                .eq(req.getUserId() != null, AppUserVerification::getUserId, req.getUserId())
                .orderByDesc(AppUserVerification::getUpdateTime);
        // 只查已有提交记录的
        wrapper.isNotNull(submitTimeGetter);
        Page<AppUserVerification> page = verificationDao.selectPage(
                new Page<>(req.getPage(), req.getSize()), wrapper);

        // 按 status 筛选（如果有）
        List<AppUserVerification> filtered;
        if (StrUtil.isNotBlank(req.getStatus()) && statusGetter != null) {
            filtered = page.getRecords().stream()
                    .filter(v -> req.getStatus().equals(statusGetter.apply(v)))
                    .collect(Collectors.toList());
        } else {
            filtered = page.getRecords();
        }

        // 批量查询用户信息（空列表时避免 SQL IN () 语法错误）
        Map<Long, AppUser> userMap = filtered.isEmpty() ? Map.of() : appUserDao.selectList(new LambdaQueryWrapper<AppUser>()
                .in(AppUser::getId, filtered.stream().map(AppUserVerification::getUserId).toList()))
                .stream().collect(Collectors.toMap(AppUser::getId, u -> u, (a, b) -> a));

        List<VerificationVO> records = new ArrayList<>();
        for (AppUserVerification v : filtered) {
            VerificationVO vo = new VerificationVO();
            vo.setId(v.getId());
            vo.setUserId(v.getUserId());
            AppUser user = userMap.get(v.getUserId());
            vo.setAvatar(user != null ? user.getAvatar() : null);
            vo.setNickname(user != null ? user.getNickname() : null);
            vo.setStatus(statusGetter != null ? statusGetter.apply(v) : null);
            LocalDateTime submitTime = submitTimeGetter != null ? submitTimeGetter.apply(v) : null;
            vo.setSubmitTime(submitTime != null ? submitTime.format(FMT) : null);
            records.add(vo);
        }

        Page<VerificationVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(records);
        return result;
    }

    /**
     * 实名认证审核（通过/驳回）
     * 审核完成后重算认证等级
     * @param id 认证记录ID
     * @param req 审核动作与驳回原因
     */
    @Override
    @Transactional
    public void auditRealName(Long id, ModerationAuditReq req) {
        AppUserVerification verification = requireVerification(id);
        applyAudit(verification, req);
        verification.setRealNameStatus(
                "APPROVE".equals(req.getAction())
                        ? VerificationStatusEnum.APPROVED.getCode()
                        : VerificationStatusEnum.REJECTED.getCode());
        verification.setRealNameResultTime(LocalDateTime.now());
        verification.setRealNameRejectReason(req.getRejectReason());
        verification.setVerifyLevel(recalcVerifyLevel(verification));
        verificationDao.updateById(verification);
    }

    /**
     * 学历认证审核（通过/驳回）
     * 审核完成后重算认证等级
     * @param id 认证记录ID
     * @param req 审核动作与驳回原因
     */
    @Override
    @Transactional
    public void auditEducation(Long id, ModerationAuditReq req) {
        AppUserVerification verification = requireVerification(id);
        applyAudit(verification, req);
        verification.setEducationStatus(
                "APPROVE".equals(req.getAction())
                        ? VerificationStatusEnum.APPROVED.getCode()
                        : VerificationStatusEnum.REJECTED.getCode());
        verification.setEducationResultTime(LocalDateTime.now());
        verification.setEducationRejectReason(req.getRejectReason());
        verification.setVerifyLevel(recalcVerifyLevel(verification));
        verificationDao.updateById(verification);
    }

    /**
     * 头像认证审核（通过/驳回）
     * 审核完成后重算认证等级
     * @param id 认证记录ID
     * @param req 审核动作与驳回原因
     */
    @Override
    @Transactional
    public void auditAvatar(Long id, ModerationAuditReq req) {
        AppUserVerification verification = requireVerification(id);
        applyAudit(verification, req);
        verification.setAvatarVerifyStatus(
                "APPROVE".equals(req.getAction())
                        ? VerificationStatusEnum.APPROVED.getCode()
                        : VerificationStatusEnum.REJECTED.getCode());
        verification.setAvatarVerifyResultTime(LocalDateTime.now());
        verification.setAvatarVerifyRejectReason(req.getRejectReason());
        verification.setVerifyLevel(recalcVerifyLevel(verification));
        verificationDao.updateById(verification);
    }

    /** 校验审核动作是否为 APPROVE 或 REJECT */
    private void applyAudit(AppUserVerification verification, ModerationAuditReq req) {
        if (!"APPROVE".equals(req.getAction()) && !"REJECT".equals(req.getAction())) {
            throw new BusinessException("不支持的审核动作");
        }
    }

    /** 根据三个认证项的通过数量重算认证等级 */
    private int recalcVerifyLevel(AppUserVerification verification) {
        int level = 0;
        if (VerificationStatusEnum.APPROVED.getCode().equals(verification.getRealNameStatus())) level++;
        if (VerificationStatusEnum.APPROVED.getCode().equals(verification.getEducationStatus())) level++;
        if (VerificationStatusEnum.APPROVED.getCode().equals(verification.getAvatarVerifyStatus())) level++;
        return level;
    }

    /** 查询认证记录，不存在抛异常 */
    private AppUserVerification requireVerification(Long id) {
        AppUserVerification v = verificationDao.selectById(id);
        if (v == null) throw new BusinessException("认证记录不存在");
        return v;
    }
}
