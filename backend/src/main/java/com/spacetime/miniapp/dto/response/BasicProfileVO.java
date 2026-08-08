package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 基础资料页查询或保存后的完整响应。 */
@Data
public class BasicProfileVO {
    private Long userId;
    private String nickname;
    /** 性别编码，允许通过基础资料接口修改 */
    private String gender;
    private String birthday;
    private Integer age;
    private String zodiac;
    private Integer height;
    private Integer weight;
    /** 以下字典字段返回 code，中文通过资料字典接口展示 */
    private String identity;
    private String educationLevel;
    private String industry;
    private String occupation;
    private String annualIncome;
    private String maritalStatus;
    /** 省市字段同时返回地区 code 和中文标签，移动端展示不得直接使用 code */
    private String locationProvince;
    private String locationProvinceLabel;
    private String locationCity;
    private String locationCityLabel;
    private String locationDistrict;
    private String hometownProvince;
    private String hometownProvinceLabel;
    private String hometownCity;
    private String hometownCityLabel;
    private String hometownDistrict;
    private String company;
    private String school;
    private String major;
    /** 后台配置的年龄范围 */
    private Integer minAge;
    private Integer maxAge;
    /** 当前资料完整度 */
    private Integer profileScore;
    /** 当前基础资料必填项是否全部完成 */
    private Boolean basicProfileCompleted;
    /** 未完成时为 COMPLETE_BASIC_PROFILE，完成时为 ADD_AVATAR */
    private String nextAction;
    /** 当前缺失的必填字段 ID */
    private List<String> missingRequiredFields;
    /** 基础资料页面的字段展示、必填、编辑和校验配置 */
    private List<BasicProfileFieldVO> fieldSettings;
}
