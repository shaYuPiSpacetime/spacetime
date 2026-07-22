package com.spacetime.admin.dto.response;

import lombok.Data;

/**
 * 管理后台 — 用户列表行视图
 */
@Data
public class AppUserListVO {
    /** 用户ID */
    private Long id;
    /** 头像URL */
    private String avatar;
    /** 昵称 */
    private String nickname;
    /** 性别 */
    private String gender;
    /** 性别中文 */
    private String genderLabel;
    /** 年龄 */
    private Integer age;
    /** 学校 */
    private String school;
    /** 实名绑定手机号，业务层脱敏后返回 */
    private String phone;
    /** 现居地展示文本 */
    private String city;
    /** 身份类型 */
    private String identity;
    /** 用户身份 code */
    private String identityCode;
    /** 用户身份中文 */
    private String identityLabel;
    /** 行业 code */
    private String industryCode;
    /** 行业中文 */
    private String industryLabel;
    /** 职业 */
    private String occupation;
    /** 职业 code */
    private String occupationCode;
    /** 职业中文 */
    private String occupationLabel;
    /** 公司名称 */
    private String company;
    /** 年收入区间 */
    private String annualIncome;
    /** 年收入 code */
    private String annualIncomeCode;
    /** 年收入中文 */
    private String annualIncomeLabel;
    /** 学历 code */
    private String educationLevelCode;
    /** 学历中文 */
    private String educationLevelLabel;
    /** 身高 cm */
    private Integer height;
    /** 体重 kg */
    private Integer weight;
    /** 微信号脱敏展示 */
    private String wechatId;
    /** 当前千寻币余额 */
    private Integer coinBalance;
    /** VIP 状态 */
    private String vipStatus;
    /** 当前操作员是否有权查看 VIP 信息。 */
    private Boolean vipVisible;
    /** VIP 到期时间 */
    private String vipExpireTime;
    /** 标签JSON */
    private String tags;
    /** 相册JSON */
    private String photos;
    /** 语音介绍时长 */
    private Integer voiceIntroDuration;
    /** 语音介绍审核状态 */
    private String voiceIntroAuditStatus;
    /** MBTI类型 */
    private String mbtiType;
    /** 星座 */
    private String zodiac;
    /** 实名认证状态 */
    private String realNameStatus;
    /** 学历认证状态 */
    private String educationStatus;
    /** 头像认证状态 */
    private String avatarVerifyStatus;
    /** 最新头像审核记录 ID */
    private Long avatarAuditRecordId;
    /** 最新头像审核图片 */
    private String avatarAuditMediaUrl;
    /** 最新头像审核缩略图 */
    private String avatarAuditThumbUrl;
    /** 最新头像审核驳回/失效原因 */
    private String avatarAuditRejectReason;
    /** 最新头像审核提交时间 */
    private String avatarAuditSubmitTime;
    /** 是否完成首登 */
    private Integer firstLoginCompleted;
    /** 资料完整度分 */
    private Integer profileScore;
    /** 账号状态 */
    private String accountStatus;
    /** 注册时间 */
    private String registerTime;
    /** 最近登录时间 */
    private String lastLoginTime;
    /** 核心准入状态（计算字段：browse_only / full_access / blocked） */
    private String accessStatus;
    /** 关系准入投影：OPEN-开放，CLOSED-未开放，ABNORMAL-账号异常。 */
    private String relationshipAccess;
}
