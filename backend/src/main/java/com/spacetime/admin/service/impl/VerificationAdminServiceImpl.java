package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.support.SFunction;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.ModerationAuditReq;
import com.spacetime.admin.dto.request.VerificationPageReq;
import com.spacetime.admin.dto.response.VerificationAuditDetailVO;
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
import java.util.*;
import java.util.stream.Collectors;

/**
 * 管理后台 — 用户认证审核服务实现
 * 含实名/学历/头像三类认证的分页列表/详情/审核操作
 * 详情使用 FieldEntry 列表泛化承载三类认证内容差异，敏感字段（姓名/身份证）做脱敏处理
 */
@Service
@RequiredArgsConstructor
public class VerificationAdminServiceImpl implements VerificationAdminService {

    /** 时间格式化器 */
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final AppUserVerificationDao verificationDao;
    private final AppUserDao appUserDao;

    @Override
    public Page<VerificationVO> getRealNamePage(VerificationPageReq req) {
        return queryVerification(req,
                AppUserVerification::getRealNameStatus,
                AppUserVerification::getRealNameSubmitTime,
                AppUserVerification::getRealNameResultTime,
                AppUserVerification::getRealNameRejectReason);
    }

    @Override
    public Page<VerificationVO> getEducationPage(VerificationPageReq req) {
        return queryVerification(req,
                AppUserVerification::getEducationStatus,
                AppUserVerification::getEducationSubmitTime,
                AppUserVerification::getEducationResultTime,
                AppUserVerification::getEducationRejectReason);
    }

    @Override
    public Page<VerificationVO> getAvatarPage(VerificationPageReq req) {
        return queryVerification(req,
                AppUserVerification::getAvatarVerifyStatus,
                AppUserVerification::getAvatarVerifySubmitTime,
                AppUserVerification::getAvatarVerifyResultTime,
                AppUserVerification::getAvatarVerifyRejectReason);
    }

    /** 通用认证分页查询：status 筛选在 SQL 层用 LambdaQueryWrapper.eq 完成，解决分页不准问题 */
    private Page<VerificationVO> queryVerification(VerificationPageReq req,
            SFunction<AppUserVerification, String> statusGetter,
            SFunction<AppUserVerification, LocalDateTime> submitTimeGetter,
            SFunction<AppUserVerification, LocalDateTime> resultTimeGetter,
            SFunction<AppUserVerification, String> rejectReasonGetter) {
        LambdaQueryWrapper<AppUserVerification> wrapper = new LambdaQueryWrapper<>();
        // 关键字搜索：按昵称模糊匹配，先查 app_user 取 ID 列表
        if (StrUtil.isNotBlank(req.getKeyword())) {
            List<Long> userIds = appUserDao.selectList(new LambdaQueryWrapper<AppUser>()
                    .like(AppUser::getNickname, req.getKeyword()))
                    .stream().map(AppUser::getId).toList();
            wrapper.in(!userIds.isEmpty(), AppUserVerification::getUserId, userIds.isEmpty() ? null : userIds);
        }
        wrapper.eq(req.getUserId() != null, AppUserVerification::getUserId, req.getUserId())
               .eq(StrUtil.isNotBlank(req.getStatus()), statusGetter, req.getStatus())
               .isNotNull(submitTimeGetter)
               .orderByDesc(AppUserVerification::getUpdateTime);
        Page<AppUserVerification> page = verificationDao.selectPage(
                new Page<>(req.getPage(), req.getSize()), wrapper);

        // 批量查询用户信息
        List<AppUserVerification> records = page.getRecords();
        Map<Long, AppUser> userMap = records.isEmpty() ? Map.of() : appUserDao.selectList(
                new LambdaQueryWrapper<AppUser>().in(AppUser::getId,
                        records.stream().map(AppUserVerification::getUserId).toList()))
                .stream().collect(Collectors.toMap(AppUser::getId, u -> u, (a, b) -> a));

        List<VerificationVO> vos = new ArrayList<>();
        for (AppUserVerification v : records) {
            VerificationVO vo = new VerificationVO();
            vo.setId(v.getId());
            vo.setUserId(v.getUserId());
            AppUser user = userMap.get(v.getUserId());
            vo.setAvatar(user != null ? user.getAvatar() : null);
            vo.setNickname(user != null ? user.getNickname() : null);
            vo.setStatus(statusGetter.apply(v));
            LocalDateTime submitTime = submitTimeGetter.apply(v);
            vo.setSubmitTime(submitTime != null ? submitTime.format(FMT) : null);
            LocalDateTime resultTime = resultTimeGetter.apply(v);
            vo.setResultTime(resultTime != null ? resultTime.format(FMT) : null);
            vo.setRejectReason(rejectReasonGetter.apply(v));
            vos.add(vo);
        }
        Page<VerificationVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(vos);
        return result;
    }

    @Override
    public VerificationAuditDetailVO getRealNameDetail(Long id) {
        // 1. 获取认证记录与用户信息
        AppUserVerification v = requireVerification(id);
        AppUser user = appUserDao.selectById(v.getUserId());
        // 2. 组装详情（姓名/身份证号做脱敏处理）
        VerificationAuditDetailVO vo = baseDetail(v, user);
        vo.setFields(java.util.List.of(
                new com.spacetime.admin.dto.response.FieldEntry("真实姓名", maskRealName(v.getRealName())),
                new com.spacetime.admin.dto.response.FieldEntry("身份证号", maskIdCard(v.getIdCard())),
                new com.spacetime.admin.dto.response.FieldEntry("人脸核身状态", v.getRealNameStatus())
        ));
        vo.setSubmitTime(v.getRealNameSubmitTime() != null ? v.getRealNameSubmitTime().format(FMT) : null);
        vo.setResultTime(v.getRealNameResultTime() != null ? v.getRealNameResultTime().format(FMT) : null);
        vo.setRejectReason(v.getRealNameRejectReason());
        vo.setStatus(v.getRealNameStatus());
        return vo;
    }

    @Override
    public VerificationAuditDetailVO getEducationDetail(Long id) {
        AppUserVerification v = requireVerification(id);
        AppUser user = appUserDao.selectById(v.getUserId());
        VerificationAuditDetailVO vo = baseDetail(v, user);
        // 动态构建FieldEntry列表（驳回时有额外字段）
        java.util.List<com.spacetime.admin.dto.response.FieldEntry> fields = new java.util.ArrayList<>();
        fields.add(new com.spacetime.admin.dto.response.FieldEntry("学校", user != null ? user.getSchool() : null));
        fields.add(new com.spacetime.admin.dto.response.FieldEntry("认证方式", v.getEducationMethod()));
        if (StrUtil.isNotBlank(v.getEducationRejectReason())) {
            fields.add(new com.spacetime.admin.dto.response.FieldEntry("驳回原因", v.getEducationRejectReason()));
        }
        vo.setFields(fields);
        vo.setSubmitTime(v.getEducationSubmitTime() != null ? v.getEducationSubmitTime().format(FMT) : null);
        vo.setResultTime(v.getEducationResultTime() != null ? v.getEducationResultTime().format(FMT) : null);
        vo.setRejectReason(v.getEducationRejectReason());
        vo.setStatus(v.getEducationStatus());
        return vo;
    }

    @Override
    public VerificationAuditDetailVO getAvatarDetail(Long id) {
        AppUserVerification v = requireVerification(id);
        AppUser user = appUserDao.selectById(v.getUserId());
        VerificationAuditDetailVO vo = baseDetail(v, user);
        vo.setFields(java.util.List.of(
                new com.spacetime.admin.dto.response.FieldEntry("当前主头像", user != null ? user.getAvatar() : null),
                new com.spacetime.admin.dto.response.FieldEntry("认证状态", v.getAvatarVerifyStatus())
        ));
        vo.setSubmitTime(v.getAvatarVerifySubmitTime() != null ? v.getAvatarVerifySubmitTime().format(FMT) : null);
        vo.setResultTime(v.getAvatarVerifyResultTime() != null ? v.getAvatarVerifyResultTime().format(FMT) : null);
        vo.setRejectReason(v.getAvatarVerifyRejectReason());
        vo.setStatus(v.getAvatarVerifyStatus());
        return vo;
    }

    /** 姓名脱敏：保留首字，其余替换为* */
    private String maskRealName(String name) {
        if (StrUtil.isBlank(name) || name.length() <= 1) return name;
        StringBuilder sb = new StringBuilder(name);
        for (int i = 1; i < name.length(); i++) sb.setCharAt(i, '*');
        return sb.toString();
    }

    /** 身份证号脱敏：前4位 + 10个* + 后4位 */
    private String maskIdCard(String idCard) {
        if (StrUtil.isBlank(idCard) || idCard.length() < 8) return idCard;
        return idCard.substring(0, 4) + "**********" + idCard.substring(idCard.length() - 4);
    }

    /** 构建详情基座（用户基本信息 + 认证等级） */
    private VerificationAuditDetailVO baseDetail(AppUserVerification v, AppUser user) {
        VerificationAuditDetailVO vo = new VerificationAuditDetailVO();
        vo.setId(v.getId());
        vo.setUserId(v.getUserId());
        vo.setNickname(user != null ? user.getNickname() : null);
        vo.setAvatar(user != null ? user.getAvatar() : null);
        vo.setVerifyLevel(v.getVerifyLevel());
        return vo;
    }

    @Override
    @Transactional
    public void auditRealName(Long id, ModerationAuditReq req) {
        validateAuditReq(req);
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

    @Override
    @Transactional
    public void auditEducation(Long id, ModerationAuditReq req) {
        validateAuditReq(req);
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

    @Override
    @Transactional
    public void auditAvatar(Long id, ModerationAuditReq req) {
        validateAuditReq(req);
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

    /** 校验审核请求的合法性（action 必须为 APPROVE/REJECT，驳回必须有原因） */
    private void validateAuditReq(ModerationAuditReq req) {
        if (!"APPROVE".equals(req.getAction()) && !"REJECT".equals(req.getAction())) {
            throw new BusinessException("不支持的审核动作");
        }
        if ("REJECT".equals(req.getAction()) && !req.isRejectReasonValid()) {
            throw new BusinessException("驳回时必须填写驳回原因");
        }
    }

    /** 执行审核前预处理（校验已在 validateAuditReq 中完成，预留扩展点） */
    private void applyAudit(AppUserVerification verification, ModerationAuditReq req) {
        // validation already done in validateAuditReq
    }

    /** 重新计算认证等级：每通过一类认证 +1，最高3级 */
    private int recalcVerifyLevel(AppUserVerification verification) {
        int level = 0;
        if (VerificationStatusEnum.APPROVED.getCode().equals(verification.getRealNameStatus())) level++;
        if (VerificationStatusEnum.APPROVED.getCode().equals(verification.getEducationStatus())) level++;
        if (VerificationStatusEnum.APPROVED.getCode().equals(verification.getAvatarVerifyStatus())) level++;
        return level;
    }

    /** 获取认证记录，不存在则抛业务异常 */
    private AppUserVerification requireVerification(Long id) {
        AppUserVerification v = verificationDao.selectById(id);
        if (v == null) throw new BusinessException("认证记录不存在");
        return v;
    }
}
