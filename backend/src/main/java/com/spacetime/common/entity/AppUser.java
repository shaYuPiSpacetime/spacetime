package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.spacetime.common.enums.AccountStatusEnum;
import com.spacetime.common.enums.GenderEnum;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 小程序用户主表（账户 + 资料合一）
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_user")
public class AppUser extends BaseEntity {
    /** 小程序openid */
    private String openid;
    /** 微信unionid */
    private String unionid;
    /** 授权手机号 */
    private String phone;
    /** 授权手机号 SHA-256 哈希，用于唯一绑定和风控 */
    private String phoneHash;
    /** 注册来源 @see RegisterSourceEnum */
    private String registerSource;
    /** 注册时间 */
    private LocalDateTime registerTime;
    /** 最近登录时间 */
    private LocalDateTime lastLoginTime;
    /** 账号状态 @see AccountStatusEnum */
    private String accountStatus;
    /** 是否完成首登资料初始化 */
    private Integer firstLoginCompleted;

    /** 主头像URL */
    private String avatar;
    /** 昵称 */
    private String nickname;
    /** 性别 @see GenderEnum */
    private String gender;
    /** 出生日期 */
    private LocalDate birthday;
    /** 年龄（系统计算） */
    private Integer age;
    /** 身高cm */
    private Integer height;
    /** 体重 kg */
    private Integer weight;
    /** 身份类型：在校生、职场人等 */
    private String identity;
    /** 职业 */
    private String occupation;
    /** 年收入区间 */
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
    /** 脱单目标 */
    private String datingGoal;
    /** 婚姻状态 */
    private String maritalStatus;
    /** 感情状态 */
    private String emotionalStatus;
    /** 子女计划 */
    private String childrenPlan;
    /** 是否想要孩子 */
    private String wantChild;
    /** 学校全称 */
    private String school;
    /** 专业 */
    private String major;
    /** 最高学历 */
    private String educationLevel;

    /** 关于我 */
    private String aboutMe;
    /** 希望TA了解 */
    private String hopeTheyKnow;
    /** 标签列表JSON */
    @TableField(value = "tags")
    private String tags;
    /** 相册JSON */
    @TableField(value = "photos")
    private String photos;
    /** 资料页背景图 */
    private String profileBgImage;
    /** MBTI类型 */
    private String mbtiType;
    /** 星座（系统计算） */
    private String zodiac;
    /** 资料完整度分（系统计算） */
    private Integer profileScore;
}
