package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.IdealSnapshotCandidate;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/** 理想型筛选快照候选 Mapper。 */
@Mapper
public interface IdealSnapshotCandidateMapper extends BaseMapper<IdealSnapshotCandidate> {
    /** 一条 SQL 写入一批快照候选，避免每位匹配用户一次数据库往返。 */
    @Insert("""
            <script>
            INSERT INTO ct_ideal_snapshot_candidate
                (snapshot_id, item_no, candidate_user_id, sort_time, sort_tie_breaker,
                 matched_condition_codes, created_by, updated_by, create_time, update_time, deleted)
            VALUES
            <foreach collection="rows" item="row" separator=",">
                (#{row.snapshotId}, #{row.itemNo}, #{row.candidateUserId}, #{row.sortTime},
                 #{row.sortTieBreaker}, #{row.matchedConditionCodes}, #{row.createdBy}, #{row.updatedBy},
                 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
            </foreach>
            </script>
            """)
    int insertRows(@Param("rows") List<IdealSnapshotCandidate> rows);
}
