package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.AppUserPageReq;
import com.spacetime.admin.dto.response.AppUserDetailVO;
import com.spacetime.admin.dto.response.AppUserListVO;
import com.spacetime.admin.dto.response.VerificationDetailVO;
import com.spacetime.admin.service.AppUserAdminService;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserVerificationDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserVerification;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 管理后台 — 小程序用户管理服务实现
 * 含用户分页查询（多条件筛选 + EXISTS子查询）、用户详情、账号状态变更
 * 认证状态筛选使用 EXISTS 子查询在 SQL 层完成，保证分页准确
 */
@Service
@RequiredArgsConstructor
public class AppUserAdminServiceImpl implements AppUserAdminService {

    /** 时间格式化器 */
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final AppUserDao appUserDao;
    private final AppUserVerificationDao verificationDao;

    @Override
    public Page<AppUserListVO> getUserPage(AppUserPageReq req) {
        LambdaQueryWrapper<AppUser> wrapper = new LambdaQueryWrapper<AppUser>()
                .and(StrUtil.isNotBlank(req.getKeyword()), w -> w
                        .like(AppUser::getNickname, req.getKeyword())
                        .or().like(AppUser::getSchool, req.getKeyword()))
                .like(StrUtil.isNotBlank(req.getNickname()), AppUser::getNickname, req.getNickname())
                .like(StrUtil.isNotBlank(req.getSchool()), AppUser::getSchool, req.getSchool())
                .eq(StrUtil.isNotBlank(req.getAccountStatus()), AppUser::getAccountStatus, req.getAccountStatus())
                .eq(StrUtil.isNotBlank(req.getGender()), AppUser::getGender, req.getGender())
                .eq(req.getFirstLoginCompleted() != null, AppUser::getFirstLoginCompleted, req.getFirstLoginCompleted())
                .eq(req.getUserId() != null, AppUser::getId, req.getUserId())
                .ge(StrUtil.isNotBlank(req.getRegisterTimeStart()), AppUser::getRegisterTime, req.getRegisterTimeStart() + " 00:00:00")
                .le(StrUtil.isNotBlank(req.getRegisterTimeEnd()), AppUser::getRegisterTime, req.getRegisterTimeEnd() + " 23:59:59")
                .orderByDesc(AppUser::getCreateTime);

        // 认证状态筛选：用 EXISTS 子查询在 SQL 层完成，保证分页准确
        if (StrUtil.isNotBlank(req.getRealNameStatus())) {
            wrapper.exists("SELECT 1 FROM app_user_verification v WHERE v.user_id = app_user.id AND v.real_name_status = '" + req.getRealNameStatus() + "'");
        }
        if (StrUtil.isNotBlank(req.getEducationStatus())) {
            wrapper.exists("SELECT 1 FROM app_user_verification v WHERE v.user_id = app_user.id AND v.education_status = '" + req.getEducationStatus() + "'");
        }
        if (StrUtil.isNotBlank(req.getAvatarVerifyStatus())) {
            wrapper.exists("SELECT 1 FROM app_user_verification v WHERE v.user_id = app_user.id AND v.avatar_verify_status = '" + req.getAvatarVerifyStatus() + "'");
        }

        Page<AppUser> page = appUserDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);

        // 批量加载所有用户的认证状态（避免 N+1）
        List<Long> userIds = page.getRecords().stream().map(AppUser::getId).toList();
        Map<Long, AppUserVerification> verifyMap = userIds.isEmpty() ? Map.of() : verificationDao.selectList(
                new LambdaQueryWrapper<AppUserVerification>().in(AppUserVerification::getUserId, userIds))
                .stream().collect(Collectors.toMap(AppUserVerification::getUserId, v -> v, (a, b) -> a));

        Page<AppUserListVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream()
                .map(user -> toListVO(user, verifyMap.get(user.getId())))
                .toList());
        return result;
    }

    @Override
    public AppUserDetailVO getUserDetail(Long id) {
        AppUser user = appUserDao.selectById(id);
        if (user == null) throw new BusinessException("用户不存在");
        AppUserVerification verification = verificationDao.selectOne(
                new LambdaQueryWrapper<AppUserVerification>().eq(AppUserVerification::getUserId, id));
        return toDetailVO(user, verification);
    }

    @Override
    @Transactional
    public void updateUserStatus(Long id, String status) {
        if (AccountStatusEnum.getByCode(status) == null) {
            throw new BusinessException("不支持的用户状态");
        }
        AppUser user = appUserDao.selectById(id);
        if (user == null) throw new BusinessException("用户不存在");
        user.setAccountStatus(status);
        appUserDao.updateById(user);
    }

    private AppUserListVO toListVO(AppUser user, AppUserVerification v) {
        AppUserListVO vo = new AppUserListVO();
        vo.setId(user.getId());
        vo.setAvatar(user.getAvatar());
        vo.setNickname(user.getNickname());
        vo.setGender(user.getGender());
        vo.setAge(user.getAge());
        vo.setSchool(user.getSchool());
        vo.setFirstLoginCompleted(user.getFirstLoginCompleted());
        vo.setProfileScore(user.getProfileScore());
        vo.setAccountStatus(user.getAccountStatus());
        vo.setRegisterTime(user.getRegisterTime() != null ? user.getRegisterTime().format(FMT) : null);
        vo.setLastLoginTime(user.getLastLoginTime() != null ? user.getLastLoginTime().format(FMT) : null);
        if (v != null) {
            vo.setRealNameStatus(v.getRealNameStatus());
            vo.setEducationStatus(v.getEducationStatus());
            vo.setAvatarVerifyStatus(v.getAvatarVerifyStatus());
        }
        vo.setAccessStatus(computeAccessStatusLabel(user, v));
        return vo;
    }

    /** 计算准入状态标签：账号异常→blocked，未完成首登→blocked，未实名→browse_only，实名通过→full_access */
    private String computeAccessStatusLabel(AppUser user, AppUserVerification v) {
        if (!"NORMAL".equals(user.getAccountStatus())) return "blocked";
        if (user.getFirstLoginCompleted() == null || user.getFirstLoginCompleted() == 0) return "blocked";
        boolean realNamePassed = v != null && "APPROVED".equals(v.getRealNameStatus());
        return realNamePassed ? "full_access" : "browse_only";
    }

    private AppUserDetailVO toDetailVO(AppUser user, AppUserVerification v) {
        AppUserDetailVO vo = new AppUserDetailVO();
        vo.setId(user.getId());
        vo.setNickname(user.getNickname());
        vo.setAvatar(user.getAvatar());
        vo.setGender(user.getGender());
        vo.setBirthday(user.getBirthday() != null ? user.getBirthday().toString() : null);
        vo.setAge(user.getAge());
        vo.setHeight(user.getHeight());
        vo.setLocationProvince(user.getLocationProvince());
        vo.setLocationCity(user.getLocationCity());
        vo.setHometownProvince(user.getHometownProvince());
        vo.setHometownCity(user.getHometownCity());
        vo.setSchool(user.getSchool());
        vo.setMajor(user.getMajor());
        vo.setEducationLevel(user.getEducationLevel());
        vo.setEmotionalStatus(user.getEmotionalStatus());
        vo.setDatingGoal(user.getDatingGoal());
        vo.setMaritalStatus(user.getMaritalStatus());
        vo.setAboutMe(user.getAboutMe());
        vo.setHopeTheyKnow(user.getHopeTheyKnow());
        vo.setTags(user.getTags());
        vo.setPhotos(user.getPhotos());
        vo.setVoiceIntroUrl(user.getVoiceIntroUrl());
        vo.setVoiceIntroDuration(user.getVoiceIntroDuration());
        vo.setMbtiType(user.getMbtiType());
        vo.setZodiac(user.getZodiac());
        vo.setProfileScore(user.getProfileScore());
        vo.setFirstLoginCompleted(user.getFirstLoginCompleted());
        vo.setRegisterTime(user.getRegisterTime() != null ? user.getRegisterTime().format(FMT) : null);
        vo.setLastLoginTime(user.getLastLoginTime() != null ? user.getLastLoginTime().format(FMT) : null);
        vo.setAccountStatus(user.getAccountStatus());
        // 准入信息
        boolean firstLoginDone = user.getFirstLoginCompleted() != null && user.getFirstLoginCompleted() == 1;
        boolean accountNormal = "NORMAL".equals(user.getAccountStatus());
        boolean realNamePassed = v != null && "APPROVED".equals(v.getRealNameStatus());
        if (!accountNormal || !firstLoginDone) {
            vo.setCanBrowseCards(false); vo.setCanMatch(false); vo.setCanBeExposed(false);
            vo.setBlockReason(!accountNormal ? "账号状态异常" : "请先完成资料初始化");
        } else {
            vo.setCanBrowseCards(true);
            vo.setCanMatch(realNamePassed);
            vo.setCanBeExposed(realNamePassed);
            vo.setBlockReason(realNamePassed ? null : "完成实名认证后，才可曝光和匹配");
        }
        vo.setViolationCount(0);
        vo.setFeedbackCount(0);
        if (v != null) {
            VerificationDetailVO vd = new VerificationDetailVO();
            vd.setRealNameStatus(v.getRealNameStatus());
            vd.setRealNameRejectReason(v.getRealNameRejectReason());
            vd.setRealNameSubmitTime(v.getRealNameSubmitTime() != null ? v.getRealNameSubmitTime().format(FMT) : null);
            vd.setEducationStatus(v.getEducationStatus());
            vd.setEducationMethod(v.getEducationMethod());
            vd.setEducationRejectReason(v.getEducationRejectReason());
            vd.setEducationSubmitTime(v.getEducationSubmitTime() != null ? v.getEducationSubmitTime().format(FMT) : null);
            vd.setAvatarVerifyStatus(v.getAvatarVerifyStatus());
            vd.setAvatarVerifyRejectReason(v.getAvatarVerifyRejectReason());
            vd.setAvatarVerifySubmitTime(v.getAvatarVerifySubmitTime() != null ? v.getAvatarVerifySubmitTime().format(FMT) : null);
            vd.setProfilePhotoAuditStatus(v.getProfilePhotoAuditStatus());
            vd.setProfilePhotoRejectReason(v.getProfilePhotoRejectReason());
            vd.setOpenTextAuditStatus(v.getOpenTextAuditStatus());
            vd.setOpenTextRejectReason(v.getOpenTextRejectReason());
            vd.setVerifyLevel(v.getVerifyLevel());
            vo.setVerification(vd);
        }
        return vo;
    }
}
