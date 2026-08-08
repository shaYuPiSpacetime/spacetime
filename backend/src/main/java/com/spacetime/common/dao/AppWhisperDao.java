package com.spacetime.common.dao;

import com.spacetime.common.entity.AppWhisper;

/** 悄悄话数据访问接口。 */
public interface AppWhisperDao {
    /** 按发送方和客户端幂等键查询首次发送结果。 */
    AppWhisper selectBySenderAndIdempotencyKey(Long senderUserId, String idempotencyKey);

    /** 在当前事务内以锁定读查询首次发送结果。 */
    AppWhisper selectBySenderAndIdempotencyKeyForUpdate(Long senderUserId, String idempotencyKey);

    /** 写入悄悄话记录。 */
    void insert(AppWhisper entity);
}
