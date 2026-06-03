package com.spacetime.miniapp.dto.request;

import lombok.Data;

/**
 * 资料增量更新请求，null字段不更新
 */
@Data
public class ProfileUpdateReq {
    /** 昵称 */
    private String nickname;
    /** 头像URL */
    private String avatar;
    /** 出生日期 yyyy-MM-dd */
    private String birthday;
    /** 身高cm */
    private Integer height;
    /** 居住省 */
    private String locationProvince;
    /** 居住市 */
    private String locationCity;
    /** 居住区县 */
    private String locationDistrict;
    /** 家乡省 */
    private String hometownProvince;
    /** 家乡市 */
    private String hometownCity;
    /** 学校全称 */
    private String school;
    /** 专业 */
    private String major;
    /** 最高学历 */
    private String educationLevel;
    /** 感情状态 */
    private String emotionalStatus;
    /** 脱单目标 */
    private String datingGoal;
    /** 婚姻状态 */
    private String maritalStatus;
    /** 关于我（20-300字） */
    private String aboutMe;
    /** 希望TA了解 */
    private String hopeTheyKnow;
    /** 语音介绍URL */
    private String voiceIntroUrl;
    /** 语音时长秒 */
    private Integer voiceIntroDuration;
    /** MBTI类型 */
    private String mbtiType;
    /** 资料页背景图URL */
    private String profileBgImage;
}
