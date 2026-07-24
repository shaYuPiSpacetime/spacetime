package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/**
 * 千寻热门页话题聚合
 */
@Data
public class CommunityTopicHomeVO {

    /** 设计主推荐话题 */
    private CommunityTopicCardVO featured;
    /** 主推荐之外的话题，最多4个 */
    private List<CommunityTopicCardVO> related;
}
