package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 资料媒体提交响应。
 */
@Data
public class ProfileMediaVO {
    /** 媒体记录 ID。 */
    private Long mediaId;
    /** 媒体类型。 */
    private String mediaType;
    /** 原图或原始文件 URL。 */
    private String mediaUrl;
    /** 缩略图 URL。 */
    private String thumbUrl;
    /** 展示顺序。 */
    private Integer sortOrder;
    /** 审核状态。 */
    private String auditStatus;
    /** 审核来源：MACHINE、MANUAL。 */
    private String auditSource;
    /** 驳回原因。 */
    private String rejectReason;
    /** 是否当前有效。 */
    private Boolean currentEffective;
}
