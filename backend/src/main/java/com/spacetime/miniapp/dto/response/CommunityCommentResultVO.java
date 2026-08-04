package com.spacetime.miniapp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

/** 发表评论业务结果。 */
@Data
@AllArgsConstructor
public class CommunityCommentResultVO {
    private Long commentId;
    private String commentNo;
    private String status;
    private String statusName;
    private String message;
    private Integer commentCount;
}
