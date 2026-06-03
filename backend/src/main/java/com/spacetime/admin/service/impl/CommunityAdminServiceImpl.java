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
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
@RequiredArgsConstructor
public class CommunityAdminServiceImpl implements CommunityAdminService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /** 社区动态数据访问对象 */
    private final CommunityPostDao communityPostDao;
    /** 社区评论数据访问对象 */
    private final CommunityCommentDao communityCommentDao;
    /** 社区举报数据访问对象 */
    private final CommunityReportDao communityReportDao;
    /** 应用配置数据访问对象 */
    private final AppConfigDao appConfigDao;
    /** 移动端入口配置数据访问对象 */
    private final MobileEntryConfigDao mobileEntryConfigDao;
    /** 字典数据访问对象 */
    private final DictDataDao dictDataDao;
    /** 用户数据访问对象 */
    private final UserDao userDao;
    /** 内容操作日志数据访问对象 */
    private final ContentOperationLogDao contentOperationLogDao;

    /**
     * 分页查询动态列表，支持按作者、类型、状态、审核状态、话题、关键词筛选
     * @param req 动态分页查询请求
     * @return 动态分页数据
     */
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

    /**
     * 查询动态详情（含作者信息）
     * @param id 动态ID
     * @return 动态详情
     */
    @Override
    public CommunityPostAdminVO getPostDetail(Long id) {
        return toPostAdminVO(requirePost(id));
    }

    /**
     * 审核动态（通过/驳回），审核通过后状态变为已发布，驳回后变为已拒绝
     * @param id 动态ID
     * @param req 审核请求
     */
    @Override
    @Transactional
    public void auditPost(Long id, CommunityPostAuditReq req) {
        CommunityPost post = requirePost(id);
        CommunityAuditStatusEnum auditStatus = CommunityAuditStatusEnum.getByCode(req.getAuditStatus());
        if (auditStatus == null) {
            throw new BusinessException("不支持的审核状态");
        }
        // 设置审核信息
        post.setAuditStatus(auditStatus.getCode());
        post.setAuditRemark(StrUtil.blankToDefault(StrUtil.trim(req.getAuditRemark()), null));
        // 根据审核结果更新发布状态：通过→已发布，驳回→已拒绝
        post.setStatus(CommunityAuditStatusEnum.APPROVED.equals(auditStatus)
                ? CommunityPostStatusEnum.PUBLISHED.getCode()
                : CommunityPostStatusEnum.REJECTED.getCode());
        communityPostDao.updateById(post);
        // 记录操作日志
        writeLog("COMMUNITY_POST", post.getId(), "AUDIT", null, auditStatus.getCode());
        log.info("审核{}: postId={}, auditStatus={}", CommunityAuditStatusEnum.APPROVED.equals(auditStatus) ? "通过" : "驳回", id, auditStatus.getCode());
    }

    /**
     * 分页查询评论列表，支持按动态、作者、状态、审核状态、关键词筛选
     * @param req 评论分页查询请求
     * @return 评论分页数据
     */
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

    /**
     * 审核评论（通过/驳回），审核通过后状态变为已发布，驳回后变为已拒绝
     * @param id 评论ID
     * @param req 审核请求
     */
    @Override
    @Transactional
    public void auditComment(Long id, CommunityCommentAuditReq req) {
        CommunityComment comment = requireComment(id);
        CommunityAuditStatusEnum auditStatus = CommunityAuditStatusEnum.getByCode(req.getAuditStatus());
        if (auditStatus == null) {
            throw new BusinessException("不支持的审核状态");
        }
        // 设置审核信息
        comment.setAuditStatus(auditStatus.getCode());
        comment.setAuditRemark(StrUtil.blankToDefault(StrUtil.trim(req.getAuditRemark()), null));
        // 根据审核结果更新发布状态：通过→已发布，驳回→已拒绝
        comment.setStatus(CommunityAuditStatusEnum.APPROVED.equals(auditStatus)
                ? CommunityPostStatusEnum.PUBLISHED.getCode()
                : CommunityPostStatusEnum.REJECTED.getCode());
        communityCommentDao.updateById(comment);
        // 记录操作日志
        writeLog("COMMUNITY_COMMENT", comment.getId(), "AUDIT", null, auditStatus.getCode());
        log.info("审核{}: commentId={}, auditStatus={}", CommunityAuditStatusEnum.APPROVED.equals(auditStatus) ? "通过" : "驳回", id, auditStatus.getCode());
    }

    /**
     * 分页查询举报列表，支持按举报人、目标类型、状态、原因类别筛选
     * @param req 举报分页查询请求
     * @return 举报分页数据
     */
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

    /**
     * 处理举报：校验状态 → 设置处理信息 → 执行处理动作 → 更新举报单 → 记录日志
     * @param id 举报ID
     * @param req 举报处理请求
     */
    @Override
    @Transactional
    public void handleReport(Long id, CommunityReportHandleReq req) {
        // 1. 校验状态：幂等性保护，仅待处理状态的举报单可处理
        CommunityReport report = requireReport(id);
        if (!CommunityReportStatusEnum.PENDING.getCode().equals(report.getStatus())) {
            throw new BusinessException("该举报单已处理，请勿重复操作");
        }
        CommunityReportStatusEnum status = CommunityReportStatusEnum.getByCode(req.getStatus());
        if (status == null) {
            throw new BusinessException("不支持的举报状态");
        }

        // 2. 设置处理信息
        report.setStatus(status.getCode());
        report.setHandleAction(StrUtil.blankToDefault(StrUtil.trim(req.getHandleAction()), null));
        report.setHandleRemark(StrUtil.blankToDefault(StrUtil.trim(req.getHandleRemark()), null));
        report.setHandlerId(UserContextHolder.get() != null ? UserContextHolder.get().getId() : null);

        // 3. 执行处理动作：已解决且有处理动作时，对目标内容执行对应操作
        if (CommunityReportStatusEnum.RESOLVED.equals(status)
                && StrUtil.isNotBlank(req.getHandleAction())) {
            applyHandleAction(report.getTargetType(), report.getTargetId(), req.getHandleAction());
        }

        // 4. 更新举报单
        communityReportDao.updateById(report);

        // 5. 记录日志
        writeLog("COMMUNITY_REPORT", report.getId(), "HANDLE", null, status.getCode());
        log.info("处理举报: reportId={}, status={}, handleAction={}", id, status.getCode(), req.getHandleAction());
    }

    /**
     * 查询社区配置列表（互动准入、动态上限、举报入口等 7 项配置）
     * @return 配置列表
     */
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

    /**
     * 批量保存社区配置（逐一 upsert）
     * @param req 配置批量保存请求
     */
    @Override
    @Transactional
    public void saveCommunityConfigs(AppConfigBatchReq req) {
        // 1. 逐一 upsert 每项配置
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
        // 2. 记录操作日志
        writeLog("COMMUNITY_CONFIG", null, "BATCH_SAVE", null, String.valueOf(req.getItems().size()));
        log.info("批量保存社区配置: itemCount={}", req.getItems().size());
    }

    /**
     * 查询社区首页Tab配置（基于 COMMUNITY_HOME_TAB 页面编码）
     * @return 移动端入口配置列表
     */
    @Override
    public List<MobileEntryConfigVO> getHomeTabs() {
        return mobileEntryConfigDao.selectByPageCode(MobilePageCodeEnum.COMMUNITY_HOME_TAB.getCode())
                .stream().map(this::toMobileEntryVO).toList();
    }

    /**
     * 根据处理动作代码对目标内容执行对应操作
     * @param targetType 举报目标类型（动态/评论）
     * @param targetId 目标ID
     * @param actionCode 处理动作代码
     */
    private void applyHandleAction(String targetType, Long targetId, String actionCode) {
        CommunityReportHandleActionEnum action = CommunityReportHandleActionEnum.getByCode(actionCode);
        if (action == null) {
            throw new BusinessException("不支持的处理动作");
        }
        // BLOCK_POST：下架动态，校验目标类型必须为动态
        if (CommunityReportHandleActionEnum.BLOCK_POST.equals(action)) {
            if (!CommunityReportTargetTypeEnum.POST.getCode().equals(targetType)) {
                throw new BusinessException("当前举报目标不是动态，无法执行下架操作");
            }
            CommunityPost post = requirePost(targetId);
            post.setStatus(CommunityPostStatusEnum.BLOCKED.getCode());
            communityPostDao.updateById(post);
            log.info("下架动态: postId={}", targetId);
            return;
        }
        // BLOCK_COMMENT：屏蔽评论，校验目标类型必须为评论
        if (CommunityReportHandleActionEnum.BLOCK_COMMENT.equals(action)) {
            if (!CommunityReportTargetTypeEnum.COMMENT.getCode().equals(targetType)) {
                throw new BusinessException("当前举报目标不是评论，无法执行屏蔽操作");
            }
            CommunityComment comment = requireComment(targetId);
            comment.setStatus(CommunityPostStatusEnum.BLOCKED.getCode());
            communityCommentDao.updateById(comment);
            log.info("屏蔽评论: commentId={}", targetId);
            return;
        }
        // DISMISS：驳回举报无需操作目标内容
        if (CommunityReportHandleActionEnum.DISMISS.equals(action)) {
            log.info("驳回举报: targetType={}, targetId={}", targetType, targetId);
            return;
        }
        // WARN_USER：警告用户，当前阶段仅记录，不操作目标内容（通知系统将在 PRD-03 落地后接入）
        if (CommunityReportHandleActionEnum.WARN_USER.equals(action)) {
            log.info("警告用户: targetType={}, targetId={}", targetType, targetId);
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
