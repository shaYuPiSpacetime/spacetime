package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserAuditRecordDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.enums.AppUserAuditStatusEnum;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.enums.AuditSourceEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.AppUserAuditService;
import com.spacetime.miniapp.dto.request.ProfileMediaSubmitReq;
import com.spacetime.miniapp.dto.response.ProfileMediaVO;
import com.spacetime.miniapp.service.ProfileMediaService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

/**
 * 移动端资料媒体服务实现。
 * 媒体上传后统一生成 app_user_audit_record，不再写入资料媒体分表。
 */
@Service
@RequiredArgsConstructor
public class ProfileMediaServiceImpl implements ProfileMediaService {

    private static final Set<String> ALLOWED_TYPES = Set.of("AVATAR", "ALBUM", "PROFILE_BG", "EDUCATION_CERT");

    private final AppUserDao appUserDao;
    private final AppUserAuditRecordDao auditRecordDao;
    private final AppUserAuditService auditService;

    /** 保存媒体审核记录；审核通过前不对外生效。 */
    @Override
    @Transactional
    public ProfileMediaVO submitMedia(Long userId, ProfileMediaSubmitReq req) {
        AppUser user = requireUser(userId);
        validate(req);
        AppUserAuditTypeEnum auditType = toAuditType(req.getMediaType());
        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setUserId(userId);
        record.setAuditType(auditType.getCode());
        record.setAuditSource(AuditSourceEnum.MACHINE.getCode());
        record.setStatus(AppUserAuditStatusEnum.PENDING.getCode());
        record.setMediaUrl(req.getMediaUrl());
        record.setThumbUrl(req.getThumbUrl());
        record.setMaterialJson("{\"mediaType\":\"" + json(req.getMediaType()) + "\",\"sortOrder\":"
                + (req.getSortOrder() == null ? 0 : req.getSortOrder()) + "}");
        auditService.submit(record);

        if ("AVATAR".equals(req.getMediaType())) {
            user.setAvatar(req.getMediaUrl());
            appUserDao.updateById(user);
        }
        return toVo(record, req.getMediaType());
    }

    /** 删除当前用户自己的媒体审核记录；生效内容删除后不自动回退旧内容。 */
    @Override
    @Transactional
    public void deleteMedia(Long userId, Long mediaId) {
        AppUserAuditRecord record = auditRecordDao.selectById(mediaId);
        if (record == null || !userId.equals(record.getUserId()) || !isMediaType(record.getAuditType())) {
            throw new BusinessException("资料媒体不存在");
        }
        auditService.systemExpire(record.getId(), "用户删除资料媒体");
    }

    private boolean isMediaType(String auditType) {
        return AppUserAuditTypeEnum.AVATAR.getCode().equals(auditType)
                || AppUserAuditTypeEnum.ALBUM_PHOTO.getCode().equals(auditType)
                || AppUserAuditTypeEnum.PROFILE_BG.getCode().equals(auditType)
                || AppUserAuditTypeEnum.EDUCATION.getCode().equals(auditType);
    }

    private AppUser requireUser(Long userId) {
        AppUser user = appUserDao.selectById(userId);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        return user;
    }

    private void validate(ProfileMediaSubmitReq req) {
        if (req == null || !ALLOWED_TYPES.contains(req.getMediaType())) {
            throw new BusinessException("不支持的媒体类型");
        }
        if (StrUtil.isBlank(req.getMediaUrl())) {
            throw new BusinessException("媒体 URL 不能为空");
        }
    }

    private AppUserAuditTypeEnum toAuditType(String mediaType) {
        return switch (mediaType) {
            case "AVATAR" -> AppUserAuditTypeEnum.AVATAR;
            case "ALBUM" -> AppUserAuditTypeEnum.ALBUM_PHOTO;
            case "PROFILE_BG" -> AppUserAuditTypeEnum.PROFILE_BG;
            case "EDUCATION_CERT" -> AppUserAuditTypeEnum.EDUCATION;
            default -> throw new BusinessException("不支持的媒体类型");
        };
    }

    private ProfileMediaVO toVo(AppUserAuditRecord record, String mediaType) {
        ProfileMediaVO vo = new ProfileMediaVO();
        vo.setMediaId(record.getId());
        vo.setMediaType(mediaType);
        vo.setMediaUrl(record.getMediaUrl());
        vo.setThumbUrl(record.getThumbUrl());
        vo.setSortOrder(0);
        vo.setAuditStatus(record.getStatus());
        vo.setAuditSource(record.getAuditSource());
        vo.setRejectReason(record.getRejectReason());
        return vo;
    }

    private String json(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
