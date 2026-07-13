package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 移动端通用字典选项。 */
@Data
public class DictOptionVO {
    /** 提交及业务库存储使用的 code。 */
    private String code;
    /** 页面展示的中文名称。 */
    private String label;
}
