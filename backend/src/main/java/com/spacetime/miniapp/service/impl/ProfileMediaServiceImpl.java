package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserProfileMediaDao;
import com.spacetime.common.dao.AppUserVerificationDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserProfileMedia;
import com.spacetime.common.entity.AppUserVerification;
import com.spacetime.common.enums.AuditSourceEnum;
import com.spacetime.common.enums.ModerationStatusEnum;
import com.spacetime.common.enums.VerificationStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.request.ProfileMediaSubmitReq;
import com.spacetime.miniapp.dto.response.ProfileMediaVO;
import com.spacetime.miniapp.service.ProfileMediaService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

/**
 * 移动端资料媒体服务实现。
 *
 * 统一承接头像、相册、背景图和学历材料上传后的入库状态；
 * 媒体上传本身不代表审核通过，后续由认证或审核链路决定是否成为当前有效内容。
 */
@Service
@RequiredArgsConstructor
public class ProfileMediaServiceImpl implements ProfileMediaService {

    private static final Set<String> ALLOWED_TYPES = Set.of("AVATAR", "ALBUM", "PROFILE_BG", "EDUCATION_CERT");

    private final AppUserDao appUserDao;
    private final AppUserVerificationDao verificationDao;
    private final AppUserProfileMediaDao profileMediaDao;

    /** 保存媒体记录，并按媒体类型同步对应认证/审核状态为待审核。 */
    @Override
    @Transactional
    public ProfileMediaVO submitMedia(Long userId, ProfileMediaSubmitReq req) {
        AppUser user = requireUser(userId);
        validate(req);
        AppUserProfileMedia media = new AppUserProfileMedia();
        media.setUserId(userId);
        media.setMediaType(req.getMediaType());
        media.setMediaUrl(req.getMediaUrl());
        media.setThumbUrl(req.getThumbUrl());
        media.setSortOrder(req.getSortOrder() == null ? 0 : req.getSortOrder());
        media.setAuditStatus(ModerationStatusEnum.PENDING.getCode());
        media.setAuditSource(AuditSourceEnum.MACHINE.getCode());
        media.setCurrentEffective(false);
        profileMediaDao.insert(media);

        AppUserVerification verification = requireVerification(userId);
        if ("AVATAR".equals(req.getMediaType())) {
            // 头像上传后先同步头像地址，展示是否可用由头像认证状态控制。
            user.setAvatar(req.getMediaUrl());
            appUserDao.updateById(user);
            verification.setAvatarVerifyStatus(VerificationStatusEnum.PENDING.getCode());
            verification.setAvatarAuditSource(AuditSourceEnum.MACHINE.getCode());
        } else {
            // 非头像资料图统一进入资料图片审核，不直接成为公开有效内容。
            verification.setProfilePhotoAuditStatus(ModerationStatusEnum.PENDING.getCode());
            verification.setProfilePhotoAuditSource(AuditSourceEnum.MACHINE.getCode());
        }
        verificationDao.updateById(verification);
        return toVo(media);
    }

    /** 删除当前用户自己的媒体记录，采用逻辑删除以保留审核追溯信息。 */
    @Override
    @Transactional
    public void deleteMedia(Long userId, Long mediaId) {
        AppUserProfileMedia media = profileMediaDao.selectById(mediaId);
        if (media == null || !userId.equals(media.getUserId())) {
            throw new BusinessException("资料媒体不存在");
        }
        media.setCurrentEffective(false);
        media.setDeleted(1);
        profileMediaDao.updateById(media);
    }

    /** 查询用户，不存在时阻断媒体提交。 */
    private AppUser requireUser(Long userId) {
        AppUser user = appUserDao.selectById(userId);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        return user;
    }

    /** 查询认证记录，媒体审核状态需要写回该记录。 */
    private AppUserVerification requireVerification(Long userId) {
        AppUserVerification verification = verificationDao.selectOne(
                new LambdaQueryWrapper<AppUserVerification>().eq(AppUserVerification::getUserId, userId));
        if (verification == null) {
            throw new BusinessException("用户认证记录不存在");
        }
        return verification;
    }

    /** 校验媒体类型和 URL，类型清单与移动端对接文档保持一致。 */
    private void validate(ProfileMediaSubmitReq req) {
        if (req == null || !ALLOWED_TYPES.contains(req.getMediaType())) {
            throw new BusinessException("不支持的媒体类型");
        }
        if (StrUtil.isBlank(req.getMediaUrl())) {
            throw new BusinessException("媒体 URL 不能为空");
        }
    }

    /** 转换为移动端提交响应。 */
    private ProfileMediaVO toVo(AppUserProfileMedia media) {
        ProfileMediaVO vo = new ProfileMediaVO();
        vo.setMediaId(media.getId());
        vo.setMediaType(media.getMediaType());
        vo.setMediaUrl(media.getMediaUrl());
        vo.setThumbUrl(media.getThumbUrl());
        vo.setSortOrder(media.getSortOrder());
        vo.setAuditStatus(media.getAuditStatus());
        vo.setAuditSource(media.getAuditSource());
        vo.setRejectReason(media.getRejectReason());
        vo.setCurrentEffective(media.getCurrentEffective());
        return vo;
    }
}
