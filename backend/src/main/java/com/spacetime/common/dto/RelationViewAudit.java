package com.spacetime.common.dto;

/**
 * 管理后台查看关系数据的审计元数据。
 * 仅记录查询条件和结果数，不允许携带用户资料或关系明细。
 */
public record RelationViewAudit(
        String requestNo,
        Long userId,
        String tab,
        Integer page,
        Integer size,
        String direction,
        String status,
        String source,
        Long resultCount,
        Boolean assetVisible) {
}
