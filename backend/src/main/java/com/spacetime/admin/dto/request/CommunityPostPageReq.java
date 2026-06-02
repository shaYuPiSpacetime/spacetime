package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 后台社区内容分页查询
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class CommunityPostPageReq extends PageReq {
    private Long authorId;
    private String postType;
    private String status;
    private String auditStatus;
    private Long topicId;
    private String keyword;
}
