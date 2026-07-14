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
    /** 体重 kg */
    private Integer weight;
    /** 身份字典 code */
    private String identity;
    /** 行业字典 code */
    private String industry;
    /** 职业字典 code */
    private String occupation;
    /** 公司名称 */
    private String company;
    /** 年收入字典 code */
    private String annualIncome;
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
    /** 家乡区县 */
    private String hometownDistrict;
    /** 学校全称 */
    private String school;
    /** 专业 */
    private String major;
    /** 学历字典 code */
    private String educationLevel;
    /** 感情状态 */
    private String emotionalStatus;
    /** 脱单目标 */
    private String datingGoal;
    /** 婚姻状态 */
    private String maritalStatus;
    /** 子女计划 */
    private String childrenPlan;
    /** 是否想要孩子 */
    private String wantChild;
    /** 关于我 */
    private String aboutMe;
    /** 希望TA了解 */
    private String hopeTheyKnow;
    /** 语音介绍URL */
    private String voiceIntroUrl;
    /** 语音时长秒 */
    private Integer voiceIntroDuration;
    /** 语音介绍审核状态 */
    private String voiceIntroAuditStatus;
    /** 语音介绍驳回原因 */
    private String voiceIntroRejectReason;
    /** 个人标签JSON */
    private String tags;
    /** 微信号，仅本人资料页返回。 */
    private String wechatId;
    /** 爱听歌曲三方 ID。 */
    private String favoriteSongId;
    /** 爱听歌曲名称。 */
    private String favoriteSongName;
    /** 爱听歌曲歌手。 */
    private String favoriteSongArtist;
    /** 爱听歌曲封面。 */
    private String favoriteSongCoverUrl;
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
