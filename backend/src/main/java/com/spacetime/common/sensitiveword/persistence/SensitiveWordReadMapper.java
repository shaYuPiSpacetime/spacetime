package com.spacetime.common.sensitiveword.persistence;

import com.spacetime.common.entity.ContentSensitiveWord;
import org.apache.ibatis.annotations.*;
import java.util.List;

/** 专用只读会话 Mapper，刻意放在业务 MapperScan 路径之外。 */
public interface SensitiveWordReadMapper {
    /** 主库已提交版本，查询时间上限一秒。 */
    @Select("SELECT revision FROM content_sensitive_word_revision WHERE id=1 AND deleted=0")
    @Options(timeout=1, useCache=false, flushCache=Options.FlushCachePolicy.TRUE)
    Long currentRevision();

    /** 读取完成即关闭会话，构建阶段不占用连接。 */
    @Select("SELECT id,word,category_code,status,deleted FROM content_sensitive_word WHERE status='ENABLED' AND deleted=0 ORDER BY id")
    @Options(timeout=2, useCache=false, flushCache=Options.FlushCachePolicy.TRUE)
    List<ContentSensitiveWord> selectEnabled();
}
