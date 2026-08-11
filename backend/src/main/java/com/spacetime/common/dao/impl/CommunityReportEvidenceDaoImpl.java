package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.CommunityReportEvidenceDao;
import com.spacetime.common.entity.CommunityReportEvidence;
import com.spacetime.common.mapper.CommunityReportEvidenceMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

/** 聊天举报冻结证据数据访问实现。 */
@Repository
@RequiredArgsConstructor
public class CommunityReportEvidenceDaoImpl implements CommunityReportEvidenceDao {
    private final CommunityReportEvidenceMapper mapper;

    @Override
    public CommunityReportEvidence selectByEvidenceNo(String evidenceNo) {
        return mapper.selectOne(new LambdaQueryWrapper<CommunityReportEvidence>()
                .eq(CommunityReportEvidence::getEvidenceNo, evidenceNo));
    }

    @Override
    public List<CommunityReportEvidence> selectByReportId(Long reportId) {
        return mapper.selectList(new LambdaQueryWrapper<CommunityReportEvidence>()
                .eq(CommunityReportEvidence::getReportId, reportId)
                .orderByAsc(CommunityReportEvidence::getContextOrder)
                .orderByAsc(CommunityReportEvidence::getId));
    }

    @Override
    public void insert(CommunityReportEvidence entity) {
        mapper.insert(entity);
    }

    @Override
    public int updateById(CommunityReportEvidence entity) {
        return mapper.updateById(entity);
    }
}
