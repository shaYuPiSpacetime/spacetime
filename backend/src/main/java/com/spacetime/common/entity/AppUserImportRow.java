package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * App 用户导入逐行预校验结果。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_user_import_row")
public class AppUserImportRow extends BaseEntity {
    /** 批次 ID */
    private Long batchId;
    /** Excel/CSV 行号 */
    private Integer rowNo;
    /** 原始行 JSON */
    private String rawJson;
    /** 行状态 */
    private String status;
    /** 错误信息 */
    private String errorMsg;
    /** 入库后的用户 ID */
    private Long userId;
}
