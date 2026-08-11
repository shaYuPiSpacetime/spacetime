package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.SensitiveContentViewReq;
import com.spacetime.admin.dto.response.SensitiveContentVO;
import com.spacetime.admin.service.impl.MessageReportEvidenceAdminServiceImpl;
import com.spacetime.common.dao.CommunityReportDao;
import com.spacetime.common.dao.CommunityReportEvidenceDao;
import com.spacetime.common.entity.CommunityReport;
import com.spacetime.common.entity.CommunityReportEvidence;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.model.message.EncryptedMessageContent;
import com.spacetime.common.provider.SensitiveTextCipher;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PRD-03 管理后台举报证据正文访问")
class MessageReportEvidenceAdminServiceImplTest {
    @Mock private CommunityReportDao reportDao;
    @Mock private CommunityReportEvidenceDao evidenceDao;
    @Mock private MessageSensitiveAccessAuditService auditService;
    @Mock private SensitiveTextCipher cipher;

    @AfterEach
    void clearContext() {
        UserContextHolder.clear();
    }

    @Test
    @DisplayName("有效案件按条查看时应先写审计再解密正文")
    void shouldAuditAndDecryptOneEvidence() {
        UserContextHolder.set(new UserContext(9L, "审核员", List.of("auditor"),
                List.of("message:report-context:view", "community:report:handle")));
        CommunityReport report = new CommunityReport();
        report.setId(101L);
        report.setReportNo("RPT-001");
        report.setStatus("processing");
        report.setActiveMarker(1);
        report.setHandlerId(9L);
        CommunityReportEvidence evidence = new CommunityReportEvidence();
        evidence.setEvidenceNo("EVD-001");
        evidence.setReportId(101L);
        evidence.setReportNo("RPT-001");
        evidence.setMessageType("text");
        evidence.setContentCiphertext(new byte[]{1});
        evidence.setContentIv(new byte[]{2});
        evidence.setContentKeyVersion("v1");
        evidence.setContentHmac("abc123");
        evidence.setEventTime(LocalDateTime.of(2026, 8, 10, 10, 0));
        evidence.setRetainUntil(LocalDateTime.now().plusDays(1));
        SensitiveContentViewReq req = new SensitiveContentViewReq();
        req.setViewReason("核查用户举报中的骚扰内容");
        req.setRequestId("REQ-EVIDENCE-001");

        when(reportDao.selectByReportNo("RPT-001")).thenReturn(report);
        when(evidenceDao.selectByEvidenceNo("EVD-001")).thenReturn(evidence);
        when(auditService.begin(any())).thenReturn("ACC-001");
        when(cipher.decrypt(any(EncryptedMessageContent.class))).thenReturn("原始举报消息正文");

        SensitiveContentVO result = new MessageReportEvidenceAdminServiceImpl(
                reportDao, evidenceDao, auditService, cipher).viewContent("RPT-001", "EVD-001", req);

        assertThat(result.getContent()).isEqualTo("原始举报消息正文");
        assertThat(result.getAccessNo()).isEqualTo("ACC-001");
        verify(auditService).complete("ACC-001", "allowed", null);
    }

    @Test
    @DisplayName("正文解密成功但审计完成写入失败时不得误记为解密失败")
    void auditCompletionFailureShouldNotBeRecordedAsDecryptFailure() {
        UserContextHolder.set(new UserContext(9L, "审核员", List.of("auditor"),
                List.of("message:report-context:view", "community:report:handle")));
        CommunityReport report = new CommunityReport();
        report.setId(101L);
        report.setReportNo("RPT-001");
        report.setStatus("processing");
        report.setActiveMarker(1);
        report.setHandlerId(9L);
        CommunityReportEvidence evidence = new CommunityReportEvidence();
        evidence.setEvidenceNo("EVD-001");
        evidence.setReportId(101L);
        evidence.setReportNo("RPT-001");
        evidence.setMessageType("text");
        evidence.setContentCiphertext(new byte[]{1});
        evidence.setContentIv(new byte[]{2});
        evidence.setContentKeyVersion("v1");
        evidence.setContentHmac("abc123");
        evidence.setRetainUntil(LocalDateTime.now().plusDays(1));
        SensitiveContentViewReq req = new SensitiveContentViewReq();
        req.setViewReason("核查用户举报中的骚扰内容");
        req.setRequestId("REQ-EVIDENCE-001");

        when(reportDao.selectByReportNo("RPT-001")).thenReturn(report);
        when(evidenceDao.selectByEvidenceNo("EVD-001")).thenReturn(evidence);
        when(auditService.begin(any())).thenReturn("ACC-001");
        when(cipher.decrypt(any(EncryptedMessageContent.class))).thenReturn("原始举报消息正文");
        doThrow(new IllegalStateException("audit update failed"))
                .when(auditService).complete("ACC-001", "allowed", null);

        MessageReportEvidenceAdminServiceImpl service = new MessageReportEvidenceAdminServiceImpl(
                reportDao, evidenceDao, auditService, cipher);

        assertThatThrownBy(() -> service.viewContent("RPT-001", "EVD-001", req))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("audit update failed");
        verify(auditService, never()).complete("ACC-001", "error", "decrypt_failed");
    }
}
