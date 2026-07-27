package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 发起或取消喜欢后的关系状态。 */
@Data
public class RelationLikeActionVO {
    private String likeNo;
    private String likeStatus;
    private Boolean matched;
    private String matchNo;
    private String matchStatus;
    private Boolean canEnterConversation;
}
