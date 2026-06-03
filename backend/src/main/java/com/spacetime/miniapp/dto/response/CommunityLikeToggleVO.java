package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 点赞切换结果
 */
@Data
public class CommunityLikeToggleVO {
    private Boolean liked;
    private Integer likeCount;
}
