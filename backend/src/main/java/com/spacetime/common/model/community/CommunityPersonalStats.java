package com.spacetime.common.model.community;

import lombok.Data;

/** 社区个人统计聚合投影，不加载业务正文。 */
@Data
public class CommunityPersonalStats {
    /** 本人有效动态数。 */
    private Long postCount;
    /** 当前关注数。 */
    private Long followingCount;
    /** 当前粉丝数。 */
    private Long followerCount;
    /** 本人动态及评论收到的有效点赞数。 */
    private Long receivedLikeCount;
}
