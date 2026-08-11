package com.spacetime.admin.service.impl;

import com.spacetime.admin.dto.request.SensitiveContentViewReq;
import com.spacetime.admin.dto.response.ReportEvidenceVO;
import com.spacetime.admin.dto.response.SensitiveContentVO;
import com.spacetime.admin.service.MessageReportEvidenceAdminService;
import com.spacetime.admin.service.MessageSensitiveAccessAuditService;
import com.spacetime.admin.service.SensitiveAccessAuditCommand;
import com.spacetime.common.dao.CommunityReportDao;
import com.spacetime.common.dao.CommunityReportEvidenceDao;
import com.spacetime.common.entity.CommunityReport;
import com.spacetime.common.entity.CommunityReportEvidence;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.exception.ForbiddenException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.model.message.EncryptedMessageContent;
import com.spacetime.common.provider.SensitiveTextCipher;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

/** 举报证据元数据查询与按条受控正文访问。 */
@Service
@RequiredArgsConstructor
public class MessageReportEvidenceAdminServiceImpl implements MessageReportEvidenceAdminService {
    private final CommunityReportDao reportDao;
    private final CommunityReportEvidenceDao evidenceDao;
    private final MessageSensitiveAccessAuditService auditService;
    private final SensitiveTextCipher cipher;

    @Override
    public List<ReportEvidenceVO> listEvidence(String reportNo) {
        CommunityReport report = requireReport(reportNo);
        return evidenceDao.selectByReportId(report.getId()).stream()
                .map(this::toEvidenceVO)
                .toList();
    }

    @Override
    public SensitiveContentVO viewContent(String reportNo, String evidenceNo,
                                          SensitiveContentViewReq req) {
        UserContext context = requirePermission("community:report:handle");
        CommunityReport report = requireActiveReport(reportNo, context);
        CommunityReportEvidence evidence = evidenceDao.selectByEvidenceNo(evidenceNo);
        if (evidence == null || !Objects.equals(report.getId(), evidence.getReportId())
                || !Objects.equals(report.getReportNo(), evidence.getReportNo())) {
            throw new BusinessException(30022, "举报证据不存在或不属于当前案件");
        }
        if (evidence.getRetainUntil() != null && !evidence.getRetainUntil().isAfter(LocalDateTime.now())) {
            throw new BusinessException(30022, "举报证据已超过保留期");
        }
        requireEncryptedContent(evidence);
        String reason = req == null ? null : req.getViewReason();
        if (!StringUtils.hasText(reason) || reason.trim().length() < 5 || reason.trim().length() > 100) {
            throw new BusinessException(4001, "查看原因长度必须为5-100个字符");
        }
        SensitiveAccessAuditCommand command = new SensitiveAccessAuditCommand(
                "community_report", reportNo, evidence.getTargetType(), evidence.getSourceBizNo(), reason.trim(),
                req.getRequestId());
        String accessNo = auditService.begin(command);
        String content;
        try {
            content = cipher.decrypt(new EncryptedMessageContent(
                    evidence.getContentCiphertext(), evidence.getContentIv(),
                    evidence.getContentKeyVersion(), evidence.getContentHmac()));
        } catch (RuntimeException ex) {
            auditService.complete(accessNo, "error", "decrypt_failed");
            throw ex;
        }
        auditService.complete(accessNo, "allowed", null);
        return new SensitiveContentVO(accessNo, evidenceNo, evidence.getMessageType(), content,
                evidence.getEventTime());
    }

    private CommunityReport requireReport(String reportNo) {
        CommunityReport report = reportDao.selectByReportNo(reportNo);
        if (report == null) throw new BusinessException(30022, "举报案件不存在");
        return report;
    }

    private CommunityReport requireActiveReport(String reportNo, UserContext context) {
        CommunityReport report = requireReport(reportNo);
        if (!Integer.valueOf(1).equals(report.getActiveMarker())) {
            throw new BusinessException(30022, "举报案件已失效");
        }
        boolean privileged = hasRole(context, "super_admin") || hasRole(context, "risk")
                || hasRole(context, "risk_control");
        if (!privileged && report.getHandlerId() != null
                && !Objects.equals(report.getHandlerId(), context.getId())) {
            throw new ForbiddenException("无权查看其他审核员案件正文");
        }
        return report;
    }

    private UserContext requirePermission(String permission) {
        UserContext context = UserContextHolder.get();
        boolean superAdmin = hasRole(context, "super_admin");
        boolean granted = context != null && context.getPermissions() != null
                && (context.getPermissions().contains(permission)
                || context.getPermissions().contains("*")
                || context.getPermissions().contains("*:*:*"));
        if (!superAdmin && !granted) throw new ForbiddenException("无案件处理权限");
        return context;
    }

    private boolean hasRole(UserContext context, String role) {
        return context != null && context.getRoles() != null
                && context.getRoles().stream().anyMatch(value -> role.equalsIgnoreCase(value));
    }

    private void requireEncryptedContent(CommunityReportEvidence evidence) {
        if (evidence.getContentCiphertext() == null || evidence.getContentIv() == null
                || !StringUtils.hasText(evidence.getContentKeyVersion())
                || !StringUtils.hasText(evidence.getContentHmac())) {
            throw new BusinessException(30024, "举报证据正文不可用");
        }
    }

    private ReportEvidenceVO toEvidenceVO(CommunityReportEvidence evidence) {
        ReportEvidenceVO vo = new ReportEvidenceVO();
        vo.setEvidenceNo(evidence.getEvidenceNo());
        vo.setEvidenceType(evidence.getEvidenceType());
        vo.setTargetType(evidence.getTargetType());
        vo.setSourceBizNo(evidence.getSourceBizNo());
        vo.setConversationNo(evidence.getConversationNo());
        vo.setSenderMask(maskUser(evidence.getSenderUserId()));
        vo.setReceiverMask(maskUser(evidence.getReceiverUserId()));
        vo.setMessageType(evidence.getMessageType());
        vo.setEventTime(evidence.getEventTime());
        vo.setContextOrder(evidence.getContextOrder());
        vo.setSeverity(evidence.getSeverity());
        vo.setContentHmacSummary(hmacSummary(evidence.getContentHmac()));
        vo.setSnapshotAt(evidence.getSnapshotAt());
        vo.setRetainUntil(evidence.getRetainUntil());
        vo.setContentAvailable(evidence.getContentCiphertext() != null
                && (evidence.getRetainUntil() == null || evidence.getRetainUntil().isAfter(LocalDateTime.now())));
        return vo;
    }

    private String maskUser(Long userId) {
        if (userId == null) return null;
        String value = String.format(Locale.ROOT, "%012d", userId);
        return "USR-********" + value.substring(value.length() - 4);
    }

    private String hmacSummary(String hmac) {
        if (!StringUtils.hasText(hmac)) return null;
        return hmac.length() <= 12 ? hmac : hmac.substring(0, 12) + "...";
    }
}
