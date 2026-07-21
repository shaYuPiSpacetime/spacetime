package com.spacetime.common.service;

import com.spacetime.common.dto.RelationViewAudit;

/** 管理后台关系敏感数据查看审计服务。 */
public interface RelationAuditService {
    /** 在返回关系数据前写入查看审计，写入失败时抛出业务异常。 */
    void recordRelationView(RelationViewAudit audit);
}
