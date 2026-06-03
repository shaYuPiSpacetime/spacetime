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

/**
 * 管理后台 — 小程序用户管理服务实现
 * 支持按关键词/学校/性别/状态/认证状态多条件筛选分页
 */
@Service
@RequiredArgsConstructor
public class AppUserAdminServiceImpl implements AppUserAdminService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final AppUserDao appUserDao;
    private final AppUserVerificationDao verificationDao;

    /**
     * 用户分页查询
     * 基础筛选直接在 SQL 完成，认证状态筛选在后置过滤（因认证在独立表）
     * @param req 筛选条件（关键词/昵称/学校/性别/状态/认证状态）
     * @return 分页结果
     */
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
                .orderByDesc(AppUser::getCreateTime);
        Page<AppUser> page = appUserDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);

        // 如果按认证状态筛选，后置过滤（认证在独立 verification 表）
        if (StrUtil.isNotBlank(req.getRealNameStatus()) || StrUtil.isNotBlank(req.getEducationStatus())
                || StrUtil.isNotBlank(req.getAvatarVerifyStatus())) {
            page.setRecords(page.getRecords().stream()
                    .filter(user -> matchVerification(user.getId(),
                            req.getRealNameStatus(), req.getEducationStatus(), req.getAvatarVerifyStatus()))
                    .toList());
        }

        Page<AppUserListVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(this::toListVO).toList());
        return result;
    }

    /** 校验用户的认证状态是否匹配筛选条件 */
    private boolean matchVerification(Long userId, String realNameStatus, String educationStatus, String avatarVerifyStatus) {
        AppUserVerification v = verificationDao.selectOne(
                new LambdaQueryWrapper<AppUserVerification>().eq(AppUserVerification::getUserId, userId));
        if (v == null) return false;
        if (StrUtil.isNotBlank(realNameStatus) && !realNameStatus.equals(v.getRealNameStatus())) return false;
        if (StrUtil.isNotBlank(educationStatus) && !educationStatus.equals(v.getEducationStatus())) return false;
        if (StrUtil.isNotBlank(avatarVerifyStatus) && !avatarVerifyStatus.equals(v.getAvatarVerifyStatus())) return false;
        return true;
    }

    /**
     * 用户详情查询（含认证信息）
     * @param id 用户ID
     * @return 用户完整资料 + 认证详情
     */
    @Override
    public AppUserDetailVO getUserDetail(Long id) {
        AppUser user = appUserDao.selectById(id);
        if (user == null) throw new BusinessException("用户不存在");
        AppUserVerification verification = verificationDao.selectOne(
                new LambdaQueryWrapper<AppUserVerification>().eq(AppUserVerification::getUserId, id));
        return toDetailVO(user, verification);
    }

    /**
     * 变更用户账号状态（冻结/解冻等）
     * @param id 用户ID
     * @param status 目标状态
     */
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

    /** 将实体转换为列表 VO，关联查询认证状态 */
    private AppUserListVO toListVO(AppUser user) {
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
        // 关联查询认证状态
        AppUserVerification v = verificationDao.selectOne(
                new LambdaQueryWrapper<AppUserVerification>().eq(AppUserVerification::getUserId, user.getId()));
        if (v != null) {
            vo.setRealNameStatus(v.getRealNameStatus());
            vo.setEducationStatus(v.getEducationStatus());
            vo.setAvatarVerifyStatus(v.getAvatarVerifyStatus());
        }
        return vo;
    }

    /** 将实体转换为详情 VO，含完整认证信息 */
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
        // 认证信息
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
