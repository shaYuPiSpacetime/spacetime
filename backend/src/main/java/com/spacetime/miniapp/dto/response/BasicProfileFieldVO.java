package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 基础资料页单个字段的动态配置。 */
@Data
public class BasicProfileFieldVO {
    /** 接口字段名 */
    private String fieldId;
    /** 中文显示名 */
    private String label;
    /** input、date、number、region、dict、select、readonly */
    private String fieldType;
    /** 是否展示 */
    private Boolean visible;
    /** 是否必填；只有展示字段才可能必填 */
    private Boolean required;
    /** 移动端是否允许编辑 */
    private Boolean editable;
    /** 字典类型；非字典字段为空 */
    private String dictType;
    /** 数字最小值 */
    private Integer minValue;
    /** 数字最大值 */
    private Integer maxValue;
    /** 文本最小长度 */
    private Integer minLength;
    /** 文本最大长度 */
    private Integer maxLength;
}
