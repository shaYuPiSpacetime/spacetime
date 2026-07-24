package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 悦目用户照片发现卡。
 */
@Data
public class YuemuUserCardVO {
    /** 用户 ID。 */
    private Long userId;
    /** 用户昵称，用于图片替代说明和主页承接。 */
    private String nickname;
    /** 已审核公开照片。 */
    private String photoUrl;
    /** 缘分标签。 */
    private String fateLabel;
    /** 学历与学校摘要。 */
    private String educationSchool;
    /** 在线时间文案。 */
    private String onlineText;
    /** 当前用户是否已心动。 */
    private Boolean liked;
}
