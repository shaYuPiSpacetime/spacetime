package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserAuditRecordDao;
import com.spacetime.common.dao.ExternalProviderTaskDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.entity.ExternalProviderTask;
import com.spacetime.common.enums.AppUserAuditStatusEnum;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.enums.AuditSourceEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.provider.ImageSafetyProvider;
import com.spacetime.common.provider.ProviderCheckResult;
import com.spacetime.common.service.AppUserAuditService;
import com.spacetime.miniapp.dto.request.AvatarSubmitReq;
import com.spacetime.miniapp.dto.request.ProfileMediaSubmitReq;
import com.spacetime.miniapp.dto.response.AvatarSubmitVO;
import com.spacetime.miniapp.dto.response.ProfileMediaVO;
import com.spacetime.miniapp.service.ProfileMediaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

/**
 * 移动端资料媒体服务实现。
 * 媒体上传后统一生成 app_user_audit_record，不再写入资料媒体分表。
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ProfileMediaServiceImpl implements ProfileMediaService {

    private static final Set<String> ALLOWED_TYPES = Set.of("ALBUM", "PROFILE_BG");
    private static final Set<String> AVATAR_SOURCES = Set.of("CAMERA", "ALBUM");

    private final AppUserDao appUserDao;
    private final AppUserAuditRecordDao auditRecordDao;
    private final AppUserAuditService auditService;
    private final ExternalProviderTaskDao externalProviderTaskDao;
    private final ImageSafetyProvider imageSafetyProvider;

    /**
     * 添加主头像并生成一条独立的头像审核记录。
     * 历史审核记录保持原状态，头像业务是否生效始终由最新头像记录判断。
     */
    @Override
    @Transactional
    public AvatarSubmitVO submitAvatar(Long userId, AvatarSubmitReq req) {
        AppUser user = requireUser(userId);
        validateAvatar(req);
        AppUserAuditRecord latest = auditService.latestRecord(userId, AppUserAuditTypeEnum.AVATAR);
        if (latest != null && AppUserAuditStatusEnum.isPendingLike(latest.getStatus())) {
            throw new BusinessException("头像认证审核中，请勿重复提交");
        }

        AppUserAuditRecord record = new AppUserAuditRecord();
        record.setUserId(userId);
        record.setAuditType(AppUserAuditTypeEnum.AVATAR.getCode());
        record.setAuditSource(AuditSourceEnum.MACHINE.getCode());
        record.setStatus(AppUserAuditStatusEnum.PENDING.getCode());
        record.setMediaUrl(req.getAvatarUrl());
        record.setThumbUrl(req.getThumbUrl());
        record.setMaterialJson("{\"avatarSource\":\"" + req.getAvatarSource() + "\"}");
        auditService.submit(record);
        reviewImage(record);

        return toAvatarVO(record);
    }

    /** 保存媒体审核记录；审核通过前不对外生效。 */
    @Override
    @Transactional
    public ProfileMediaVO submitMedia(Long userId, ProfileMediaSubmitReq req) {
        requireUser(userId);
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
        reviewImage(record);

        return toVo(record, req.getMediaType());
    }

    /**
     * 调用图片安全 Provider，并统一写入三方任务和机审历史。
     * Provider 异常时保留待审核状态，后台仍可继续人工审核。
     */
    private void reviewImage(AppUserAuditRecord record) {
        try {
            ProviderCheckResult result = imageSafetyProvider.check(
                    record.getAuditType(), record.getMediaUrl(), record.getThumbUrl());
            ExternalProviderTask task = imageProviderTask(record, result);
            externalProviderTaskDao.insert(task);
            if (Boolean.TRUE.equals(result.getSafe())) {
                auditService.machineApprove(record.getId(), task.getId(), result.getRawResponseJson());
            } else {
                auditService.machineReject(record.getId(), task.getId(), result.getRawResponseJson(),
                        StrUtil.blankToDefault(result.getRejectReason(), "图片安全审核未通过"));
            }
        } catch (Exception ex) {
            log.warn("图片安全 Provider 调用失败，auditRecordId={}", record.getId(), ex);
        }
    }

    /** 构造图片安全三方任务，便于后续替换真实 Provider 后排查调用结果。 */
    private ExternalProviderTask imageProviderTask(AppUserAuditRecord record, ProviderCheckResult result) {
        ExternalProviderTask task = new ExternalProviderTask();
        task.setProviderType("IMAGE_SAFETY");
        task.setProviderCode(result.getProviderCode());
        task.setUserId(record.getUserId());
        task.setRequestPayloadJson("{\"auditType\":\"" + json(record.getAuditType())
                + "\",\"mediaUrl\":\"" + json(record.getMediaUrl())
                + "\",\"thumbUrl\":\"" + json(record.getThumbUrl()) + "\"}");
        task.setResponsePayloadJson(result.getRawResponseJson());
        task.setTaskStatus(Boolean.TRUE.equals(result.getSafe()) ? "SUCCESS" : "REJECTED");
        task.setMocked(Boolean.TRUE.equals(result.getMocked()) ? 1 : 0);
        task.setErrorMessage(result.getRejectReason());
        return task;
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
                || AppUserAuditTypeEnum.PROFILE_BG.getCode().equals(auditType);
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
            throw new BusinessException("不支持的媒体类型，头像请使用添加头像接口");
        }
        if (StrUtil.isBlank(req.getMediaUrl())) {
            throw new BusinessException("媒体 URL 不能为空");
        }
    }

    private AppUserAuditTypeEnum toAuditType(String mediaType) {
        return switch (mediaType) {
            case "ALBUM" -> AppUserAuditTypeEnum.ALBUM_PHOTO;
            case "PROFILE_BG" -> AppUserAuditTypeEnum.PROFILE_BG;
            default -> throw new BusinessException("不支持的媒体类型");
        };
    }

    private void validateAvatar(AvatarSubmitReq req) {
        if (req == null || !AVATAR_SOURCES.contains(req.getAvatarSource())) {
            throw new BusinessException("头像来源只支持 CAMERA 或 ALBUM");
        }
        if (StrUtil.isBlank(req.getAvatarUrl()) || !isHttpUrl(req.getAvatarUrl())) {
            throw new BusinessException("头像 URL 格式不正确");
        }
        if (StrUtil.isNotBlank(req.getThumbUrl()) && !isHttpUrl(req.getThumbUrl())) {
            throw new BusinessException("头像缩略图 URL 格式不正确");
        }
    }

    private boolean isHttpUrl(String value) {
        return value.startsWith("https://") || value.startsWith("http://");
    }

    private AvatarSubmitVO toAvatarVO(AppUserAuditRecord record) {
        AvatarSubmitVO vo = new AvatarSubmitVO();
        vo.setAuditRecordId(record.getId());
        vo.setAuditStatus(record.getStatus());
        vo.setAuditSource(record.getAuditSource());
        return vo;
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
