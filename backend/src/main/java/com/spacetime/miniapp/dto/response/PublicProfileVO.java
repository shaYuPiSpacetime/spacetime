package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 关系链路中的对外用户资料。 */
@Data
public class PublicProfileVO {
    private Long userId;
    /** 悄悄话预检查使用的稳定用户编号。 */
    private String userNo;
    private String nickname;
    private String avatar;
    private String heroPhoto;
    private List<String> photos;
    private String gender;
    private Integer age;
    private Integer height;
    private String zodiac;
    private String currentCity;
    private String hometownCity;
    private String school;
    private String identityLabel;
    private String industryLabel;
    private String occupationLabel;
    private String company;
    private String annualIncomeLabel;
    private List<String> tags;
    private String introduction;
    private String datingGoal;
    private String maritalStatus;
    private String emotionalStatus;
    private String favoriteSongName;
    private String favoriteSongArtist;
    private String favoriteSongCoverUrl;
    private Boolean liked;
    private Boolean matched;
    private String matchNo;
    private Boolean canEnterConversation;
    private String communicationMode;
    /** 对外可见且当前生效的三重认证 code。 */
    private List<String> certifications;
}
