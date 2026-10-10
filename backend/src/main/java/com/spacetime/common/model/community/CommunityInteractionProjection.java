package com.spacetime.common.model.community;

import lombok.Data;
import java.time.LocalDateTime;

/** 数据库分页后的互动元数据，卡片在当前页内批量组装。 */
@Data
public class CommunityInteractionProjection {
    /** 互动展示编号。 */
    private String id;
    /** 关联动态编号，解锁记录为空。 */
    private Long postId;
    /** 目标用户编号。 */
    private Long targetUserId;
    /** 本次评论正文。 */
    private String description;
    /** 真实互动时间。 */
    private LocalDateTime interactionTime;
}
