package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.*;
import com.spacetime.admin.dto.response.*;
import com.spacetime.admin.service.CommunityAdminService;
import com.spacetime.common.constant.CommunityConfigKeys;
import com.spacetime.common.dao.*;
import com.spacetime.common.entity.*;
import com.spacetime.common.enums.*;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.util.DesensitizeUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 后台社区管理服务实现
 */
@Service
@RequiredArgsConstructor
public class CommunityAdminServiceImpl implements CommunityAdminService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final CommunityPostDao communityPostDao;
    private final CommunityCommentDao communityCommentDao;
    private final CommunityReportDao communityReportDao;
    private final AppConfigDao appConfigDao;
    private final MobileEntryConfigDao mobileEntryConfigDao;
    private final DictDataDao dictDataDao;
    private final UserDao userDao;
    private final ContentOperationLogDao contentOperationLogDao;

    @Override
    public Page<CommunityPostAdminVO> getPostPage(CommunityPostPageReq req) {
        LambdaQueryWrapper<CommunityPost> wrapper = new LambdaQueryWrapper<CommunityPost>()
                .eq(req.getAuthorId() != null, CommunityPost::getAuthorId, req.getAuthorId())
                .eq(StrUtil.isNotBlank(req.getPostType()), CommunityPost::getPostType, req.getPostType())
                .eq(StrUtil.isNotBlank(req.getStatus()), CommunityPost::getStatus, req.getStatus())
                .eq(StrUtil.isNotBlank(req.getAuditStatus()), CommunityPost::getAuditStatus, req.getAuditStatus())
                .eq(req.getTopicId() != null, CommunityPost::getTopicId, req.getTopicId())
                .and(StrUtil.isNotBlank(req.getKeyword()), w -> w.like(CommunityPost::getTitle, req.getKeyword())
                        .or().like(CommunityPost::getContent, req.getKeyword()))
                .orderByDesc(CommunityPost::getUpdateTime);
        Page<CommunityPost> page = communityPostDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<CommunityPostAdminVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(this::toPostAdminVO).toList());
        return result;
    }

    @Override
    public CommunityPostAdminVO getPostDetail(Long id) {
        return toPostAdminVO(requirePost(id));
    }

    @Override
    @Transactional
    public void auditPost(Long id, CommunityPostAuditReq req) {
        CommunityPost post = requirePost(id);
        CommunityAuditStatusEnum auditStatus = CommunityAuditStatusEnum.getByCode(req.getAuditStatus());
        if (auditStatus == null) {
            throw new BusinessException("不支持的审核状态");
        }
        post.setAuditStatus(auditStatus.getCode());
        post.setAuditRemark(StrUtil.blankToDefault(StrUtil.trim(req.getAuditRemark()), null));
        post.setStatus(CommunityAuditStatusEnum.APPROVED.equals(auditStatus)
                ? CommunityPostStatusEnum.PUBLISHED.getCode()
                : CommunityPostStatusEnum.REJECTED.getCode());
        communityPostDao.updateById(post);
        writeLog("COMMUNITY_POST", post.getId(), "AUDIT", null, auditStatus.getCode());
    }

    @Override
    public Page<CommunityCommentAdminVO> getCommentPage(CommunityCommentPageReq req) {
        LambdaQueryWrapper<CommunityComment> wrapper = new LambdaQueryWrapper<CommunityComment>()
                .eq(req.getPostId() != null, CommunityComment::getPostId, req.getPostId())
                .eq(req.getAuthorId() != null, CommunityComment::getAuthorId, req.getAuthorId())
                .eq(StrUtil.isNotBlank(req.getStatus()), CommunityComment::getStatus, req.getStatus())
                .eq(StrUtil.isNotBlank(req.getAuditStatus()), CommunityComment::getAuditStatus, req.getAuditStatus())
                .like(StrUtil.isNotBlank(req.getKeyword()), CommunityComment::getContent, req.getKeyword())
                .orderByDesc(CommunityComment::getUpdateTime);
        Page<CommunityComment> page = communityCommentDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<CommunityCommentAdminVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(this::toCommentAdminVO).toList());
        return result;
    }

    @Override
    @Transactional
    public void auditComment(Long id, CommunityCommentAuditReq req) {
        CommunityComment comment = requireComment(id);
        CommunityAuditStatusEnum auditStatus = CommunityAuditStatusEnum.getByCode(req.getAuditStatus());
        if (auditStatus == null) {
            throw new BusinessException("不支持的审核状态");
        }
        comment.setAuditStatus(auditStatus.getCode());
        comment.setAuditRemark(StrUtil.blankToDefault(StrUtil.trim(req.getAuditRemark()), null));
        comment.setStatus(CommunityAuditStatusEnum.APPROVED.equals(auditStatus)
                ? CommunityPostStatusEnum.PUBLISHED.getCode()
                : CommunityPostStatusEnum.REJECTED.getCode());
        communityCommentDao.updateById(comment);
        writeLog("COMMUNITY_COMMENT", comment.getId(), "AUDIT", null, auditStatus.getCode());
    }

    @Override
    public Page<CommunityReportAdminVO> getReportPage(CommunityReportPageReq req) {
        LambdaQueryWrapper<CommunityReport> wrapper = new LambdaQueryWrapper<CommunityReport>()
                .eq(req.getReporterId() != null, CommunityReport::getReporterId, req.getReporterId())
                .eq(StrUtil.isNotBlank(req.getTargetType()), CommunityReport::getTargetType, req.getTargetType())
                .eq(StrUtil.isNotBlank(req.getStatus()), CommunityReport::getStatus, req.getStatus())
                .eq(StrUtil.isNotBlank(req.getReasonCode()), CommunityReport::getReasonCode, req.getReasonCode())
                .orderByDesc(CommunityReport::getUpdateTime);
        Page<CommunityReport> page = communityReportDao.selectPage(new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<CommunityReportAdminVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(this::toReportAdminVO).toList());
        return result;
    }

    @Override
    @Transactional
    public void handleReport(Long id, CommunityReportHandleReq req) {
        CommunityReport report = requireReport(id);
        // 幂等性保护：仅待处理状态的举报单可处理
        if (!CommunityReportStatusEnum.PENDING.getCode().equals(report.getStatus())) {
            throw new BusinessException("该举报单已处理，请勿重复操作");
        }
        CommunityReportStatusEnum status = CommunityReportStatusEnum.getByCode(req.getStatus());
        if (status == null) {
            throw new BusinessException("不支持的举报状态");
        }
        report.setStatus(status.getCode());
        report.setHandleAction(StrUtil.blankToDefault(StrUtil.trim(req.getHandleAction()), null));
        report.setHandleRemark(StrUtil.blankToDefault(StrUtil.trim(req.getHandleRemark()), null));
        report.setHandlerId(UserContextHolder.get() != null ? UserContextHolder.get().getId() : null);

        if (CommunityReportStatusEnum.RESOLVED.equals(status)
                && StrUtil.isNotBlank(req.getHandleAction())) {
            applyHandleAction(report.getTargetType(), report.getTargetId(), req.getHandleAction());
        }
        communityReportDao.updateById(report);
        writeLog("COMMUNITY_REPORT", report.getId(), "HANDLE", null, status.getCode());
    }

    @Override
    public List<AppConfigVO> getCommunityConfigs() {
        Map<String, AppConfig> configMap = appConfigDao.selectByKeys(List.of(
                CommunityConfigKeys.INTERACTION_GATE_MODE,
                CommunityConfigKeys.POST_MAX_IMAGES,
                CommunityConfigKeys.POST_MAX_TEXT_LENGTH,
                CommunityConfigKeys.POST_MAX_MENTIONS,
                CommunityConfigKeys.SINCERE_POST_MIN_TEXT_LENGTH,
                CommunityConfigKeys.CONTACT_INFO_ALLOWED,
                CommunityConfigKeys.REPORT_ENTRY_ENABLED
        )).stream().collect(Collectors.toMap(AppConfig::getConfigKey, item -> item, (a, b) -> a));

        return List.of(
                toConfigVO(configMap, CommunityConfigKeys.INTERACTION_GATE_MODE, ConfigTypeEnum.TEXT.getCode(), CommunityGateModeEnum.LOGIN_ONLY.getCode(), "COMMUNITY", "互动准入模式"),
                toConfigVO(configMap, CommunityConfigKeys.POST_MAX_IMAGES, ConfigTypeEnum.NUMBER.getCode(), "9", "COMMUNITY", "动态图片上限"),
                toConfigVO(configMap, CommunityConfigKeys.POST_MAX_TEXT_LENGTH, ConfigTypeEnum.NUMBER.getCode(), "500", "COMMUNITY", "动态文字上限"),
                toConfigVO(configMap, CommunityConfigKeys.POST_MAX_MENTIONS, ConfigTypeEnum.NUMBER.getCode(), "5", "COMMUNITY", "@用户人数上限"),
                toConfigVO(configMap, CommunityConfigKeys.SINCERE_POST_MIN_TEXT_LENGTH, ConfigTypeEnum.NUMBER.getCode(), "20", "COMMUNITY", "诚意贴正文下限"),
                toConfigVO(configMap, CommunityConfigKeys.CONTACT_INFO_ALLOWED, ConfigTypeEnum.BOOLEAN.getCode(), "false", "COMMUNITY", "诚意贴联系方式开关"),
                toConfigVO(configMap, CommunityConfigKeys.REPORT_ENTRY_ENABLED, ConfigTypeEnum.BOOLEAN.getCode(), "true", "COMMUNITY", "举报入口开关")
        );
    }

    @Override
    @Transactional
    public void saveCommunityConfigs(AppConfigBatchReq req) {
        for (AppConfigBatchReq.AppConfigItem item : req.getItems()) {
            AppConfig entity = new AppConfig();
            entity.setConfigKey(item.getConfigKey());
            entity.setConfigValue(item.getConfigValue());
            entity.setConfigGroup(item.getConfigGroup());
            entity.setConfigType(item.getConfigType());
            entity.setPublicVisible(item.getPublicVisible());
            entity.setStatus(item.getStatus());
            entity.setRemark(item.getRemark());
            appConfigDao.upsert(entity);
        }
        writeLog("COMMUNITY_CONFIG", null, "BATCH_SAVE", null, String.valueOf(req.getItems().size()));
    }

    @Override
    public List<MobileEntryConfigVO> getHomeTabs() {
        return mobileEntryConfigDao.selectByPageCode(MobilePageCodeEnum.COMMUNITY_HOME_TAB.getCode())
                .stream().map(this::toMobileEntryVO).toList();
    }

    private void applyHandleAction(String targetType, Long targetId, String actionCode) {
        CommunityReportHandleActionEnum action = CommunityReportHandleActionEnum.getByCode(actionCode);
        if (action == null) {
            throw new BusinessException("不支持的处理动作");
        }
        // 匹配动作与目标类型，执行对应处理
        if (CommunityReportHandleActionEnum.BLOCK_POST.equals(action)) {
            if (!CommunityReportTargetTypeEnum.POST.getCode().equals(targetType)) {
                throw new BusinessException("当前举报目标不是动态，无法执行下架操作");
            }
            CommunityPost post = requirePost(targetId);
            post.setStatus(CommunityPostStatusEnum.BLOCKED.getCode());
            communityPostDao.updateById(post);
            return;
        }
        if (CommunityReportHandleActionEnum.BLOCK_COMMENT.equals(action)) {
            if (!CommunityReportTargetTypeEnum.COMMENT.getCode().equals(targetType)) {
                throw new BusinessException("当前举报目标不是评论，无法执行屏蔽操作");
            }
            CommunityComment comment = requireComment(targetId);
            comment.setStatus(CommunityPostStatusEnum.BLOCKED.getCode());
            communityCommentDao.updateById(comment);
            return;
        }
        if (CommunityReportHandleActionEnum.DISMISS.equals(action)) {
            // 驳回举报无需操作目标内容
            return;
        }
        // WARN_USER 等动作当前阶段仅记录，不操作目标内容（通知系统将在 PRD-03 落地后接入）
        if (CommunityReportHandleActionEnum.WARN_USER.equals(action)) {
            return;
        }
        throw new BusinessException("不支持的动作与目标组合");
    }

    private CommunityPost requirePost(Long id) {
        CommunityPost post = communityPostDao.selectById(id);
        if (post == null) {
            throw new BusinessException("内容不存在");
        }
        return post;
    }

    private CommunityComment requireComment(Long id) {
        CommunityComment comment = communityCommentDao.selectById(id);
        if (comment == null) {
            throw new BusinessException("评论不存在");
        }
        return comment;
    }

    private CommunityReport requireReport(Long id) {
        CommunityReport report = communityReportDao.selectById(id);
        if (report == null) {
            throw new BusinessException("举报单不存在");
        }
        return report;
    }

    private CommunityPostAdminVO toPostAdminVO(CommunityPost entity) {
        CommunityPostAdminVO vo = new CommunityPostAdminVO();
        SysUser author = userDao.selectById(entity.getAuthorId());
        vo.setId(entity.getId());
        vo.setAuthorId(entity.getAuthorId());
        vo.setAuthorName(author != null ? author.getNickname() : null);
        vo.setAuthorPhone(author != null ? DesensitizeUtil.maskPhone(author.getPhone()) : null);
        vo.setPostType(entity.getPostType());
        vo.setTitle(entity.getTitle());
        vo.setContent(entity.getContent());
        vo.setTopicId(entity.getTopicId());
        vo.setTopicName(resolveDictLabel(entity.getTopicId()));
        vo.setLikeCount(entity.getLikeCount());
        vo.setCommentCount(entity.getCommentCount());
        vo.setReportCount(entity.getReportCount());
        vo.setStatus(entity.getStatus());
        vo.setAuditStatus(entity.getAuditStatus());
        vo.setAuditRemark(entity.getAuditRemark());
        vo.setCreateTime(entity.getCreateTime() != null ? entity.getCreateTime().format(FMT) : null);
        vo.setUpdateTime(entity.getUpdateTime() != null ? entity.getUpdateTime().format(FMT) : null);
        return vo;
    }

    private CommunityCommentAdminVO toCommentAdminVO(CommunityComment entity) {
        CommunityCommentAdminVO vo = new CommunityCommentAdminVO();
        SysUser author = userDao.selectById(entity.getAuthorId());
        SysUser replyUser = entity.getReplyUserId() != null ? userDao.selectById(entity.getReplyUserId()) : null;
        vo.setId(entity.getId());
        vo.setPostId(entity.getPostId());
        vo.setAuthorId(entity.getAuthorId());
        vo.setAuthorName(author != null ? author.getNickname() : null);
        vo.setAuthorPhone(author != null ? DesensitizeUtil.maskPhone(author.getPhone()) : null);
        vo.setParentCommentId(entity.getParentCommentId());
        vo.setReplyUserId(entity.getReplyUserId());
        vo.setReplyUserName(replyUser != null ? replyUser.getNickname() : null);
        vo.setContent(entity.getContent());
        vo.setReportCount(entity.getReportCount());
        vo.setStatus(entity.getStatus());
        vo.setAuditStatus(entity.getAuditStatus());
        vo.setAuditRemark(entity.getAuditRemark());
        vo.setCreateTime(entity.getCreateTime() != null ? entity.getCreateTime().format(FMT) : null);
        vo.setUpdateTime(entity.getUpdateTime() != null ? entity.getUpdateTime().format(FMT) : null);
        return vo;
    }

    private CommunityReportAdminVO toReportAdminVO(CommunityReport entity) {
        CommunityReportAdminVO vo = new CommunityReportAdminVO();
        SysUser reporter = userDao.selectById(entity.getReporterId());
        SysUser handler = entity.getHandlerId() != null ? userDao.selectById(entity.getHandlerId()) : null;
        vo.setId(entity.getId());
        vo.setReporterId(entity.getReporterId());
        vo.setReporterName(reporter != null ? reporter.getNickname() : null);
        vo.setReporterPhone(reporter != null ? DesensitizeUtil.maskPhone(reporter.getPhone()) : null);
        vo.setTargetType(entity.getTargetType());
        vo.setTargetId(entity.getTargetId());
        vo.setReasonCode(entity.getReasonCode());
        vo.setReasonLabel(resolveDictLabel("community_report_reason", entity.getReasonCode()));
        vo.setExtraText(entity.getExtraText());
        vo.setStatus(entity.getStatus());
        vo.setHandleAction(entity.getHandleAction());
        vo.setHandleRemark(entity.getHandleRemark());
        vo.setHandlerId(entity.getHandlerId());
        vo.setHandlerName(handler != null ? handler.getNickname() : null);
        vo.setCreateTime(entity.getCreateTime() != null ? entity.getCreateTime().format(FMT) : null);
        vo.setUpdateTime(entity.getUpdateTime() != null ? entity.getUpdateTime().format(FMT) : null);
        return vo;
    }

    private AppConfigVO toConfigVO(Map<String, AppConfig> configMap, String key, String type, String defaultValue, String group, String remark) {
        AppConfig entity = configMap.get(key);
        AppConfigVO vo = new AppConfigVO();
        vo.setId(entity != null ? entity.getId() : null);
        vo.setConfigKey(key);
        vo.setConfigValue(entity != null ? entity.getConfigValue() : defaultValue);
        vo.setConfigGroup(entity != null ? entity.getConfigGroup() : group);
        vo.setConfigType(entity != null ? entity.getConfigType() : type);
        vo.setPublicVisible(entity != null && entity.getPublicVisible() != null ? entity.getPublicVisible() : 1);
        vo.setStatus(entity != null ? entity.getStatus() : CommonStatusEnum.ENABLED.getCode());
        vo.setRemark(entity != null && StrUtil.isNotBlank(entity.getRemark()) ? entity.getRemark() : remark);
        vo.setUpdateTime(entity != null && entity.getUpdateTime() != null ? entity.getUpdateTime().format(FMT) : null);
        return vo;
    }

    private MobileEntryConfigVO toMobileEntryVO(MobileEntryConfig entity) {
        MobileEntryConfigVO vo = new MobileEntryConfigVO();
        vo.setId(entity.getId());
        vo.setPageCode(entity.getPageCode());
        vo.setEntryKey(entity.getEntryKey());
        vo.setEntryName(entity.getEntryName());
        vo.setIcon(entity.getIcon());
        vo.setJumpType(entity.getJumpType());
        vo.setJumpTarget(entity.getJumpTarget());
        vo.setBadgeText(entity.getBadgeText());
        vo.setBadgeType(entity.getBadgeType());
        vo.setLoginRequired(entity.getLoginRequired());
        vo.setSort(entity.getSort());
        vo.setStatus(entity.getStatus());
        vo.setExtraJson(entity.getExtraJson());
        vo.setCreateTime(entity.getCreateTime() != null ? entity.getCreateTime().format(FMT) : null);
        return vo;
    }

    private String resolveDictLabel(Long id) {
        if (id == null) {
            return null;
        }
        SysDictData item = dictDataDao.selectById(id);
        return item != null ? item.getDictLabel() : null;
    }

    private String resolveDictLabel(String dictType, String dictValue) {
        if (StrUtil.isBlank(dictValue)) {
            return null;
        }
        List<SysDictData> items = dictDataDao.selectByDictType(dictType);
        return items.stream()
                .filter(item -> Objects.equals(item.getDictValue(), dictValue))
                .map(SysDictData::getDictLabel)
                .findFirst()
                .orElse(dictValue);
    }

    private void writeLog(String bizType, Long bizId, String action, String beforeValue, String afterValue) {
        ContentOperationLog log = new ContentOperationLog();
        log.setBizType(bizType);
        log.setBizId(bizId);
        log.setAction(action);
        log.setBeforeValue(beforeValue);
        log.setAfterValue(afterValue);
        contentOperationLogDao.insert(log);
    }
}
