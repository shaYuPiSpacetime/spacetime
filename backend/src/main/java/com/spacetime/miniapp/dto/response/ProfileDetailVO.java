package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 用户资料详情响应
 */
@Data
public class ProfileDetailVO {
    /** 用户ID */
    private Long userId;
    /** 头像URL */
    private String avatar;
    /** 昵称 */
    private String nickname;
    /** 性别 */
    private String gender;
    /** 出生日期 */
    private String birthday;
    /** 年龄（系统计算） */
    private Integer age;
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
    /** 关于我 */
    private String aboutMe;
    /** 希望TA了解 */
    private String hopeTheyKnow;
    /** 语音介绍URL */
    private String voiceIntroUrl;
    /** 语音时长秒 */
    private Integer voiceIntroDuration;
    /** 个人标签JSON */
    private String tags;
    /** 相册JSON */
    private String photos;
    /** 资料页背景图URL */
    private String profileBgImage;
    /** MBTI类型 */
    private String mbtiType;
    /** 星座（系统计算） */
    private String zodiac;
    /** 资料完整度分（系统计算） */
    private Integer profileScore;
    /** 是否已完成首登 */
    private Boolean firstLoginCompleted;
    /** 准入状态 */
    private AccessStatusVO accessStatus;
}
