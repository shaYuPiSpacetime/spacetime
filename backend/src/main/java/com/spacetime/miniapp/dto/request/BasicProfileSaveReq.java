package com.spacetime.miniapp.dto.request;

import lombok.Data;

/**
 * 基础资料页保存请求。
 *
 * 这是完整表单保存接口：已展示字段传空表示清空；后台关闭展示的字段会被忽略。
 * 性别允许在基础资料页修改，但只接受 MALE/FEMALE。
 */
@Data
public class BasicProfileSaveReq {
    /** 昵称，2-12个字符 */
    private String nickname;
    /** 性别，MALE/FEMALE */
    private String gender;
    /** 出生日期，格式 yyyy-MM-dd */
    private String birthday;
    /** 身高，单位 cm，范围 140-220 */
    private Integer height;
    /** 体重，单位 kg，范围 30-200 */
    private Integer weight;
    /** 身份字典 code */
    private String identity;
    /** 最高学历字典 code */
    private String educationLevel;
    /** 行业字典 code */
    private String industry;
    /** 现居省级地区 code */
    private String locationProvince;
    /** 现居市级地区 code */
    private String locationCity;
    /** 现居区县地区 code */
    private String locationDistrict;
    /** 家乡省级地区 code */
    private String hometownProvince;
    /** 家乡市级地区 code */
    private String hometownCity;
    /** 家乡区县地区 code */
    private String hometownDistrict;
    /** 职业字典 code */
    private String occupation;
    /** 公司名称 */
    private String company;
    /** 年收入字典 code */
    private String annualIncome;
    /** 学校名称 */
    private String school;
    /** 专业名称 */
    private String major;
    /** 婚姻状况字典 code */
    private String maritalStatus;
}
