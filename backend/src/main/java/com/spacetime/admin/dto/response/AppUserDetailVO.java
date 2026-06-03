package com.spacetime.admin.dto.response;

import lombok.Data;

/**
 * 管理后台 — 用户详情视图
 */
@Data
public class AppUserDetailVO {
    /** 用户ID */
    private Long id;
    /** 昵称 */
    private String nickname;
    /** 头像URL */
    private String avatar;
    /** 性别 */
    private String gender;
    /** 出生日期 */
    private String birthday;
    /** 年龄 */
    private Integer age;
    /** 身高cm */
    private Integer height;
    /** 居住省 */
    private String locationProvince;
    /** 居住市 */
    private String locationCity;
    /** 家乡省 */
    private String hometownProvince;
    /** 家乡市 */
    private String hometownCity;
    /** 学校 */
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
    /** 标签JSON */
    private String tags;
    /** 相册JSON */
    private String photos;
    /** 语音介绍URL */
    private String voiceIntroUrl;
    /** 语音时长秒 */
    private Integer voiceIntroDuration;
    /** MBTI类型 */
    private String mbtiType;
    /** 星座 */
    private String zodiac;
    /** 资料完整度分 */
    private Integer profileScore;
    /** 是否完成首登 */
    private Integer firstLoginCompleted;
    /** 注册时间 */
    private String registerTime;
    /** 最近登录时间 */
    private String lastLoginTime;
    /** 账号状态 */
    private String accountStatus;
    /** 认证详情 */
    private VerificationDetailVO verification;
    /** 是否可浏览觅缘卡片 */
    private Boolean canBrowseCards;
    /** 是否可匹配操作 */
    private Boolean canMatch;
    /** 是否可进入曝光 */
    private Boolean canBeExposed;
    /** 不可用原因文案 */
    private String blockReason;
    /** 历史违规记录数（v1预留，默认0） */
    private Integer violationCount;
    /** 反馈/申诉记录数（v1预留，默认0） */
    private Integer feedbackCount;
}
