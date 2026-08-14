package com.spacetime.common.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.dao.AppAssistantMessageDao;
import com.spacetime.common.dao.AppMessageTemplateVersionDao;
import com.spacetime.common.dao.AppSystemMessageDao;
import com.spacetime.common.entity.AppMessageEventInbox;
import com.spacetime.common.entity.AppMessageTemplateVersion;
import com.spacetime.common.entity.AppSystemMessage;
import com.spacetime.common.entity.AppAssistantMessage;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.model.message.SystemMessageEventPayload;
import com.spacetime.common.service.MessageNotificationDomainService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.util.HtmlUtils;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** 模板白名单渲染并生成系统/助手明文通知。 */
@Service
public class MessageNotificationDomainServiceImpl implements MessageNotificationDomainService {
    private static final Pattern VARIABLE = Pattern.compile("\\{\\{([A-Za-z0-9_]+)}}");
    private static final Set<String> SYSTEM_JUMP_TYPES = Set.of(
            "none", "miniapp", "h5", "service", "chat", "profile", "community",
            "auth_center", "asset", "invite_center", "appeal");
    private static final Set<String> ASSISTANT_ACTION_TYPES = Set.of(
            "none", "h5", "wechat_service", "help");

    private final AppMessageTemplateVersionDao templateDao;
    private final AppSystemMessageDao systemMessageDao;
    private final AppAssistantMessageDao assistantMessageDao;
    private final ObjectMapper objectMapper;
    private final Set<String> allowedH5Hosts;

    public MessageNotificationDomainServiceImpl(
            AppMessageTemplateVersionDao templateDao,
            AppSystemMessageDao systemMessageDao,
            AppAssistantMessageDao assistantMessageDao,
            ObjectMapper objectMapper,
            @Value("${message.security.allowed-h5-hosts:}") String allowedH5Hosts) {
        this.templateDao = templateDao;
        this.systemMessageDao = systemMessageDao;
        this.assistantMessageDao = assistantMessageDao;
        this.objectMapper = objectMapper;
        this.allowedH5Hosts = parseHosts(allowedH5Hosts);
    }

    @Override
    @Transactional
    public String createSystemMessage(AppMessageEventInbox inbox,
                                      SystemMessageEventPayload payload,
                                      LocalDateTime now) {
        requireInbox(inbox, payload);
        AppSystemMessage existing = systemMessageDao.selectByEvent(
                inbox.getProducerEventId(), inbox.getReceiverUserId(), payload.bizType());
        if (existing != null) {
            return existing.getNoticeNo();
        }
        AppMessageTemplateVersion template = templateDao.selectCurrent(payload.templateCode());
        if (template == null || !"published".equals(template.getStatus())
                || !payload.bizType().equals(template.getBizType())
                || "assistant".equals(template.getNotificationType())) {
            throw new BusinessException(30018, "系统消息模板未发布或类型不匹配");
        }
        Map<String, Object> variables = payload.variables() == null ? Map.of() : payload.variables();
        validateVariables(template.getAllowedVariablesJson(), variables);
        String title = render(template.getTitleTemplate(), variables);
        String content = render(template.getContentTemplate(), variables);
        String contentFormat = defaultContentFormat(template.getContentFormat());
        if ("rich_text".equals(contentFormat)) {
            content = Jsoup.clean(content, Safelist.basic().removeTags("img"));
        }
        String jumpValue = StringUtils.hasText(template.getJumpValueTemplate())
                ? render(template.getJumpValueTemplate(), variables) : null;
        String actionText = renderActionText(template, variables);
        validateJump(template.getNotificationType(), template.getJumpType(), jumpValue);
        LocalDateTime effectiveNow = now == null ? LocalDateTime.now() : now;

        AppSystemMessage message = new AppSystemMessage();
        message.setNoticeNo("NTF-" + UUID.randomUUID().toString().replace("-", ""));
        message.setReceiverUserId(inbox.getReceiverUserId());
        message.setProducerEventId(inbox.getProducerEventId());
        message.setNotificationType(template.getNotificationType());
        message.setBizType(payload.bizType());
        message.setBizNo(inbox.getBizNo());
        message.setTemplateCode(template.getTemplateCode());
        message.setTemplateVersion(template.getVersionNo());
        message.setTitleText(title);
        message.setContentText(content);
        message.setContentFormat(contentFormat);
        message.setJumpType(template.getJumpType());
        message.setActionText(actionText);
        message.setJumpValue(jumpValue);
        message.setSafetyRequired(valueOrZero(template.getSafetyRequired()));
        message.setVisibleUntil(payload.visibleUntil() == null
                ? effectiveNow.plusDays(730) : payload.visibleUntil());
        try {
            systemMessageDao.insert(message);
            return message.getNoticeNo();
        } catch (DataIntegrityViolationException ex) {
            AppSystemMessage concurrent = systemMessageDao.selectByEvent(
                    inbox.getProducerEventId(), inbox.getReceiverUserId(), payload.bizType());
            if (concurrent != null) {
                return concurrent.getNoticeNo();
            }
            throw ex;
        }
    }

    @Override
    @Transactional
    public void ensureAssistantMessages(Long userId, LocalDateTime now) {
        if (userId == null) {
            throw new BusinessException(4001, "用户不能为空");
        }
        LocalDateTime effectiveNow = now == null ? LocalDateTime.now() : now;
        for (AppMessageTemplateVersion template
                : templateDao.selectCurrentByNotificationType("assistant")) {
            AppAssistantMessage existing = assistantMessageDao.selectByUserTopicVersion(
                    userId, template.getBizType(), template.getVersionNo());
            if (existing != null) {
                continue;
            }
            validateVariables(template.getAllowedVariablesJson(), Map.of());
            String title = render(template.getTitleTemplate(), Map.of());
            String content = render(template.getContentTemplate(), Map.of());
            String actionText = renderActionText(template, Map.of());
            validateJump(template.getNotificationType(), template.getJumpType(),
                    template.getJumpValueTemplate());
            AppAssistantMessage message = new AppAssistantMessage();
            message.setAssistantMessageNo("AST-" + UUID.randomUUID().toString().replace("-", ""));
            message.setReceiverUserId(userId);
            message.setTopicCode(template.getBizType());
            message.setContentVersion(template.getVersionNo());
            message.setTemplateCode(template.getTemplateCode());
            message.setTemplateVersion(template.getVersionNo());
            message.setTitleText(title);
            message.setContentText(content);
            message.setCardType(defaultCardType(template));
            message.setActionType(template.getJumpType());
            message.setActionText(actionText);
            message.setActionValue(template.getJumpValueTemplate());
            message.setVisibleFrom(effectiveNow);
            try {
                assistantMessageDao.insert(message);
            } catch (DataIntegrityViolationException ex) {
                if (assistantMessageDao.selectByUserTopicVersion(
                        userId, template.getBizType(), template.getVersionNo()) == null) {
                    throw ex;
                }
            }
        }
    }

    private void requireInbox(AppMessageEventInbox inbox, SystemMessageEventPayload payload) {
        if (inbox == null || payload == null || inbox.getReceiverUserId() == null
                || !StringUtils.hasText(inbox.getProducerEventId())
                || !StringUtils.hasText(payload.templateCode())
                || !StringUtils.hasText(payload.bizType())) {
            throw new BusinessException(30018, "系统消息事件载荷不完整");
        }
    }

    private void validateVariables(String schemaJson, Map<String, Object> variables) {
        try {
            JsonNode schema = objectMapper.readTree(schemaJson);
            Set<String> allowed = new HashSet<>();
            Set<String> required = new HashSet<>();
            if (schema.isArray()) {
                schema.forEach(node -> allowed.add(node.asText()));
            } else if (schema.isObject()) {
                schema.fields().forEachRemaining(entry -> {
                    allowed.add(entry.getKey());
                    if (entry.getValue().isBoolean() && entry.getValue().asBoolean()
                            || entry.getValue().path("required").asBoolean(false)) {
                        required.add(entry.getKey());
                    }
                });
            } else {
                throw new IllegalArgumentException("schema type");
            }
            if (!allowed.containsAll(variables.keySet()) || !variables.keySet().containsAll(required)) {
                throw new BusinessException(30018, "系统消息模板变量不符合白名单");
            }
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException(30018, "系统消息模板变量配置无效");
        }
    }

    private String render(String template, Map<String, Object> variables) {
        if (!StringUtils.hasText(template)) {
            throw new BusinessException(30018, "系统消息模板正文为空");
        }
        Matcher matcher = VARIABLE.matcher(template);
        StringBuilder result = new StringBuilder();
        while (matcher.find()) {
            Object value = variables.get(matcher.group(1));
            if (value == null) {
                throw new BusinessException(30018, "系统消息模板缺少必填变量");
            }
            matcher.appendReplacement(result, Matcher.quoteReplacement(
                    HtmlUtils.htmlEscape(String.valueOf(value))));
        }
        matcher.appendTail(result);
        return result.toString();
    }

    private String defaultCardType(AppMessageTemplateVersion template) {
        if (StringUtils.hasText(template.getCardType())) {
            return template.getCardType();
        }
        return "none".equals(template.getJumpType()) ? "text" : "action";
    }

    private String defaultContentFormat(String contentFormat) {
        return StringUtils.hasText(contentFormat) ? contentFormat : "plain_text";
    }

    private String renderActionText(AppMessageTemplateVersion template,
                                    Map<String, Object> variables) {
        String actionText = StringUtils.hasText(template.getActionTextTemplate())
                ? render(template.getActionTextTemplate(), variables)
                : ("none".equals(template.getJumpType()) ? null : "查看详情");
        if (actionText != null && actionText.codePointCount(0, actionText.length()) > 10) {
            throw new BusinessException(30018, "消息行动文案不能超过10个字符");
        }
        return actionText;
    }

    private void validateJump(String notificationType, String jumpType, String jumpValue) {
        Set<String> allowedTypes = "assistant".equals(notificationType)
                ? ASSISTANT_ACTION_TYPES : SYSTEM_JUMP_TYPES;
        if (!allowedTypes.contains(jumpType)) {
            throw new BusinessException(30018, "系统消息跳转类型不受支持");
        }
        if ("none".equals(jumpType)) {
            if (StringUtils.hasText(jumpValue)) {
                throw new BusinessException(30018, "无跳转类型不能配置跳转目标");
            }
            return;
        }
        if (!StringUtils.hasText(jumpValue)) {
            throw new BusinessException(30018, "系统消息跳转目标不能为空");
        }
        if ("h5".equals(jumpType)) {
            try {
                URI uri = URI.create(jumpValue);
                if (!"https".equalsIgnoreCase(uri.getScheme())
                        || uri.getHost() == null
                        || !allowedH5Hosts.contains(uri.getHost().toLowerCase(Locale.ROOT))) {
                    throw new IllegalArgumentException("not allowed");
                }
            } catch (RuntimeException ex) {
                throw new BusinessException(30018, "系统消息H5跳转目标不在白名单");
            }
        }
    }

    private Set<String> parseHosts(String value) {
        if (!StringUtils.hasText(value)) {
            return Set.of();
        }
        Set<String> hosts = new HashSet<>();
        for (String host : value.split(",")) {
            if (StringUtils.hasText(host)) {
                hosts.add(host.trim().toLowerCase(Locale.ROOT));
            }
        }
        return Set.copyOf(hosts);
    }

    private int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }
}
