package com.spacetime.common.service;

/**
 * 成家币流水服务
 */
public interface CoinLogService {

    /**
     * 增加成家币
     *
     * @param userId   用户ID
     * @param amount   增加数量
     * @param bizScene 业务场景（BizSceneEnum.code）
     * @param refId    关联业务ID
     * @param refType  关联业务类型
     * @return 流水记录ID
     */
    Long addCoin(Long userId, Integer amount, String bizScene, Long refId, String refType);
}
