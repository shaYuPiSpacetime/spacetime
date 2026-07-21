package com.spacetime.common.service.impl;

import com.spacetime.common.dao.ContentOperationLogDao;
import com.spacetime.common.dto.RelationViewAudit;
import com.spacetime.common.entity.ContentOperationLog;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.service.RelationAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** 管理后台关系敏感数据查看审计实现。 */
@Service
@RequiredArgsConstructor
public class RelationAuditServiceImpl implements RelationAuditService {
    /** 关系查看审计失败错误码。 */
    private static final int RELATION_AUDIT_ERROR = 20010;

    private final ContentOperationLogDao operationLogDao;

    @Override
    public void recordRelationView(RelationViewAudit audit) {
        ContentOperationLog log = new ContentOperationLog();
        log.setBizType("PRD02_RELATION_VIEW");
        log.setBizId(audit.userId());
        log.setAction("VIEW_" + audit.tab().toUpperCase());
        log.setAfterValue(toMetadataJson(audit));
        log.setRemark("APP 用户关系反馈只读查看");
        UserContext context = UserContextHolder.get();
        if (context != null) {
            log.setCreatedBy(context.getId());
            log.setUpdatedBy(context.getId());
        }
        try {
            operationLogDao.insert(log);
        } catch (RuntimeException ex) {
            throw new BusinessException(RELATION_AUDIT_ERROR, "关系数据查看审计写入失败");
        }
    }

    private String toMetadataJson(RelationViewAudit audit) {
        return "{\"requestNo\":\"" + safe(audit.requestNo())
                + "\",\"tab\":\"" + safe(audit.tab())
                + "\",\"page\":" + number(audit.page())
                + ",\"size\":" + number(audit.size())
                + ",\"direction\":\"" + safe(audit.direction())
                + "\",\"status\":\"" + safe(audit.status())
                + "\",\"source\":\"" + safe(audit.source())
                + "\",\"resultCount\":" + number(audit.resultCount())
                + ",\"assetVisible\":" + Boolean.TRUE.equals(audit.assetVisible()) + "}";
    }

    private String safe(Object value) {
        return value == null ? "" : String.valueOf(value).replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private String number(Number value) {
        return value == null ? "0" : String.valueOf(value);
    }
}
