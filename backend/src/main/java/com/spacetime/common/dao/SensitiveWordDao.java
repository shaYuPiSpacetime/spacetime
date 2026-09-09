package com.spacetime.common.dao;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.ContentSensitiveWord;
/** 管理写入 DAO，所有写入口按版本行、目标行、查重行顺序获取当前读锁。 */
public interface SensitiveWordDao {
    /** 锁定唯一版本行，缺失返回 null。 */
    Long lockRevision();
    /** 当前读目标行。 */
    ContentSensitiveWord findCurrent(Long id);
    /** 原词全局精确查重，排除自身。 */
    ContentSensitiveWord findDuplicate(String word, Long excludeId);
    /** 插入词条。 */
    void insert(ContentSensitiveWord word);
    /** 完整更新词条。 */
    void update(ContentSensitiveWord word);
    /** 只更新启停状态。 */
    void updateStatus(Long id,String status);
    /** 逻辑删除词条。 */
    void delete(Long id);
    /** 同事务递增词库版本。 */
    void bumpRevision();
    /** 稳定倒序分页。 */
    Page<ContentSensitiveWord> page(int page,int size,String keyword,String categoryCode,String status);
    /** 普通详情读取。 */
    ContentSensitiveWord findById(Long id);
}
