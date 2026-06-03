package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.ModerationAuditReq;
import com.spacetime.admin.dto.request.VerificationPageReq;
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

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 管理后台 — 资料内容审核服务实现
 * 覆盖照片审核与开放性文字审核的列表查询与审核操作
 */
@Service
@RequiredArgsConstructor
public class ModerationAdminServiceImpl implements ModerationAdminService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final AppUserVerificationDao verificationDao;
    private final AppUserDao appUserDao;

    /**
     * 照片审核分页列表
     * @param req 筛选条件（用户ID/状态）
     * @return 分页数据（含用户头像、昵称、照片预览）
     */
    @Override
    public Page<ModerationVO> getPhotoPage(VerificationPageReq req) {
        LambdaQueryWrapper<AppUserVerification> wrapper = new LambdaQueryWrapper<AppUserVerification>()
                .eq(req.getUserId() != null, AppUserVerification::getUserId, req.getUserId())
                .eq(StrUtil.isNotBlank(req.getStatus()), AppUserVerification::getProfilePhotoAuditStatus, req.getStatus())
                .isNotNull(AppUserVerification::getProfilePhotoSubmitTime)
                .orderByDesc(AppUserVerification::getProfilePhotoSubmitTime);
        Page<AppUserVerification> page = verificationDao.selectPage(
                new Page<>(req.getPage(), req.getSize()), wrapper);
        return toModerationPage(page, true);
    }

    /**
     * 文字审核分页列表
     * @param req 筛选条件（用户ID/状态）
     * @return 分页数据（含用户头像、昵称、文字预览）
     */
    @Override
    public Page<ModerationVO> getTextPage(VerificationPageReq req) {
        LambdaQueryWrapper<AppUserVerification> wrapper = new LambdaQueryWrapper<AppUserVerification>()
                .eq(req.getUserId() != null, AppUserVerification::getUserId, req.getUserId())
                .eq(StrUtil.isNotBlank(req.getStatus()), AppUserVerification::getOpenTextAuditStatus, req.getStatus())
                .isNotNull(AppUserVerification::getOpenTextSubmitTime)
                .orderByDesc(AppUserVerification::getOpenTextSubmitTime);
        Page<AppUserVerification> page = verificationDao.selectPage(
                new Page<>(req.getPage(), req.getSize()), wrapper);
        return toModerationPage(page, false);
    }

    /** 将认证记录分页转为审核 VO 分页，关联查询用户头像和昵称 */
    private Page<ModerationVO> toModerationPage(Page<AppUserVerification> page, boolean isPhoto) {
        List<AppUserVerification> verificationList = page.getRecords();
        // 空列表时避免 SQL IN () 语法错误
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

    /**
     * 照片审核（通过/驳回）
     * @param id 审核记录ID
     * @param req 审核动作与驳回原因
     */
    @Override
    @Transactional
    public void auditPhoto(Long id, ModerationAuditReq req) {
        if (!"APPROVE".equals(req.getAction()) && !"REJECT".equals(req.getAction())) {
            throw new BusinessException("不支持的审核动作");
        }
        AppUserVerification v = verificationDao.selectById(id);
        if (v == null) throw new BusinessException("审核记录不存在");
        v.setProfilePhotoAuditStatus("APPROVE".equals(req.getAction()) ? "APPROVED" : "REJECTED");
        v.setProfilePhotoRejectReason("REJECT".equals(req.getAction()) ? req.getRejectReason() : null);
        verificationDao.updateById(v);
    }

    /**
     * 文字审核（通过/驳回）
     * @param id 审核记录ID
     * @param req 审核动作与驳回原因
     */
    @Override
    @Transactional
    public void auditText(Long id, ModerationAuditReq req) {
        if (!"APPROVE".equals(req.getAction()) && !"REJECT".equals(req.getAction())) {
            throw new BusinessException("不支持的审核动作");
        }
        AppUserVerification v = verificationDao.selectById(id);
        if (v == null) throw new BusinessException("审核记录不存在");
        v.setOpenTextAuditStatus("APPROVE".equals(req.getAction()) ? "APPROVED" : "REJECTED");
        v.setOpenTextRejectReason("REJECT".equals(req.getAction()) ? req.getRejectReason() : null);
        verificationDao.updateById(v);
    }
}
