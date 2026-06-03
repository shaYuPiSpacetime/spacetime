package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 关注切换结果
 */
@Data
public class CommunityFollowToggleVO {

    /** 当前关注状态：true=已关注，false=未关注 */
    private Boolean following;
}
