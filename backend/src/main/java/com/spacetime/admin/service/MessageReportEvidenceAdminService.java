package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.SensitiveContentViewReq;
import com.spacetime.admin.dto.response.ReportEvidenceVO;
import com.spacetime.admin.dto.response.SensitiveContentVO;

import java.util.List;

/** 举报聊天证据后台服务。 */
public interface MessageReportEvidenceAdminService {
    List<ReportEvidenceVO> listEvidence(String reportNo);

    SensitiveContentVO viewContent(String reportNo, String evidenceNo, SensitiveContentViewReq req);
}
