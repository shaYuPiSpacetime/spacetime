package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.CommunityReportEvidence;
import org.apache.ibatis.annotations.Mapper;

/** 聊天举报冻结证据 Mapper。 */
@Mapper
public interface CommunityReportEvidenceMapper extends BaseMapper<CommunityReportEvidence> {
}
