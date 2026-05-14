package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 字典数据视图对象
 */
@Data
public class DictDataVO {
    /** 主键 ID */
    private Long id;
    /** 所属字典类型编码 */
    private String dictType;
    /** 父级 ID（0=顶级） */
    private Long parentId;
    /** 字典标签（显示文本） */
    private String dictLabel;
    /** 字典键值（存储值） */
    private String dictValue;
    /** 排序号 */
    private Integer dictSort;
    /** 状态：ENABLED=启用 / DISABLED=禁用 */
    private String status;
    /** 备注 */
    private String remark;
    /** 创建时间 */
    private LocalDateTime createTime;
    /** 子级列表（树结构） */
    private List<DictDataVO> children;
}
