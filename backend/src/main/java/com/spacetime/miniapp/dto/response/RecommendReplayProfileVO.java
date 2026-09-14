package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 三天回看列表所需的轻量用户资料。 */
@Data
public class RecommendReplayProfileVO {
    private Long userId;
    private String userNo;
    private String nickname;
    private String avatar;
    private String gender;
    private Integer age;
    private String currentCity;
    private String occupationLabel;
    private Boolean liked;
    private Boolean matched;
    private String matchNo;
    private Boolean canEnterConversation;
    private String communicationMode;
}
