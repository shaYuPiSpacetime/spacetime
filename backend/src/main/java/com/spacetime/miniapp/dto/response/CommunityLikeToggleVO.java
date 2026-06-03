package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 点赞切换结果
 */
@Data
public class CommunityLikeToggleVO {

    /** 当前点赞状态：true=已点赞，false=未点赞 */
    private Boolean liked;
    /** 当前内容点赞总数 */
    private Integer likeCount;
}
