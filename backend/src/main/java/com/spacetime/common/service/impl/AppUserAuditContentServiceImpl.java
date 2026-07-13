package com.spacetime.common.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.AppUserAuditRecordDao;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.enums.AppUserAuditStatusEnum;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.service.AppUserAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 用户审核内容统一查询实现。
 */
@Service
@RequiredArgsConstructor
public class AppUserAuditContentServiceImpl implements AppUserAuditContentService {

    private final AppUserAuditService auditService;
    private final AppUserAuditRecordDao auditRecordDao;

    @Override
    public String ownerAvatar(Long userId) {
        return mediaUrl(auditService.latestRecord(userId, AppUserAuditTypeEnum.AVATAR));
    }

    @Override
    public Map<Long, String> ownerAvatars(Collection<Long> userIds) {
        Map<Long, AppUserAuditRecord> latestByUser = latestAvatars(userIds);
        Map<Long, String> result = new LinkedHashMap<>();
        latestByUser.forEach((userId, record) -> {
            if (StrUtil.isNotBlank(record.getMediaUrl())) {
                result.put(userId, record.getMediaUrl());
            }
        });
        return result;
    }

    @Override
    public String publicAvatar(Long userId) {
        AppUserAuditRecord latest = auditService.latestRecord(userId, AppUserAuditTypeEnum.AVATAR);
        return isApproved(latest) ? mediaUrl(latest) : null;
    }

    @Override
    public Map<Long, String> publicAvatars(Collection<Long> userIds) {
        Map<Long, AppUserAuditRecord> latestByUser = latestAvatars(userIds);
        Map<Long, String> result = new LinkedHashMap<>();
        latestByUser.forEach((userId, record) -> {
            if (isApproved(record) && StrUtil.isNotBlank(record.getMediaUrl())) {
                result.put(userId, record.getMediaUrl());
            }
        });
        return result;
    }

    @Override
    public String ownerText(Long userId, AppUserAuditTypeEnum type) {
        requireTextType(type);
        return contentText(auditService.latestRecord(userId, type));
    }

    @Override
    public String publicText(Long userId, AppUserAuditTypeEnum type) {
        requireTextType(type);
        return contentText(auditService.latestEffectiveRecord(userId, type));
    }

    @Override
    public String ownerProfileBackground(Long userId) {
        return mediaUrl(auditService.latestRecord(userId, AppUserAuditTypeEnum.PROFILE_BG));
    }

    @Override
    public String publicProfileBackground(Long userId) {
        return mediaUrl(auditService.latestEffectiveRecord(userId, AppUserAuditTypeEnum.PROFILE_BG));
    }

    @Override
    public List<String> ownerAlbumPhotos(Long userId) {
        return auditRecordDao.selectList(new LambdaQueryWrapper<AppUserAuditRecord>()
                        .eq(AppUserAuditRecord::getUserId, userId)
                        .eq(AppUserAuditRecord::getAuditType, AppUserAuditTypeEnum.ALBUM_PHOTO.getCode())
                        .ne(AppUserAuditRecord::getStatus, AppUserAuditStatusEnum.EXPIRED.getCode())
                        .orderByAsc(AppUserAuditRecord::getSubmitTime)
                        .orderByAsc(AppUserAuditRecord::getId))
                .stream()
                .map(AppUserAuditRecord::getMediaUrl)
                .filter(StrUtil::isNotBlank)
                .toList();
    }

    @Override
    public Map<Long, List<String>> ownerAlbumPhotos(Collection<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Map.of();
        }
        List<AppUserAuditRecord> records = auditRecordDao.selectList(
                new LambdaQueryWrapper<AppUserAuditRecord>()
                        .in(AppUserAuditRecord::getUserId, userIds)
                        .eq(AppUserAuditRecord::getAuditType, AppUserAuditTypeEnum.ALBUM_PHOTO.getCode())
                        .ne(AppUserAuditRecord::getStatus, AppUserAuditStatusEnum.EXPIRED.getCode())
                        .orderByAsc(AppUserAuditRecord::getSubmitTime)
                        .orderByAsc(AppUserAuditRecord::getId));
        Map<Long, List<String>> result = new LinkedHashMap<>();
        for (AppUserAuditRecord record : records) {
            if (StrUtil.isBlank(record.getMediaUrl())) {
                continue;
            }
            result.computeIfAbsent(record.getUserId(), ignored -> new ArrayList<>())
                    .add(record.getMediaUrl());
        }
        return result;
    }

    @Override
    public List<String> publicAlbumPhotos(Long userId) {
        return auditService.effectiveRecords(userId, AppUserAuditTypeEnum.ALBUM_PHOTO)
                .stream()
                .map(AppUserAuditRecord::getMediaUrl)
                .filter(StrUtil::isNotBlank)
                .toList();
    }

    private void requireTextType(AppUserAuditTypeEnum type) {
        if (type != AppUserAuditTypeEnum.ABOUT_ME
                && type != AppUserAuditTypeEnum.HOPE_THEY_KNOW
                && type != AppUserAuditTypeEnum.PROFILE_QA) {
            throw new IllegalArgumentException("仅支持开放文字审核类型");
        }
    }

    private boolean isApproved(AppUserAuditRecord record) {
        return record != null
                && AppUserAuditStatusEnum.APPROVED.getCode().equals(record.getStatus());
    }

    private Map<Long, AppUserAuditRecord> latestAvatars(Collection<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Map.of();
        }
        List<AppUserAuditRecord> records = auditRecordDao.selectList(
                new LambdaQueryWrapper<AppUserAuditRecord>()
                        .in(AppUserAuditRecord::getUserId, userIds)
                        .eq(AppUserAuditRecord::getAuditType, AppUserAuditTypeEnum.AVATAR.getCode())
                        .orderByDesc(AppUserAuditRecord::getSubmitTime)
                        .orderByDesc(AppUserAuditRecord::getId));
        Map<Long, AppUserAuditRecord> latestByUser = new LinkedHashMap<>();
        for (AppUserAuditRecord record : records) {
            latestByUser.putIfAbsent(record.getUserId(), record);
        }
        return latestByUser;
    }

    private String mediaUrl(AppUserAuditRecord record) {
        return record == null ? null : record.getMediaUrl();
    }

    private String contentText(AppUserAuditRecord record) {
        return record == null ? null : record.getContentText();
    }
}
