package com.spacetime.miniapp.service.impl;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.*;
import com.spacetime.common.entity.*;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.enums.MobilePageCodeEnum;
import com.spacetime.common.enums.RelationBlockTypeEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.request.MiniappKeywordBlockReq;
import com.spacetime.miniapp.dto.request.MiniappNotificationSettingReq;
import com.spacetime.miniapp.dto.request.MiniappPrivacySettingReq;
import com.spacetime.miniapp.dto.request.MiniappRelationBlockReq;
import com.spacetime.miniapp.dto.response.*;
import com.spacetime.miniapp.service.MiniappMobileConfigService;
import com.spacetime.miniapp.service.MiniappSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MiniappSettingServiceImpl extends UserSecurityBaseSupport implements MiniappSettingService {
    private static final int DEFAULT_KEYWORD_LIMIT = 20;
    private static final int DEFAULT_KEYWORD_LENGTH = 30;

    private final AppUserPrivacySettingDao privacyDao;
    private final AppUserNotificationSettingDao notificationDao;
    private final AppUserRelationBlockDao relationBlockDao;
    private final AppUserKeywordBlockDao keywordBlockDao;
    private final AppUserSecurityAuditLogDao auditLogDao;
    private final AppConfigDao appConfigDao;
    private final UserDao userDao;
    private final MiniappMobileConfigService mobileConfigService;

    @Override
    public MiniappSettingsHomeVO home(Long userId) {
        SysUser user = userDao.selectById(userId);
        MiniappSettingsHomeVO vo = new MiniappSettingsHomeVO();
        vo.setPhoneBindStatus(user != null && StringUtils.hasText(user.getPhone()) ? "BOUND" : "UNBOUND");
        vo.setMaskedPhone(user != null ? maskPhone(user.getPhone()) : null);
        vo.setWechatBindStatus("UNBOUND");
        vo.setEntries(mobileConfigService.getEntries(MobilePageCodeEnum.SETTINGS_PAGE.getCode()));
        AppConfig version = appConfigDao.selectByKey("miniapp.current_version");
        vo.setCurrentVersion(version != null ? version.getConfigValue() : null);
        return vo;
    }

    @Override
    public MiniappPrivacySettingVO getPrivacy(Long userId) {
        AppUserPrivacySetting entity = privacyDao.selectByUserId(userId);
        if (entity == null) {
            entity = initDefaultPrivacy(userId);
        }
        return toPrivacyVO(entity);
    }

    @Override
    @Transactional
    public void savePrivacy(Long userId, MiniappPrivacySettingReq req) {
        AppUserPrivacySetting entity = privacyDao.selectByUserId(userId);
        if (entity == null) {
            entity = defaultPrivacy(userId);
            privacyDao.insert(entity);
        }
        String before = toPrivacyVO(entity).toString();
        applyPrivacy(entity, req);
        privacyDao.updateById(entity);
        writeAudit(auditLogDao, userId, userId, "PRIVACY_SETTING", entity.getId(), "UPDATE", before, toPrivacyVO(entity).toString());
    }

    @Override
    public MiniappNotificationSettingVO getNotifications(Long userId) {
        AppUserNotificationSetting entity = notificationDao.selectByUserId(userId);
        if (entity == null) {
            entity = initDefaultNotification(userId);
        }
        return toNotificationVO(entity);
    }

    @Override
    @Transactional
    public void saveNotifications(Long userId, MiniappNotificationSettingReq req) {
        AppUserNotificationSetting entity = notificationDao.selectByUserId(userId);
        if (entity == null) {
            entity = defaultNotification(userId);
            notificationDao.insert(entity);
        }
        String before = toNotificationVO(entity).toString();
        applyNotification(entity, req);
        notificationDao.updateById(entity);
        writeAudit(auditLogDao, userId, userId, "NOTIFICATION_SETTING", entity.getId(), "UPDATE", before, toNotificationVO(entity).toString());
    }

    @Override
    public Page<MiniappBlockedUserVO> listBlocks(Long userId, String blockType, int page, int size) {
        Page<AppUserRelationBlock> result = relationBlockDao.selectPageByUserId(new Page<>(page, size), userId, blockType);
        Page<MiniappBlockedUserVO> voPage = new Page<>(result.getCurrent(), result.getSize(), result.getTotal());
        voPage.setRecords(result.getRecords().stream().map(this::toBlockedVO).toList());
        return voPage;
    }

    @Override
    @Transactional
    public Long addBlock(Long userId, String blockType, MiniappRelationBlockReq req) {
        if (RelationBlockTypeEnum.getByCode(blockType) == null) {
            throw new BusinessException("不支持的屏蔽类型");
        }
        if (userId.equals(req.getTargetUserId())) {
            throw new BusinessException("不能屏蔽自己");
        }
        AppUserRelationBlock existing = relationBlockDao.selectActive(userId, req.getTargetUserId(), blockType);
        if (existing != null) {
            return existing.getId();
        }
        AppUserRelationBlock entity = new AppUserRelationBlock();
        entity.setUserId(userId);
        entity.setTargetUserId(req.getTargetUserId());
        entity.setBlockType(blockType);
        entity.setSourceScene(req.getSourceScene());
        entity.setStatus(CommonStatusEnum.ENABLED.getCode());
        relationBlockDao.insert(entity);
        writeAudit(auditLogDao, userId, userId, "RELATION_BLOCK", entity.getId(), "CREATE", null, blockType + ":" + req.getTargetUserId());
        return entity.getId();
    }

    @Override
    @Transactional
    public void removeBlock(Long userId, String blockType, Long id) {
        AppUserRelationBlock entity = relationBlockDao.selectById(id);
        if (entity == null || !userId.equals(entity.getUserId()) || !blockType.equals(entity.getBlockType())) {
            throw new BusinessException("屏蔽记录不存在");
        }
        entity.setStatus(CommonStatusEnum.DISABLED.getCode());
        relationBlockDao.updateById(entity);
        writeAudit(auditLogDao, userId, userId, "RELATION_BLOCK", id, "DISABLE", entity.getBlockType(), null);
    }

    @Override
    public List<MiniappUserKeywordVO> listKeywords(Long userId) {
        return keywordBlockDao.selectActiveByUserId(userId).stream().map(this::toKeywordVO).toList();
    }

    @Override
    @Transactional
    public Long addKeyword(Long userId, MiniappKeywordBlockReq req) {
        String keyword = req.getKeyword() == null ? "" : req.getKeyword().trim();
        if (!StringUtils.hasText(keyword)) {
            throw new BusinessException("关键词不能为空");
        }
        if (keyword.length() > keywordMaxLength()) {
            throw new BusinessException("关键词长度超过限制");
        }
        AppUserKeywordBlock existing = keywordBlockDao.selectActiveByUserAndKeyword(userId, keyword);
        if (existing != null) {
            return existing.getId();
        }
        if (keywordBlockDao.countActiveByUserId(userId) >= keywordLimit()) {
            throw new BusinessException("关键词数量超过限制");
        }
        AppUserKeywordBlock entity = new AppUserKeywordBlock();
        entity.setUserId(userId);
        entity.setKeyword(keyword);
        entity.setStatus(CommonStatusEnum.ENABLED.getCode());
        keywordBlockDao.insert(entity);
        writeAudit(auditLogDao, userId, userId, "KEYWORD_BLOCK", entity.getId(), "CREATE", null, keyword);
        return entity.getId();
    }

    @Override
    @Transactional
    public void removeKeyword(Long userId, Long id) {
        AppUserKeywordBlock entity = keywordBlockDao.selectById(id);
        if (entity == null || !userId.equals(entity.getUserId())) {
            throw new BusinessException("关键词不存在");
        }
        entity.setStatus(CommonStatusEnum.DISABLED.getCode());
        keywordBlockDao.updateById(entity);
        writeAudit(auditLogDao, userId, userId, "KEYWORD_BLOCK", id, "DISABLE", entity.getKeyword(), null);
    }

    private AppUserPrivacySetting defaultPrivacy(Long userId) {
        AppUserPrivacySetting entity = new AppUserPrivacySetting();
        entity.setUserId(userId);
        entity.setShowDistance(boolConfig("privacy.show_distance.default", true));
        entity.setHideActiveTime(boolConfig("privacy.hide_active_time.default", false));
        entity.setShowMaritalStatus(boolConfig("privacy.show_marital_status.default", true));
        entity.setProfileUpdateVisible(boolConfig("privacy.profile_update_visible.default", true));
        entity.setOnlyOppositeInteraction(boolConfig("privacy.only_opposite_interaction.default", false));
        entity.setPersonalizedPush(boolConfig("privacy.personalized_push.default", true));
        entity.setMatchChatHint(boolConfig("privacy.match_chat_hint.default", true));
        entity.setSmartReply(boolConfig("privacy.smart_reply.default", true));
        return entity;
    }

    /** 首次查询时初始化默认隐私设置 */
    @Transactional
    protected AppUserPrivacySetting initDefaultPrivacy(Long userId) {
        AppUserPrivacySetting entity = defaultPrivacy(userId);
        privacyDao.insert(entity);
        return entity;
    }

    private AppUserNotificationSetting defaultNotification(Long userId) {
        AppUserNotificationSetting entity = new AppUserNotificationSetting();
        entity.setUserId(userId);
        entity.setInteraction(1);
        entity.setCommunity(1);
        entity.setDailyRecommend(1);
        entity.setAppExit(1);
        entity.setMatchSuccess(1);
        entity.setChat(1);
        entity.setWhisper(1);
        entity.setCertification(1);
        entity.setReport(1);
        entity.setAsset(1);
        entity.setBannerInApp(1);
        return entity;
    }

    /** 首次查询时初始化默认通知设置 */
    @Transactional
    protected AppUserNotificationSetting initDefaultNotification(Long userId) {
        AppUserNotificationSetting entity = defaultNotification(userId);
        notificationDao.insert(entity);
        return entity;
    }

    private void applyPrivacy(AppUserPrivacySetting e, MiniappPrivacySettingReq r) {
        if (r.getShowDistance() != null) e.setShowDistance(toInt(r.getShowDistance()));
        if (r.getHideActiveTime() != null) e.setHideActiveTime(toInt(r.getHideActiveTime()));
        if (r.getShowMaritalStatus() != null) e.setShowMaritalStatus(toInt(r.getShowMaritalStatus()));
        if (r.getProfileUpdateVisible() != null) e.setProfileUpdateVisible(toInt(r.getProfileUpdateVisible()));
        if (r.getOnlyOppositeInteraction() != null) e.setOnlyOppositeInteraction(toInt(r.getOnlyOppositeInteraction()));
        if (r.getPersonalizedPush() != null) e.setPersonalizedPush(toInt(r.getPersonalizedPush()));
        if (r.getMatchChatHint() != null) e.setMatchChatHint(toInt(r.getMatchChatHint()));
        if (r.getSmartReply() != null) e.setSmartReply(toInt(r.getSmartReply()));
    }

    private void applyNotification(AppUserNotificationSetting e, MiniappNotificationSettingReq r) {
        if (r.getInteraction() != null) e.setInteraction(toInt(r.getInteraction()));
        if (r.getCommunity() != null) e.setCommunity(toInt(r.getCommunity()));
        if (r.getDailyRecommend() != null) e.setDailyRecommend(toInt(r.getDailyRecommend()));
        if (r.getAppExit() != null) e.setAppExit(toInt(r.getAppExit()));
        if (r.getMatchSuccess() != null) e.setMatchSuccess(toInt(r.getMatchSuccess()));
        if (r.getChat() != null) e.setChat(toInt(r.getChat()));
        if (r.getWhisper() != null) e.setWhisper(toInt(r.getWhisper()));
        if (r.getCertification() != null) e.setCertification(toInt(r.getCertification()));
        if (r.getReport() != null) e.setReport(toInt(r.getReport()));
        if (r.getAsset() != null) e.setAsset(toInt(r.getAsset()));
        if (r.getBannerInApp() != null) e.setBannerInApp(toInt(r.getBannerInApp()));
    }

    private MiniappPrivacySettingVO toPrivacyVO(AppUserPrivacySetting e) {
        MiniappPrivacySettingVO vo = new MiniappPrivacySettingVO();
        vo.setShowDistance(toBool(e.getShowDistance()));
        vo.setHideActiveTime(toBool(e.getHideActiveTime()));
        vo.setShowMaritalStatus(toBool(e.getShowMaritalStatus()));
        vo.setProfileUpdateVisible(toBool(e.getProfileUpdateVisible()));
        vo.setOnlyOppositeInteraction(toBool(e.getOnlyOppositeInteraction()));
        vo.setPersonalizedPush(toBool(e.getPersonalizedPush()));
        vo.setMatchChatHint(toBool(e.getMatchChatHint()));
        vo.setSmartReply(toBool(e.getSmartReply()));
        return vo;
    }

    private MiniappNotificationSettingVO toNotificationVO(AppUserNotificationSetting e) {
        MiniappNotificationSettingVO vo = new MiniappNotificationSettingVO();
        vo.setInteraction(toBool(e.getInteraction()));
        vo.setCommunity(toBool(e.getCommunity()));
        vo.setDailyRecommend(toBool(e.getDailyRecommend()));
        vo.setAppExit(toBool(e.getAppExit()));
        vo.setMatchSuccess(toBool(e.getMatchSuccess()));
        vo.setChat(toBool(e.getChat()));
        vo.setWhisper(toBool(e.getWhisper()));
        vo.setCertification(toBool(e.getCertification()));
        vo.setReport(toBool(e.getReport()));
        vo.setAsset(toBool(e.getAsset()));
        vo.setBannerInApp(toBool(e.getBannerInApp()));
        return vo;
    }

    private MiniappBlockedUserVO toBlockedVO(AppUserRelationBlock e) {
        SysUser target = userDao.selectById(e.getTargetUserId());
        MiniappBlockedUserVO vo = new MiniappBlockedUserVO();
        vo.setId(e.getId());
        vo.setTargetUserId(e.getTargetUserId());
        vo.setTargetNickname(displayName(target, e.getTargetUserId()));
        vo.setTargetAvatar(target != null ? target.getAvatar() : null);
        vo.setBlockType(e.getBlockType());
        vo.setSourceScene(e.getSourceScene());
        vo.setCreateTime(e.getCreateTime() != null ? e.getCreateTime().format(FMT) : null);
        return vo;
    }

    private MiniappUserKeywordVO toKeywordVO(AppUserKeywordBlock e) {
        MiniappUserKeywordVO vo = new MiniappUserKeywordVO();
        vo.setId(e.getId());
        vo.setKeyword(e.getKeyword());
        vo.setCreateTime(e.getCreateTime() != null ? e.getCreateTime().format(FMT) : null);
        return vo;
    }

    private int boolConfig(String key, boolean defaultValue) {
        AppConfig config = appConfigDao.selectByKey(key);
        if (config == null || !StringUtils.hasText(config.getConfigValue())) {
            return toInt(defaultValue);
        }
        return toInt(Boolean.parseBoolean(config.getConfigValue()) || "1".equals(config.getConfigValue()));
    }

    private int keywordLimit() {
        return intConfig("keyword_block.limit", DEFAULT_KEYWORD_LIMIT);
    }

    private int keywordMaxLength() {
        return intConfig("keyword_block.max_length", DEFAULT_KEYWORD_LENGTH);
    }

    private int intConfig(String key, int defaultValue) {
        AppConfig config = appConfigDao.selectByKey(key);
        if (config == null || !StringUtils.hasText(config.getConfigValue())) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(config.getConfigValue());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    private boolean toBool(Integer value) {
        return value != null && value == 1;
    }

    private int toInt(boolean value) {
        return value ? 1 : 0;
    }
}
