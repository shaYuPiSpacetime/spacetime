package com.spacetime.admin.service.impl;

import com.spacetime.admin.service.WebsiteAdminService;
import com.spacetime.common.dao.WebsiteDao;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.util.OssUtil;
import com.spacetime.common.website.WebsiteData;
import com.spacetime.common.website.WebsiteRequestInfo;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/** 网站审核员可审查全部内容；敏感聊天正文仅经单独授权、说明原因后读取。 */
@Service
@RequiredArgsConstructor
public class WebsiteAdminServiceImpl implements WebsiteAdminService {
    private final WebsiteDao dao;
    private final OssUtil oss;

    @Override
    public List<AdminActivityView> activities(int page, int size) {
        return dao.adminActivities(offset(page, size), normalizedSize(size)).stream().map(item -> {
            WebsiteData.User author = dao.user(item.getAuthorId());
            List<String> images = dao.mediaFor("ACTIVITY", item.getId()).stream()
                    .map(media -> oss.toSignedUrl(media.getObjectKey())).toList();
            return new AdminActivityView(item, author == null ? "用户已注销" : author.getNickname(), images);
        }).toList();
    }

    @Override
    @Transactional
    public void moderateActivity(Long id, String status, String reason) {
        requireReason(reason);
        if (!Set.of("APPROVED", "REJECTED", "OFFLINE").contains(status)) throw new BusinessException("审核状态不正确");
        WebsiteData.Activity activity = dao.activity(id);
        if (activity == null) throw new BusinessException("活动不存在");
        boolean pendingDecision = "PENDING".equals(activity.getStatus()) && Set.of("APPROVED", "REJECTED").contains(status);
        boolean onlineRemoval = "APPROVED".equals(activity.getStatus()) && "OFFLINE".equals(status);
        if (!pendingDecision && !onlineRemoval) throw new BusinessException("当前活动状态不能执行该审核操作");
        dao.updateActivityStatus(id, status, reason.trim());
        String mediaStatus = "APPROVED".equals(status) ? "APPROVED" : "REJECTED";
        for (WebsiteData.Media media : dao.mediaFor("ACTIVITY", id)) dao.updateMediaStatus(media.getId(), mediaStatus);
        audit("ACTIVITY_" + status, "ACTIVITY", id, reason);
    }

    @Override
    public List<AdminMessageView> messages(int page, int size) {
        return dao.adminMessages(offset(page, size), normalizedSize(size)).stream()
                .map(item -> new AdminMessageView(item.getId(), item.getConversationId(), item.getSenderId(),
                        item.getMessageType(), item.getStatus(), item.getCreateTime())).toList();
    }

    @Override
    public SensitiveMessageView viewMessage(Long id, String reason) {
        requireReason(reason);
        WebsiteData.Message item = dao.message(id);
        if (item == null) throw new BusinessException("消息不存在");
        String imageUrl = null;
        if (item.getMediaId() != null) {
            WebsiteData.Media media = dao.media(item.getMediaId());
            if (media != null) imageUrl = oss.toSignedUrl(media.getObjectKey());
        }
        audit("MESSAGE_CONTENT_VIEW", "MESSAGE", id, reason);
        return new SensitiveMessageView(id, item.getMessageType(), item.getContentText(), imageUrl);
    }

    @Override
    @Transactional
    public void moderateMessage(Long id, String status, String reason) {
        requireReason(reason);
        if (!Set.of("APPROVED", "REJECTED", "REMOVED").contains(status)) throw new BusinessException("审核状态不正确");
        WebsiteData.Message item = dao.message(id);
        if (item == null) throw new BusinessException("消息不存在");
        boolean pendingDecision = "PENDING".equals(item.getStatus()) && Set.of("APPROVED", "REJECTED").contains(status);
        boolean removal = "APPROVED".equals(item.getStatus()) && "REMOVED".equals(status);
        if (!pendingDecision && !removal) throw new BusinessException("当前消息状态不能执行该操作");
        dao.updateMessageStatus(id, status);
        if (item.getMediaId() != null) dao.updateMediaStatus(item.getMediaId(), status);
        audit("MESSAGE_" + status, "MESSAGE", id, reason);
    }

    @Override
    public String exportMessages(String reason) {
        requireReason(reason);
        StringBuilder csv = new StringBuilder("消息ID,会话ID,发送者ID,类型,状态,内容,时间\n");
        for (int offset = 0; ; offset += 500) {
            List<WebsiteData.Message> batch = dao.adminMessages(offset, 500);
            for (WebsiteData.Message item : batch) {
                String content = item.getMediaId() == null ? item.getContentText() : "[图片媒体ID:" + item.getMediaId() + "]";
                csv.append(item.getId()).append(',').append(item.getConversationId()).append(',')
                        .append(item.getSenderId()).append(',').append(cell(item.getMessageType())).append(',')
                        .append(cell(item.getStatus())).append(',').append(cell(content)).append(',')
                        .append(cell(String.valueOf(item.getCreateTime()))).append('\n');
            }
            if (batch.size() < 500) break;
        }
        audit("MESSAGE_EXPORT", "MESSAGE", null, reason);
        return csv.toString();
    }

    @Override public List<WebsiteData.Report> reports(int page, int size) { return dao.reports(offset(page, size), normalizedSize(size)); }

    @Override
    @Transactional
    public void resolveReport(Long id, String resolution) {
        requireReason(resolution);
        WebsiteData.Report report = dao.report(id);
        if (report == null || !"OPEN".equals(report.getStatus())) throw new BusinessException("举报不存在或已处理");
        dao.resolveReport(id, resolution.trim());
        audit("REPORT_RESOLVED", "REPORT", id, resolution);
    }

    @Override public List<WebsiteData.AuditLog> audits(int page, int size) { return dao.audits(offset(page, size), normalizedSize(size)); }

    private static int normalizedSize(int size) { return Math.min(Math.max(size, 1), 100); }
    private static int offset(int page, int size) { return (Math.min(Math.max(page, 1), 100000) - 1) * normalizedSize(size); }

    private static void requireReason(String reason) {
        if (reason == null || reason.isBlank() || reason.length() > 500) throw new BusinessException("请填写不超过500字的操作原因");
    }

    private static String cell(String value) {
        String safe = value == null ? "" : value.replace("\r", " ").replace("\n", " ").replace("\t", " ");
        String leading = safe.stripLeading();
        if (!leading.isEmpty() && "=+-@".indexOf(leading.charAt(0)) >= 0) safe = "'" + safe;
        return "\"" + safe.replace("\"", "\"\"") + "\"";
    }

    private void audit(String action, String targetType, Long targetId, String reason) {
        WebsiteData.AuditLog log = new WebsiteData.AuditLog();
        UserContext actor = UserContextHolder.get();
        log.setActorType("ADMIN");
        log.setActorId(actor == null ? null : actor.getId());
        log.setAction(action);
        log.setTargetType(targetType);
        log.setTargetId(targetId);
        log.setRemark(reason.trim());
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            HttpServletRequest request = attrs.getRequest();
            log.setRequestIp(WebsiteRequestInfo.clientIp(request));
            String agent = request.getHeader("User-Agent");
            if (agent != null) log.setUserAgent(agent.substring(0, Math.min(255, agent.length())));
        }
        log.setRetainUntil(LocalDateTime.now().plusDays(190));
        dao.insertAudit(log);
    }
}
