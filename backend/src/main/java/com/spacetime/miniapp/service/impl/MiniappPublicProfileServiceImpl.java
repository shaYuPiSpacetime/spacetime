package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.constant.ProfileDictType;
import com.spacetime.common.dao.AppRelationLikeDao;
import com.spacetime.common.dao.AppRelationMatchDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppUserRelationBlockDao;
import com.spacetime.common.dao.UserUnlockRecordDao;
import com.spacetime.common.entity.AppRelationLike;
import com.spacetime.common.entity.AppRelationMatch;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.UserUnlockRecord;
import com.spacetime.common.enums.AppUserAuditTypeEnum;
import com.spacetime.common.enums.RelationBlockTypeEnum;
import com.spacetime.common.enums.RelationLikeStatusEnum;
import com.spacetime.common.enums.RelationMatchStatusEnum;
import com.spacetime.common.enums.UnlockRecordStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.service.AppUserAuditService;
import com.spacetime.common.service.ProfileDictionaryService;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.miniapp.dto.response.PublicProfileVO;
import com.spacetime.miniapp.service.MiniappPublicProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.ArrayList;
import java.util.Objects;
import java.util.Locale;
import java.time.LocalDateTime;

/** 小程序公开资料查询实现。 */
@Service
@RequiredArgsConstructor
public class MiniappPublicProfileServiceImpl implements MiniappPublicProfileService {
    private static final int CURRENT_ACCESS_CLOSED = 20001;
    private static final int TARGET_UNAVAILABLE = 20002;

    private final AppUserDao appUserDao;
    private final AppRelationLikeDao likeDao;
    private final AppRelationMatchDao matchDao;
    private final AppUserRelationBlockDao relationBlockDao;
    private final RelationAccessProjectionService accessProjectionService;
    private final AppUserAuditContentService auditContentService;
    private final AppUserAuditService auditService;
    private final ProfileDictionaryService profileDictionaryService;
    private final UserUnlockRecordDao unlockRecordDao;
    private final Prd01AccessEvaluator accessEvaluator;

    @Override
    public PublicProfileVO getPublicProfile(Long currentUserId, Long targetUserId) {
        AppUser current = requireBrowsableUser(currentUserId, CURRENT_ACCESS_CLOSED, "公开资料浏览准入未开放");
        if (targetUserId == null || Objects.equals(current.getId(), targetUserId)) {
            throw new BusinessException(TARGET_UNAVAILABLE, "不能访问自己的公开资料");
        }
        AppUser target = requireOpenUser(targetUserId, TARGET_UNAVAILABLE, "目标用户当前不可访问");
        requireNotBlocked(current.getId(), target.getId());

        AppRelationLike like = likeDao.selectOne(new LambdaQueryWrapper<AppRelationLike>()
                .eq(AppRelationLike::getFromUserId, current.getId())
                .eq(AppRelationLike::getToUserId, target.getId())
                .eq(AppRelationLike::getLikeStatus, RelationLikeStatusEnum.ACTIVE.getCode())
                .eq(AppRelationLike::getActiveMarker, 1)
                .last("LIMIT 1"));
        AppRelationMatch match = matchDao.selectActivePair(
                Math.min(current.getId(), target.getId()),
                Math.max(current.getId(), target.getId()));
        boolean matched = match != null
                && RelationMatchStatusEnum.MATCHED.getCode().equals(match.getMatchStatus());
        UserUnlockRecord idealUnlock = unlockRecordDao.selectActiveByTargetUser(
                current.getId(), "ideal", target.getId());
        boolean idealUnlocked = activeUnlock(idealUnlock);
        boolean privateMessage = matched || idealUnlocked;

        PublicProfileVO result = new PublicProfileVO();
        result.setUserId(target.getId());
        result.setUserNo("USR-" + String.format(Locale.ROOT, "%012d", target.getId()));
        result.setNickname(target.getNickname());
        result.setAvatar(auditContentService.publicAvatar(target.getId()));
        result.setHeroPhoto(auditContentService.publicProfileBackground(target.getId()));
        result.setPhotos(safeList(auditContentService.publicAlbumPhotos(target.getId())));
        result.setGender(target.getGender());
        result.setAge(target.getAge());
        result.setHeight(target.getHeight());
        result.setZodiac(target.getZodiac());
        result.setCurrentCity(profileLabel(ProfileDictType.CHINA_REGION, target.getLocationCity()));
        result.setHometownCity(profileLabel(ProfileDictType.CHINA_REGION, target.getHometownCity()));
        result.setSchool(target.getSchool());
        result.setIdentityLabel(profileLabel(ProfileDictType.IDENTITY, target.getIdentity()));
        result.setIndustryLabel(profileLabel(ProfileDictType.INDUSTRY, target.getIndustry()));
        result.setOccupationLabel(profileLabel(ProfileDictType.OCCUPATION, target.getOccupation()));
        result.setCompany(target.getCompany());
        result.setAnnualIncomeLabel(profileLabel(ProfileDictType.ANNUAL_INCOME, target.getAnnualIncome()));
        result.setTags(parseTags(target.getTags()));
        result.setIntroduction(auditContentService.publicText(target.getId(), AppUserAuditTypeEnum.ABOUT_ME));
        result.setDatingGoal(profileLabel(ProfileDictType.DATING_GOAL, target.getDatingGoal()));
        result.setMaritalStatus(profileLabel(ProfileDictType.MARITAL_STATUS, target.getMaritalStatus()));
        result.setEmotionalStatus(profileLabel(ProfileDictType.EMOTIONAL_STATUS, target.getEmotionalStatus()));
        result.setFavoriteSongName(target.getFavoriteSongName());
        result.setFavoriteSongArtist(target.getFavoriteSongArtist());
        result.setFavoriteSongCoverUrl(target.getFavoriteSongCoverUrl());
        result.setLiked(like != null);
        result.setMatched(matched);
        result.setMatchNo(matched ? match.getMatchNo() : null);
        result.setCanEnterConversation(privateMessage);
        result.setCommunicationMode(privateMessage ? "PRIVATE_MESSAGE" : "WHISPER");
        result.setCertifications(certifications(target.getId()));
        return result;
    }

    private List<String> certifications(Long userId) {
        List<String> result = new ArrayList<>(3);
        if (auditService.latestApproved(userId, AppUserAuditTypeEnum.AVATAR)) {
            result.add("AVATAR");
        }
        if (auditService.hasEffective(userId, AppUserAuditTypeEnum.REAL_NAME)) {
            result.add("REAL_NAME");
        }
        if (auditService.hasEffective(userId, AppUserAuditTypeEnum.EDUCATION)) {
            result.add("EDUCATION");
        }
        return List.copyOf(result);
    }

    private boolean activeUnlock(UserUnlockRecord record) {
        return record != null
                && UnlockRecordStatusEnum.ACTIVE.getCode().equals(record.getStatus())
                && Integer.valueOf(1).equals(record.getActiveMarker())
                && (record.getExpireTime() == null || record.getExpireTime().isAfter(LocalDateTime.now()));
    }

    private AppUser requireOpenUser(Long userId, int errorCode, String message) {
        AppUser user = userId == null ? null : appUserDao.selectById(userId);
        if (user == null || !"OPEN".equals(accessProjectionService.project(user))) {
            throw new BusinessException(errorCode, message);
        }
        return user;
    }

    private AppUser requireBrowsableUser(Long userId, int errorCode, String message) {
        AppUser user = userId == null ? null : appUserDao.selectById(userId);
        if (user == null) {
            throw new BusinessException(errorCode, message);
        }
        String relationAccess = accessProjectionService.project(user);
        if ("ABNORMAL".equals(relationAccess)
                || !Boolean.TRUE.equals(accessEvaluator.evaluate(user).getCanBrowseCards())) {
            throw new BusinessException(errorCode, message);
        }
        return user;
    }

    private void requireNotBlocked(Long currentUserId, Long targetUserId) {
        String blockType = RelationBlockTypeEnum.BLACKLIST.getCode();
        boolean blocked = relationBlockDao.selectActive(currentUserId, targetUserId, blockType) != null
                || relationBlockDao.selectActive(targetUserId, currentUserId, blockType) != null;
        if (blocked) {
            throw new BusinessException(TARGET_UNAVAILABLE, "目标用户当前不可访问");
        }
    }

    private List<String> parseTags(String tags) {
        if (StrUtil.isBlank(tags)) {
            return List.of();
        }
        try {
            return JSONUtil.parseArray(tags).toList(String.class).stream()
                    .map(StrUtil::trim)
                    .filter(StrUtil::isNotBlank)
                    .toList();
        } catch (RuntimeException ignored) {
            return List.of();
        }
    }

    private String profileLabel(String dictType, String code) {
        return StrUtil.isBlank(code) ? null : profileDictionaryService.label(dictType, code);
    }

    private List<String> safeList(List<String> values) {
        return values == null ? List.of() : values;
    }
}
