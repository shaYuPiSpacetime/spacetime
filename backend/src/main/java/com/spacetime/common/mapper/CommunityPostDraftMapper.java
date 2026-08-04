package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.CommunityPostDraft;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface CommunityPostDraftMapper extends BaseMapper<CommunityPostDraft> {

    /**
     * 草稿是可反复创建的临时数据，删除时必须释放用户与内容类型唯一键。
     */
    @Delete("DELETE FROM community_post_draft WHERE id = #{id}")
    int hardDeleteById(@Param("id") Long id);
}
