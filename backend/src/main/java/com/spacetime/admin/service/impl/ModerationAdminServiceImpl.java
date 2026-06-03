package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.support.SFunction;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.ModerationAuditReq;
import com.spacetime.admin.dto.request.VerificationPageReq;
import com.spacetime.admin.dto.response.ModerationDetailVO;
import com.spacetime.admin.dto.response.ModerationVO;
import com.spacetime.admin.service.ModerationAdminService;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserVerificationDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserVerification;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 管理后台 — 内容审核服务实现
 * 含照片审核与文字审核的分页列表/详情/审核操作，使用 FieldEntry 泛化承载审核内容差异
 */
@Service
@RequiredArgsConstructor
public class ModerationAdminServiceImpl implements ModerationAdminService {

    /** 时间格式化器 */
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final AppUserVerificationDao verificationDao;
    private final AppUserDao appUserDao;

    @Override
    public Page<ModerationVO> getPhotoPage(VerificationPageReq req) {
        LambdaQueryWrapper<AppUserVerification> wrapper = buildModerationWrapper(req,
                AppUserVerification::getProfilePhotoAuditStatus,
                AppUserVerification::getProfilePhotoSubmitTime);
        Page<AppUserVerification> page = verificationDao.selectPage(
                new Page<>(req.getPage(), req.getSize()), wrapper);
        return toModerationPage(page, true);
    }

    @Override
    public Page<ModerationVO> getTextPage(VerificationPageReq req) {
        LambdaQueryWrapper<AppUserVerification> wrapper = buildModerationWrapper(req,
                AppUserVerification::getOpenTextAuditStatus,
                AppUserVerification::getOpenTextSubmitTime);
        Page<AppUserVerification> page = verificationDao.selectPage(
                new Page<>(req.getPage(), req.getSize()), wrapper);
        return toModerationPage(page, false);
    }

    private LambdaQueryWrapper<AppUserVerification> buildModerationWrapper(VerificationPageReq req,
            SFunction<AppUserVerification, String> statusGetter,
            SFunction<AppUserVerification, LocalDateTime> submitTimeGetter) {
        LambdaQueryWrapper<AppUserVerification> wrapper = new LambdaQueryWrapper<>();
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
        return wrapper;
    }

    private Page<ModerationVO> toModerationPage(Page<AppUserVerification> page, boolean isPhoto) {
        List<AppUserVerification> verificationList = page.getRecords();
        Map<Long, AppUser> userMap = verificationList.isEmpty() ? Map.of() : appUserDao.selectList(new LambdaQueryWrapper<AppUser>()
                .in(AppUser::getId, verificationList.stream().map(AppUserVerification::getUserId).toList()))
                .stream().collect(Collectors.toMap(AppUser::getId, u -> u, (a, b) -> a));

        List<ModerationVO> records = new ArrayList<>();
        for (AppUserVerification v : page.getRecords()) {
            ModerationVO vo = new ModerationVO();
            vo.setId(v.getId());
            vo.setUserId(v.getUserId());
            AppUser user = userMap.get(v.getUserId());
            vo.setAvatar(user != null ? user.getAvatar() : null);
            vo.setNickname(user != null ? user.getNickname() : null);
            if (isPhoto) {
                vo.setContentType("照片");
                vo.setContentPreview(user != null && StrUtil.isNotBlank(user.getPhotos()) ? user.getPhotos() : null);
                vo.setStatus(v.getProfilePhotoAuditStatus());
                vo.setRejectReason(v.getProfilePhotoRejectReason());
                vo.setSubmitTime(v.getProfilePhotoSubmitTime() != null ? v.getProfilePhotoSubmitTime().format(FMT) : null);
            } else {
                vo.setContentType("文字");
                String aboutMe = user != null ? user.getAboutMe() : null;
                vo.setContentPreview(StrUtil.isNotBlank(aboutMe)
                        ? StrUtil.maxLength(aboutMe, 50) : null);
                vo.setStatus(v.getOpenTextAuditStatus());
                vo.setRejectReason(v.getOpenTextRejectReason());
                vo.setSubmitTime(v.getOpenTextSubmitTime() != null ? v.getOpenTextSubmitTime().format(FMT) : null);
            }
            records.add(vo);
        }
        Page<ModerationVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(records);
        return result;
    }

    @Override
    public ModerationDetailVO getPhotoDetail(Long id) {
        AppUserVerification v = requireVerification(id);
        AppUser user = appUserDao.selectById(v.getUserId());
        ModerationDetailVO vo = new ModerationDetailVO();
        vo.setId(v.getId());
        vo.setUserId(v.getUserId());
        vo.setNickname(user != null ? user.getNickname() : null);
        vo.setAvatar(user != null ? user.getAvatar() : null);
        vo.setContentType("照片");
        vo.setContentFull(user != null ? user.getPhotos() : null);
        vo.setSubmitTime(v.getProfilePhotoSubmitTime() != null ? v.getProfilePhotoSubmitTime().format(FMT) : null);
        vo.setStatus(v.getProfilePhotoAuditStatus());
        vo.setRejectReason(v.getProfilePhotoRejectReason());
        return vo;
    }

    @Override
    public ModerationDetailVO getTextDetail(Long id) {
        AppUserVerification v = requireVerification(id);
        AppUser user = appUserDao.selectById(v.getUserId());
        ModerationDetailVO vo = new ModerationDetailVO();
        vo.setId(v.getId());
        vo.setUserId(v.getUserId());
        vo.setNickname(user != null ? user.getNickname() : null);
        vo.setAvatar(user != null ? user.getAvatar() : null);
        vo.setContentType("文字");
        vo.setContentField(user != null
                ? (StrUtil.isNotBlank(user.getAboutMe()) ? "关于我" : StrUtil.isNotBlank(user.getHopeTheyKnow()) ? "希望TA了解" : "其他")
                : null);
        vo.setContentFull(user != null && StrUtil.isNotBlank(user.getAboutMe())
                ? user.getAboutMe()
                : user != null ? user.getHopeTheyKnow() : null);
        vo.setSubmitTime(v.getOpenTextSubmitTime() != null ? v.getOpenTextSubmitTime().format(FMT) : null);
        vo.setStatus(v.getOpenTextAuditStatus());
        vo.setRejectReason(v.getOpenTextRejectReason());
        return vo;
    }

    @Override
    @Transactional
    public void auditPhoto(Long id, ModerationAuditReq req) {
        validateAuditReq(req);
        AppUserVerification v = verificationDao.selectById(id);
        if (v == null) throw new BusinessException("审核记录不存在");
        v.setProfilePhotoAuditStatus("APPROVE".equals(req.getAction()) ? "APPROVED" : "REJECTED");
        v.setProfilePhotoRejectReason("REJECT".equals(req.getAction()) ? req.getRejectReason() : null);
        verificationDao.updateById(v);
    }

    @Override
    @Transactional
    public void auditText(Long id, ModerationAuditReq req) {
        validateAuditReq(req);
        AppUserVerification v = verificationDao.selectById(id);
        if (v == null) throw new BusinessException("审核记录不存在");
        v.setOpenTextAuditStatus("APPROVE".equals(req.getAction()) ? "APPROVED" : "REJECTED");
        v.setOpenTextRejectReason("REJECT".equals(req.getAction()) ? req.getRejectReason() : null);
        verificationDao.updateById(v);
    }

    private void validateAuditReq(ModerationAuditReq req) {
        if (!"APPROVE".equals(req.getAction()) && !"REJECT".equals(req.getAction())) {
            throw new BusinessException("不支持的审核动作");
        }
        if ("REJECT".equals(req.getAction()) && !req.isRejectReasonValid()) {
            throw new BusinessException("驳回时必须填写驳回原因");
        }
    }

    private AppUserVerification requireVerification(Long id) {
        AppUserVerification v = verificationDao.selectById(id);
        if (v == null) throw new BusinessException("审核记录不存在");
        return v;
    }
}
