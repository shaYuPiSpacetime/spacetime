package com.spacetime.admin.dto.response;

import lombok.Data;

@Data
public class AdminRelationBlockVO {
    private Long id;
    private Long userId;
    private Long targetUserId;
    private String targetNickname;
    private String blockType;
    private String sourceScene;
    private String status;
    private String createTime;
}
