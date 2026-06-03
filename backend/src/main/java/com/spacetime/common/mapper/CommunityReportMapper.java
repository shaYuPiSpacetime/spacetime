package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.CommunityReport;
import org.apache.ibatis.annotations.Mapper;

/**
 * 社区举报Mapper
 */
@Mapper
public interface CommunityReportMapper extends BaseMapper<CommunityReport> {
}
