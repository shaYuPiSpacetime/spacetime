package com.spacetime.common.dto;

import lombok.Data;

import java.time.LocalDateTime;

/** 喜欢我的数据库分页投影。 */
@Data
public class RelationLikeListRow {
    private Long id;
    private String likeNo;
    private Long fromUserId;
    private String sourceScene;
    private LocalDateTime likedTime;
    private LocalDateTime unlockTime;
    private Boolean newLike;
}
