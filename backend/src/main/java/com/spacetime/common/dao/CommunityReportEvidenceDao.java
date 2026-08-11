package com.spacetime.common.dao;

import com.spacetime.common.entity.CommunityReportEvidence;

import java.util.List;

/** 聊天举报冻结证据数据访问接口。 */
public interface CommunityReportEvidenceDao {
    CommunityReportEvidence selectByEvidenceNo(String evidenceNo);
    List<CommunityReportEvidence> selectByReportId(Long reportId);
    void insert(CommunityReportEvidence entity);
    int updateById(CommunityReportEvidence entity);
}
