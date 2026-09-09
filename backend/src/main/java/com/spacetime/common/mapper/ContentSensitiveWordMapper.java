package com.spacetime.common.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.ContentSensitiveWord;
import org.apache.ibatis.annotations.*;
/** 管理端主事务 Mapper，锁查询均使用当前读。 */
public interface ContentSensitiveWordMapper extends BaseMapper<ContentSensitiveWord> {
    /** 串行化所有词库写入。 */
    @Select("SELECT revision FROM content_sensitive_word_revision WHERE id=1 AND deleted=0 FOR UPDATE")
    Long lockRevision();
    /** 已删除目标不可被编辑恢复。 */
    @Select("SELECT * FROM content_sensitive_word WHERE id=#{id} AND deleted=0 FOR UPDATE")
    ContentSensitiveWord findCurrent(@Param("id") Long id);
    /** 二进制精确比较，停用词同样参与查重。 */
    @Select("<script>SELECT * FROM content_sensitive_word WHERE deleted=0 AND word=#{word} AND BINARY word=BINARY #{word} <if test='excludeId != null'>AND id != #{excludeId}</if> LIMIT 1 FOR UPDATE</script>")
    ContentSensitiveWord findDuplicate(@Param("word") String word,@Param("excludeId") Long excludeId);
    /** 与词条写入使用相同事务。 */
    @Update("UPDATE content_sensitive_word_revision SET revision=revision+1,update_time=NOW(),updated_by=#{operatorId} WHERE id=1 AND deleted=0")
    int bumpRevision(@Param("operatorId") Long operatorId);
}
