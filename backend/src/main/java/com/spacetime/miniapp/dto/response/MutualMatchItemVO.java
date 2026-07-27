package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/** 相互喜欢列表项。 */
@Data
public class MutualMatchItemVO {
    private String matchNo;
    private Long userId;
    private String nickname;
    private String avatar;
    private Integer age;
    private Integer height;
    private String currentCity;
    private String hometownCity;
    private String primarySource;
    private List<String> activeSources;
    private String matchStatus;
    private LocalDateTime matchTime;
    private Boolean canEnterConversation;
}
