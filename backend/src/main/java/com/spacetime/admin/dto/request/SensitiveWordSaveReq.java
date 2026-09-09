package com.spacetime.admin.dto.request;
import lombok.Data;
/** 完整新增/编辑命令；服务层统一执行固定 Unicode trim 和长度校验。 */
@Data public class SensitiveWordSaveReq {
    /** 原词。 */ private String word;
    /** 唯一分类代码。 */ private String categoryCode;
    /** 新增缺省为 ENABLED，编辑必须提供。 */ private String status;
    /** 备注，空值表示清空。 */ private String remark;
}
