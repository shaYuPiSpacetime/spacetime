package com.spacetime.admin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.admin.dto.request.GlobalSendSwitchReq;
import com.spacetime.admin.dto.request.MessageConfigPublishReq;
import com.spacetime.admin.dto.request.MessageTemplatePageReq;
import com.spacetime.admin.dto.request.MessageTemplatePublishReq;
import com.spacetime.admin.dto.response.MessageConfigVO;
import com.spacetime.admin.dto.response.ContentOperationLogVO;
import com.spacetime.admin.dto.response.MessageRuntimeControlVO;
import com.spacetime.admin.dto.response.MessageTemplateVO;
import com.spacetime.admin.service.MessageConfigAdminService;
import com.spacetime.common.dao.AppMessageRuleVersionDao;
import com.spacetime.common.dao.AppMessageRuntimeControlDao;
import com.spacetime.common.dao.AppMessageTemplateVersionDao;
import com.spacetime.common.dao.ContentOperationLogDao;
import com.spacetime.common.dao.MenuDao;
import com.spacetime.common.entity.AppMessageRuleVersion;
import com.spacetime.common.entity.AppMessageRuntimeControl;
import com.spacetime.common.entity.AppMessageTemplateVersion;
import com.spacetime.common.entity.ContentOperationLog;
import com.spacetime.common.dto.PageReq;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.exception.ForbiddenException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** 消息配置与模板不可变版本实现。 */
@Service
@RequiredArgsConstructor
public class MessageConfigAdminServiceImpl implements MessageConfigAdminService {
    private static final String GLOBAL_SCOPE = "global";
    private static final String GLOBAL_SEND = "global_send_enabled";
    private static final DateTimeFormatter VERSION_TIME = DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS");
    private static final DateTimeFormatter DISPLAY_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final Pattern VARIABLE = Pattern.compile("\\{\\{([A-Za-z0-9_]+)}}");
    private static final Set<String> NOTIFICATION_TYPES = Set.of(
            "governance", "asset", "invite", "community", "platform", "assistant");
    private static final Set<String> SYSTEM_JUMP_TYPES = Set.of(
            "none", "miniapp", "h5", "service", "chat", "profile", "community",
            "auth_center", "asset", "invite_center", "appeal");
    private static final Set<String> ASSISTANT_ACTION_TYPES = Set.of(
            "none", "h5", "wechat_service", "help");
    private static final Set<String> ASSISTANT_CARD_TYPES = Set.of("text", "action", "tip");
    private static final Set<String> CONTENT_FORMATS = Set.of("plain_text", "rich_text");

    private final AppMessageRuleVersionDao ruleDao;
    private final AppMessageRuntimeControlDao runtimeDao;
    private final AppMessageTemplateVersionDao templateDao;
    private final ContentOperationLogDao operationLogDao;
    private final MenuDao menuDao;
    private final ObjectMapper objectMapper;

    @Value("${message.security.allowed-h5-hosts:}")
    private String allowedH5Hosts;

    @Override
    public MessageConfigVO getConfig() {
        AppMessageRuleVersion current = ruleDao.selectCurrent(GLOBAL_SCOPE);
        if (current == null) throw new BusinessException(30024, "消息规则当前版本不存在");
        return toConfigVO(current, runtimeDao.selectByControlKey(GLOBAL_SEND));
    }

    @Override
    @Transactional
    public MessageConfigVO publishVersion(MessageConfigPublishReq req) {
        AppMessageRuleVersion current = ruleDao.selectCurrent(GLOBAL_SCOPE);
        if (current == null || !Objects.equals(current.getVersionNo(), req.getExpectedVersion())) {
            throw new BusinessException(30020, "消息配置版本已变化，请刷新后重试");
        }
        validateRetention(req);
        LocalDateTime now = LocalDateTime.now();
        if (ruleDao.retireCurrent(current.getId()) != 1) {
            throw new BusinessException(30020, "消息配置版本已变化，请刷新后重试");
        }

        AppMessageRuleVersion next = new AppMessageRuleVersion();
        next.setVersionNo(versionNo("MSG-CFG", now));
        next.setScopeCode(GLOBAL_SCOPE);
        next.setStatus("published");
        next.setActiveMarker(1);
        next.setFemaleProtectionEnabled(Boolean.TRUE.equals(req.getFemaleProtectionEnabled()) ? 1 : 0);
        next.setFemaleProtectionDays(req.getFemaleProtectionDays());
        next.setWhisperExpireDays(req.getWhisperExpireDays());
        next.setWhisperCooldownDays(req.getWhisperCooldownDays());
        next.setOrdinaryMessageRetainDays(req.getOrdinaryMessageRetainDays());
        next.setSystemMessageVisibleDays(req.getSystemMessageVisibleDays());
        next.setReportEvidenceRetainDays(req.getReportEvidenceRetainDays());
        next.setSevereEvidenceRetainDays(req.getSevereEvidenceRetainDays());
        next.setSensitiveAuditRetainDays(req.getSensitiveAuditRetainDays());
        next.setRemark(req.getRemark().trim());
        next.setPublishedBy(currentOperatorId());
        next.setPublishedAt(now);
        ruleDao.insert(next);
        writeLog("MESSAGE_CONFIG", current.getId(), "PUBLISH_VERSION", current, next, req.getRemark());
        return toConfigVO(next, runtimeDao.selectByControlKey(GLOBAL_SEND));
    }

    @Override
    @Transactional
    public MessageRuntimeControlVO updateGlobalSend(GlobalSendSwitchReq req) {
        requireRiskOperator();
        AppMessageRuntimeControl current = runtimeDao.selectByControlKeyForUpdate(GLOBAL_SEND);
        if (current == null || !Objects.equals(current.getVersion(), req.getExpectedVersion())) {
            throw new BusinessException(30020, "全局发送开关版本已变化，请刷新后重试");
        }
        AppMessageRuntimeControl before = copyRuntime(current);
        LocalDateTime now = LocalDateTime.now();
        current.setEnabled(Boolean.TRUE.equals(req.getEnabled()) ? 1 : 0);
        current.setVersion(current.getVersion() + 1);
        current.setReason(req.getReason().trim());
        current.setChangedBy(currentOperatorId());
        current.setChangedAt(now);
        if (runtimeDao.updateByVersion(current, req.getExpectedVersion()) != 1) {
            throw new BusinessException(30020, "全局发送开关版本冲突");
        }
        writeLog("MESSAGE_RUNTIME", current.getId(), "GLOBAL_SEND_SWITCH", before, current,
                req.getReason());
        return toRuntimeVO(current);
    }

    @Override
    public Page<ContentOperationLogVO> logs(PageReq req) {
        LambdaQueryWrapper<ContentOperationLog> wrapper = new LambdaQueryWrapper<>();
        wrapper.in(ContentOperationLog::getBizType,
                List.of("MESSAGE_CONFIG", "MESSAGE_RUNTIME", "MESSAGE_TEMPLATE"));
        wrapper.orderByDesc(ContentOperationLog::getCreateTime);
        Page<ContentOperationLog> page = operationLogDao.selectPage(
                new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<ContentOperationLogVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(this::toLogVO).toList());
        return result;
    }

    @Override
    public Page<MessageTemplateVO> templates(MessageTemplatePageReq req) {
        LambdaQueryWrapper<AppMessageTemplateVersion> wrapper = new LambdaQueryWrapper<>();
        wrapper.like(StringUtils.hasText(req.getTemplateCode()),
                AppMessageTemplateVersion::getTemplateCode, req.getTemplateCode());
        wrapper.eq(StringUtils.hasText(req.getBizType()), AppMessageTemplateVersion::getBizType,
                req.getBizType());
        wrapper.eq(StringUtils.hasText(req.getNotificationType()),
                AppMessageTemplateVersion::getNotificationType, req.getNotificationType());
        wrapper.eq(StringUtils.hasText(req.getStatus()), AppMessageTemplateVersion::getStatus,
                req.getStatus());
        wrapper.eq(Boolean.TRUE.equals(req.getCurrentOnly()), AppMessageTemplateVersion::getActiveMarker, 1);
        wrapper.orderByDesc(AppMessageTemplateVersion::getPublishedAt)
                .orderByDesc(AppMessageTemplateVersion::getId);
        Page<AppMessageTemplateVersion> page = templateDao.selectPage(
                new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<MessageTemplateVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(this::toTemplateVO).toList());
        return result;
    }

    @Override
    @Transactional
    public MessageTemplateVO publishTemplate(String templateCode, MessageTemplatePublishReq req) {
        if (!StringUtils.hasText(templateCode) || templateCode.length() > 64) {
            throw new BusinessException(4001, "模板编码不合法");
        }
        validateTemplate(req);
        AppMessageTemplateVersion current = templateDao.selectCurrent(templateCode);
        String expected = StringUtils.hasText(req.getExpectedVersion()) ? req.getExpectedVersion().trim() : null;
        if ((current == null && expected != null)
                || (current != null && !Objects.equals(current.getVersionNo(), expected))) {
            throw new BusinessException(30020, "消息模板版本已变化，请刷新后重试");
        }
        if (current != null) {
            current.setStatus("retired");
            current.setActiveMarker(null);
            templateDao.updateById(current);
        }
        LocalDateTime now = LocalDateTime.now();
        AppMessageTemplateVersion next = new AppMessageTemplateVersion();
        next.setTemplateCode(templateCode.trim());
        next.setBizType(req.getBizType().trim());
        next.setNotificationType(req.getNotificationType().trim());
        next.setVersionNo(versionNo("TPL", now));
        next.setStatus("published");
        next.setActiveMarker(1);
        next.setTitleTemplate(req.getTitleTemplate().trim());
        next.setContentTemplate(req.getContentTemplate().trim());
        next.setCardType(resolveCardType(req));
        next.setContentFormat(resolveContentFormat(req));
        next.setActionTextTemplate(blankToNull(req.getActionTextTemplate()));
        next.setAllowedVariablesJson(writeJson(req.getAllowedVariables()));
        next.setJumpType(req.getJumpType().trim());
        next.setJumpValueTemplate(blankToNull(req.getJumpValueTemplate()));
        next.setSafetyRequired(Boolean.TRUE.equals(req.getSafetyRequired()) ? 1 : 0);
        next.setPublishedBy(currentOperatorId());
        next.setPublishedAt(now);
        next.setRemark(req.getRemark().trim());
        templateDao.insert(next);
        writeLog("MESSAGE_TEMPLATE", current == null ? null : current.getId(),
                "PUBLISH_VERSION", current, next, req.getRemark());
        return toTemplateVO(next);
    }

    private void validateRetention(MessageConfigPublishReq req) {
        if (req.getSevereEvidenceRetainDays() < req.getReportEvidenceRetainDays()) {
            throw new BusinessException(4001, "严重违规证据保留期不能短于普通举报证据");
        }
    }

    private void validateTemplate(MessageTemplatePublishReq req) {
        if (!NOTIFICATION_TYPES.contains(req.getNotificationType())) {
            throw new BusinessException(4001, "通知分类不合法");
        }
        Set<String> allowedJumpTypes = "assistant".equals(req.getNotificationType())
                ? ASSISTANT_ACTION_TYPES : SYSTEM_JUMP_TYPES;
        if (!allowedJumpTypes.contains(req.getJumpType())) {
            throw new BusinessException(4001, "模板跳转类型不合法");
        }
        Set<String> allowed = new HashSet<>(req.getAllowedVariables());
        if (allowed.size() != req.getAllowedVariables().size()
                || allowed.stream().anyMatch(value -> value == null || !value.matches("[A-Za-z0-9_]+"))) {
            throw new BusinessException(4001, "模板变量白名单不合法");
        }
        Set<String> used = new HashSet<>();
        collectVariables(req.getTitleTemplate(), used);
        collectVariables(req.getContentTemplate(), used);
        collectVariables(req.getActionTextTemplate(), used);
        collectVariables(req.getJumpValueTemplate(), used);
        if (!allowed.containsAll(used)) {
            throw new BusinessException(4001, "模板使用了未授权变量");
        }
        if ("none".equals(req.getJumpType()) && StringUtils.hasText(req.getJumpValueTemplate())) {
            throw new BusinessException(4001, "无跳转模板不能配置跳转值");
        }
        if ("none".equals(req.getJumpType()) && StringUtils.hasText(req.getActionTextTemplate())) {
            throw new BusinessException(4001, "无跳转模板不能配置行动文案");
        }
        if (StringUtils.hasText(req.getActionTextTemplate())
                && req.getActionTextTemplate().codePointCount(
                        0, req.getActionTextTemplate().length()) > 10) {
            throw new BusinessException(4001, "消息行动文案不能超过10个字符");
        }
        String cardType = resolveCardType(req);
        if ("assistant".equals(req.getNotificationType())
                && !ASSISTANT_CARD_TYPES.contains(cardType)) {
            throw new BusinessException(4001, "官方助手卡片类型不合法");
        }
        if (!CONTENT_FORMATS.contains(resolveContentFormat(req))) {
            throw new BusinessException(4001, "系统消息正文格式不合法");
        }
        validateH5(req.getJumpType(), req.getJumpValueTemplate());
    }

    private String resolveCardType(MessageTemplatePublishReq req) {
        if (StringUtils.hasText(req.getCardType())) {
            return req.getCardType().trim();
        }
        return "none".equals(req.getJumpType()) ? "text" : "action";
    }

    private String resolveContentFormat(MessageTemplatePublishReq req) {
        return StringUtils.hasText(req.getContentFormat())
                ? req.getContentFormat().trim() : "plain_text";
    }

    private void validateH5(String jumpType, String jumpValue) {
        if (!"h5".equals(jumpType)) return;
        try {
            URI uri = URI.create(jumpValue);
            Set<String> hosts = new HashSet<>();
            if (StringUtils.hasText(allowedH5Hosts)) {
                for (String host : allowedH5Hosts.split(",")) {
                    if (StringUtils.hasText(host)) hosts.add(host.trim().toLowerCase(Locale.ROOT));
                }
            }
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null
                    || !hosts.contains(uri.getHost().toLowerCase(Locale.ROOT))) {
                throw new BusinessException(4001, "H5跳转域名不在白名单");
            }
        } catch (IllegalArgumentException ex) {
            throw new BusinessException(4001, "H5跳转地址不合法");
        }
    }

    private void collectVariables(String template, Set<String> variables) {
        if (!StringUtils.hasText(template)) return;
        Matcher matcher = VARIABLE.matcher(template);
        while (matcher.find()) variables.add(matcher.group(1));
    }

    private MessageConfigVO toConfigVO(AppMessageRuleVersion entity,
                                        AppMessageRuntimeControl runtime) {
        MessageConfigVO vo = new MessageConfigVO();
        vo.setVersionNo(entity.getVersionNo());
        vo.setScopeCode(entity.getScopeCode());
        vo.setStatus(entity.getStatus());
        vo.setFemaleProtectionEnabled(Integer.valueOf(1).equals(entity.getFemaleProtectionEnabled()));
        vo.setFemaleProtectionDays(entity.getFemaleProtectionDays());
        vo.setWhisperExpireDays(entity.getWhisperExpireDays());
        vo.setWhisperCooldownDays(entity.getWhisperCooldownDays());
        vo.setOrdinaryMessageRetainDays(entity.getOrdinaryMessageRetainDays());
        vo.setSystemMessageVisibleDays(entity.getSystemMessageVisibleDays());
        vo.setReportEvidenceRetainDays(entity.getReportEvidenceRetainDays());
        vo.setSevereEvidenceRetainDays(entity.getSevereEvidenceRetainDays());
        vo.setSensitiveAuditRetainDays(entity.getSensitiveAuditRetainDays());
        vo.setRemark(entity.getRemark());
        vo.setPublishedBy(entity.getPublishedBy());
        vo.setPublishedAt(entity.getPublishedAt());
        vo.setGlobalSend(toRuntimeVO(runtime));
        return vo;
    }

    private MessageRuntimeControlVO toRuntimeVO(AppMessageRuntimeControl entity) {
        if (entity == null) return null;
        MessageRuntimeControlVO vo = new MessageRuntimeControlVO();
        vo.setControlKey(entity.getControlKey());
        vo.setEnabled(Integer.valueOf(1).equals(entity.getEnabled()));
        vo.setVersion(entity.getVersion());
        vo.setReason(entity.getReason());
        vo.setChangedBy(entity.getChangedBy());
        vo.setChangedAt(entity.getChangedAt());
        return vo;
    }

    private MessageTemplateVO toTemplateVO(AppMessageTemplateVersion entity) {
        MessageTemplateVO vo = new MessageTemplateVO();
        vo.setTemplateCode(entity.getTemplateCode());
        vo.setBizType(entity.getBizType());
        vo.setNotificationType(entity.getNotificationType());
        vo.setVersionNo(entity.getVersionNo());
        vo.setStatus(entity.getStatus());
        vo.setCurrent(Integer.valueOf(1).equals(entity.getActiveMarker()));
        vo.setTitleTemplate(entity.getTitleTemplate());
        vo.setContentTemplate(entity.getContentTemplate());
        vo.setCardType(entity.getCardType());
        vo.setContentFormat(entity.getContentFormat());
        vo.setActionTextTemplate(entity.getActionTextTemplate());
        vo.setAllowedVariables(readVariables(entity.getAllowedVariablesJson()));
        vo.setJumpType(entity.getJumpType());
        vo.setJumpValueTemplate(entity.getJumpValueTemplate());
        vo.setSafetyRequired(Integer.valueOf(1).equals(entity.getSafetyRequired()));
        vo.setPublishedBy(entity.getPublishedBy());
        vo.setPublishedAt(entity.getPublishedAt());
        vo.setRemark(entity.getRemark());
        return vo;
    }

    private ContentOperationLogVO toLogVO(ContentOperationLog entity) {
        ContentOperationLogVO vo = new ContentOperationLogVO();
        vo.setId(entity.getId());
        vo.setBizType(entity.getBizType());
        vo.setBizId(entity.getBizId());
        vo.setAction(entity.getAction());
        vo.setBeforeValue(entity.getBeforeValue());
        vo.setAfterValue(entity.getAfterValue());
        vo.setOperatorName(entity.getCreatedBy() == null ? "-" : "管理员 " + entity.getCreatedBy());
        vo.setRemark(entity.getRemark());
        vo.setCreateTime(entity.getCreateTime() == null ? null : entity.getCreateTime().format(DISPLAY_TIME));
        return vo;
    }

    private AppMessageRuntimeControl copyRuntime(AppMessageRuntimeControl source) {
        AppMessageRuntimeControl copy = new AppMessageRuntimeControl();
        copy.setId(source.getId());
        copy.setControlKey(source.getControlKey());
        copy.setEnabled(source.getEnabled());
        copy.setVersion(source.getVersion());
        copy.setReason(source.getReason());
        copy.setChangedBy(source.getChangedBy());
        copy.setChangedAt(source.getChangedAt());
        return copy;
    }

    private String versionNo(String prefix, LocalDateTime now) {
        return prefix + "-" + now.format(VERSION_TIME) + "-"
                + UUID.randomUUID().toString().substring(0, 6).toUpperCase(Locale.ROOT);
    }

    private Long currentOperatorId() {
        UserContext context = UserContextHolder.get();
        if (context == null || context.getId() == null) throw new ForbiddenException("未获取到当前管理员");
        return context.getId();
    }

    private void requireRiskOperator() {
        UserContext context = UserContextHolder.get();
        List<String> roles = context == null ? List.of() : context.getRoles();
        if ((roles == null || roles.isEmpty()) && context != null && context.getId() != null) {
            roles = menuDao.selectRoleCodesByUserId(context.getId());
        }
        boolean allowed = roles != null
                && roles.stream().anyMatch(role -> Set.of(
                        "risk", "risk_control", "super_admin").contains(role.toLowerCase(Locale.ROOT)));
        if (!allowed) throw new ForbiddenException("只有风控或超级管理员可以修改全局发送开关");
    }

    private void writeLog(String bizType, Long bizId, String action, Object before, Object after,
                          String remark) {
        ContentOperationLog log = new ContentOperationLog();
        log.setBizType(bizType);
        log.setBizId(bizId);
        log.setAction(action);
        log.setBeforeValue(writeJson(auditSummary(before)));
        log.setAfterValue(writeJson(auditSummary(after)));
        log.setRemark(remark == null ? null : remark.trim());
        operationLogDao.insert(log);
    }

    private Object auditSummary(Object value) {
        if (value instanceof AppMessageRuleVersion rule) {
            LinkedHashMap<String, Object> summary = new LinkedHashMap<>();
            summary.put("versionNo", rule.getVersionNo());
            summary.put("status", rule.getStatus());
            summary.put("femaleProtectionEnabled", rule.getFemaleProtectionEnabled());
            summary.put("femaleProtectionDays", rule.getFemaleProtectionDays());
            summary.put("whisperExpireDays", rule.getWhisperExpireDays());
            summary.put("whisperCooldownDays", rule.getWhisperCooldownDays());
            summary.put("ordinaryMessageRetainDays", rule.getOrdinaryMessageRetainDays());
            summary.put("systemMessageVisibleDays", rule.getSystemMessageVisibleDays());
            summary.put("reportEvidenceRetainDays", rule.getReportEvidenceRetainDays());
            summary.put("severeEvidenceRetainDays", rule.getSevereEvidenceRetainDays());
            summary.put("sensitiveAuditRetainDays", rule.getSensitiveAuditRetainDays());
            return summary;
        }
        if (value instanceof AppMessageRuntimeControl runtime) {
            return java.util.Map.of(
                    "controlKey", runtime.getControlKey(),
                    "enabled", runtime.getEnabled(),
                    "version", runtime.getVersion(),
                    "reason", Objects.toString(runtime.getReason(), ""));
        }
        if (value instanceof AppMessageTemplateVersion template) {
            LinkedHashMap<String, Object> summary = new LinkedHashMap<>();
            summary.put("templateCode", template.getTemplateCode());
            summary.put("bizType", template.getBizType());
            summary.put("notificationType", template.getNotificationType());
            summary.put("versionNo", template.getVersionNo());
            summary.put("status", template.getStatus());
            summary.put("titleTemplate", template.getTitleTemplate());
            summary.put("contentTemplate", template.getContentTemplate());
            summary.put("allowedVariablesJson", template.getAllowedVariablesJson());
            summary.put("jumpType", template.getJumpType());
            summary.put("jumpValueTemplate", template.getJumpValueTemplate());
            summary.put("safetyRequired", template.getSafetyRequired());
            return summary;
        }
        return value;
    }

    private String writeJson(Object value) {
        if (value == null) return null;
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            throw new BusinessException(30024, "消息配置审计序列化失败");
        }
    }

    private List<String> readVariables(String json) {
        if (!StringUtils.hasText(json)) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception ex) {
            throw new BusinessException(30024, "消息模板变量配置损坏");
        }
    }

    private String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
