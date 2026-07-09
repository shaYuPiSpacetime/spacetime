package com.spacetime.common.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.AppUserAuditRecord;
import com.spacetime.common.enums.AppUserAuditTypeEnum;

import java.util.List;

/**
 * App 用户统一审核服务。
 * 所有认证、媒体、开放文字、语音介绍审核都以统一审核记录表为事实来源。
 */
public interface AppUserAuditService {

    /** 查询用户某类审核的最新提交记录，无记录返回 null。 */
    AppUserAuditRecord latestRecord(Long userId, AppUserAuditTypeEnum type);

    /** 查询用户某类审核最近生效记录，无记录返回 null。 */
    AppUserAuditRecord latestEffectiveRecord(Long userId, AppUserAuditTypeEnum type);

    /** 查询用户某类审核当前生效记录列表，主要用于相册多张并存。 */
    List<AppUserAuditRecord> effectiveRecords(Long userId, AppUserAuditTypeEnum type);

    /** 分页查询某类审核记录，供管理后台列表使用。 */
    Page<AppUserAuditRecord> pageRecords(Page<AppUserAuditRecord> page, AppUserAuditTypeEnum type,
            String status, String auditSource, Long userId);

    /** 用户提交一条审核记录，并写入提交历史。 */
    AppUserAuditRecord submit(AppUserAuditRecord record);

    /** 机审通过，并按审核类型更新 current_effective。 */
    void machineApprove(Long recordId, Long providerTaskId, String machineSignalJson);

    /** 机审驳回，并写入驳回原因。 */
    void machineReject(Long recordId, Long providerTaskId, String machineSignalJson, String reason);

    /** 人工通过、驳回或失效，action 支持 APPROVE、REJECT、EXPIRE。 */
    void manualAudit(Long recordId, String action, String reason, Long auditorId, String auditorName);

    /** 系统失效一条审核记录，常用于用户删除当前生效内容。 */
    void systemExpire(Long recordId, String reason);

    /** 判断用户某类审核最新记录是否已通过；头像业务使用该口径。 */
    boolean latestApproved(Long userId, AppUserAuditTypeEnum type);

    /** 判断用户某类审核是否存在最近生效记录；非头像业务使用该口径。 */
    boolean hasEffective(Long userId, AppUserAuditTypeEnum type);

    /** 统计实名、头像、学历三重认证通过数量。 */
    int certificationApprovedCount(Long userId);
}
