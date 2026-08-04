package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 本人社区互动历史记录。 */
@Data
public class CommunityInteractionRecordVO {
    private String id;
    private String interactionType;
    private Long targetUserId;
    private String targetUserNo;
    private String nickname;
    private String avatar;
    private String description;
    private String interactionTime;
    private CommunityPostCardVO post;
}
