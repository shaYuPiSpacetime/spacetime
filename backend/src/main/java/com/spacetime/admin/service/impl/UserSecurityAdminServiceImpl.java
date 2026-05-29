package com.spacetime.admin.service.impl;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.response.*;
import com.spacetime.admin.service.UserSecurityAdminService;
import com.spacetime.common.dao.*;
import com.spacetime.common.entity.*;
import com.spacetime.common.enums.RelationBlockTypeEnum;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * 后台用户安全信息查询服务实现
 * 仅依赖 common DAO 层，不依赖 miniapp 模块
 */
@Service
@RequiredArgsConstructor
public class UserSecurityAdminServiceImpl implements UserSecurityAdminService {
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final AppUserPrivacySettingDao privacySettingDao;
    private final AppUserNotificationSettingDao notificationSettingDao;
    private final AppUserRelationBlockDao relationBlockDao;
    private final AppUserKeywordBlockDao keywordBlockDao;
    private final AppUserFeedbackDao feedbackDao;
    private final AppUserCancelRequestDao cancelRequestDao;
    private final AppUserSearchLogDao searchLogDao;
    // TODO: PRD-01 app_user 表落地后替换为 AppUserDao
    private final UserDao userDao;

    @Override
    public AdminUserSecuritySummaryVO summary(Long userId) {
        SysUser user = userDao.selectById(userId);
        AppUserCancelRequest cancel = cancelRequestDao.selectLatestByUserId(userId);
        AdminUserSecuritySummaryVO vo = new AdminUserSecuritySummaryVO();
        vo.setUserId(userId);
        vo.setNickname(displayName(user, userId));
        vo.setBlacklistCount(relationBlockDao.countActiveByUserId(userId, RelationBlockTypeEnum.BLACKLIST.getCode()));
        vo.setHiddenDynamicCount(relationBlockDao.countActiveByUserId(userId, RelationBlockTypeEnum.HIDDEN_DYNAMIC.getCode()));
        vo.setKeywordCount(keywordBlockDao.countActiveByUserId(userId));
        vo.setFeedbackCount(feedbackDao.countByUserId(userId));
        vo.setSearchCount(searchLogDao.countByUserId(userId));
        vo.setCancelStatus(cancel != null ? cancel.getStatus() : "NONE");
        return vo;
    }

    @Override
    public AdminPrivacySettingVO privacy(Long userId) {
        AppUserPrivacySetting entity = privacySettingDao.selectByUserId(userId);
        AdminPrivacySettingVO vo = new AdminPrivacySettingVO();
        if (entity == null) {
            // 用户未设置过，返回默认值
            vo.setShowDistance(true);
            vo.setHideActiveTime(false);
            vo.setShowMaritalStatus(true);
            vo.setProfileUpdateVisible(true);
            vo.setOnlyOppositeInteraction(false);
            vo.setPersonalizedPush(true);
            vo.setMatchChatHint(true);
            vo.setSmartReply(true);
            return vo;
        }
        vo.setShowDistance(toBool(entity.getShowDistance()));
        vo.setHideActiveTime(toBool(entity.getHideActiveTime()));
        vo.setShowMaritalStatus(toBool(entity.getShowMaritalStatus()));
        vo.setProfileUpdateVisible(toBool(entity.getProfileUpdateVisible()));
        vo.setOnlyOppositeInteraction(toBool(entity.getOnlyOppositeInteraction()));
        vo.setPersonalizedPush(toBool(entity.getPersonalizedPush()));
        vo.setMatchChatHint(toBool(entity.getMatchChatHint()));
        vo.setSmartReply(toBool(entity.getSmartReply()));
        return vo;
    }

    @Override
    public AdminNotificationSettingVO notifications(Long userId) {
        AppUserNotificationSetting entity = notificationSettingDao.selectByUserId(userId);
        AdminNotificationSettingVO vo = new AdminNotificationSettingVO();
        if (entity == null) {
            // 用户未设置过，返回默认全开
            vo.setInteraction(true);
            vo.setCommunity(true);
            vo.setDailyRecommend(true);
            vo.setAppExit(true);
            vo.setMatchSuccess(true);
            vo.setChat(true);
            vo.setWhisper(true);
            vo.setCertification(true);
            vo.setReport(true);
            vo.setAsset(true);
            vo.setBannerInApp(true);
            return vo;
        }
        vo.setInteraction(toBool(entity.getInteraction()));
        vo.setCommunity(toBool(entity.getCommunity()));
        vo.setDailyRecommend(toBool(entity.getDailyRecommend()));
        vo.setAppExit(toBool(entity.getAppExit()));
        vo.setMatchSuccess(toBool(entity.getMatchSuccess()));
        vo.setChat(toBool(entity.getChat()));
        vo.setWhisper(toBool(entity.getWhisper()));
        vo.setCertification(toBool(entity.getCertification()));
        vo.setReport(toBool(entity.getReport()));
        vo.setAsset(toBool(entity.getAsset()));
        vo.setBannerInApp(toBool(entity.getBannerInApp()));
        return vo;
    }

    @Override
    public Page<AdminRelationBlockVO> blacklist(Long userId, int page, int size) {
        return blockPage(userId, RelationBlockTypeEnum.BLACKLIST.getCode(), page, size);
    }

    @Override
    public Page<AdminRelationBlockVO> hiddenDynamics(Long userId, int page, int size) {
        return blockPage(userId, RelationBlockTypeEnum.HIDDEN_DYNAMIC.getCode(), page, size);
    }

    @Override
    public List<AdminUserKeywordVO> keywordBlocks(Long userId) {
        return keywordBlockDao.selectActiveByUserId(userId).stream().map(this::toKeywordVO).toList();
    }

    private Page<AdminRelationBlockVO> blockPage(Long userId, String blockType, int page, int size) {
        Page<AppUserRelationBlock> result = relationBlockDao.selectPageByUserId(new Page<>(page, size), userId, blockType);
        Page<AdminRelationBlockVO> voPage = new Page<>(result.getCurrent(), result.getSize(), result.getTotal());
        voPage.setRecords(result.getRecords().stream().map(this::toBlockVO).toList());
        return voPage;
    }

    private AdminRelationBlockVO toBlockVO(AppUserRelationBlock entity) {
        SysUser target = userDao.selectById(entity.getTargetUserId());
        AdminRelationBlockVO vo = new AdminRelationBlockVO();
        vo.setId(entity.getId());
        vo.setUserId(entity.getUserId());
        vo.setTargetUserId(entity.getTargetUserId());
        vo.setTargetNickname(displayName(target, entity.getTargetUserId()));
        vo.setBlockType(entity.getBlockType());
        vo.setSourceScene(entity.getSourceScene());
        vo.setStatus(entity.getStatus());
        vo.setCreateTime(entity.getCreateTime() != null ? entity.getCreateTime().format(FMT) : null);
        return vo;
    }

    private AdminUserKeywordVO toKeywordVO(AppUserKeywordBlock entity) {
        AdminUserKeywordVO vo = new AdminUserKeywordVO();
        vo.setId(entity.getId());
        vo.setUserId(entity.getUserId());
        vo.setKeyword(entity.getKeyword());
        vo.setStatus(entity.getStatus());
        vo.setCreateTime(entity.getCreateTime() != null ? entity.getCreateTime().format(FMT) : null);
        return vo;
    }

    private String displayName(SysUser user, Long fallbackId) {
        if (user == null) {
            return "用户" + fallbackId;
        }
        return StringUtils.hasText(user.getNickname()) ? user.getNickname() : user.getUsername();
    }

    private Boolean toBool(Integer value) {
        return value != null && value == 1;
    }
}
