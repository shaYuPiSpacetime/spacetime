package com.spacetime.miniapp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

/** 发布内容业务结果。 */
@Data
@AllArgsConstructor
public class CommunityPublishResultVO {
    private Long postId;
    private String postNo;
    private String status;
    private String statusName;
    private String message;
}
