package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 社区关注、粉丝或互动用户。 */
@Data
public class CommunityRelationUserVO {
    private Long userId;
    private String userNo;
    private String nickname;
    private String avatar;
    private String description;
    private Boolean following;
    private Boolean mutualFollowing;
    private String interactionTime;
    private String commentSummary;
}
