package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

/** 家园话题分页请求。 */
@Data
@EqualsAndHashCode(callSuper = true)
public class CommunityTopicPageReq extends PageReq {
    private String keyword;
    private String status;
    private Boolean recommended;
}
