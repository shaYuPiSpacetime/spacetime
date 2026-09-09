package com.spacetime.common.dao;
import com.spacetime.common.entity.ContentSensitiveWord;
import java.util.List;
/** 使用独立主库连接读取，不参与业务事务。 */
public interface SensitiveWordReadDao {
    /** 当前已提交词库版本；缺失返回 null。 */
    Long currentRevision();
    /** 返回已启用且未删除的词条。 */
    List<ContentSensitiveWord> selectEnabled();
}
