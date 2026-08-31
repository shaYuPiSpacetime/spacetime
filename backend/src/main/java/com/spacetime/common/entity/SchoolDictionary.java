package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.TableField;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 中国大陆高校本地字典，由第三方查询结果持续补全。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("school_dictionary")
public class SchoolDictionary extends BaseEntity {
    private String providerUuid;
    private String schoolCode;
    private String schoolName;
    private String shortName;
    private String oldName;
    private String province;
    private String city;
    private String district;
    private String collegeType;
    private String category;
    private String educationLevel;
    private String schoolProperty;
    @TableField("is_985")
    private Boolean is985;
    @TableField("is_211")
    private Boolean is211;
    @TableField("is_dual_class")
    private Boolean isDualClass;
    private String source;
    private LocalDateTime providerUpdatedTime;
    private String status;
}
