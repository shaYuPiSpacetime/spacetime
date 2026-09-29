package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 当前用户主动喜欢的用户列表项。 */
@Data
public class GivenLikeItemVO {
    private String likeNo;
    private Long userId;
    private String nickname;
    private String avatar;
    private Integer age;
    private Integer height;
    private String currentCity;
    private String hometownCity;
    private String sourceScene;
    private LocalDateTime likedTime;
    private Boolean matched;
    private Boolean canEnterConversation;
}
