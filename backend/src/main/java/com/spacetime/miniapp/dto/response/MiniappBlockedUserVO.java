package com.spacetime.miniapp.dto.response;

import lombok.Data;

@Data
public class MiniappBlockedUserVO {
    private Long id;
    private Long targetUserId;
    private String targetNickname;
    private String targetAvatar;
    private String blockType;
    private String sourceScene;
    private String createTime;
}
