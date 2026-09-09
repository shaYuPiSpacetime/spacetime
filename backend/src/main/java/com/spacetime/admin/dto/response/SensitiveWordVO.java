package com.spacetime.admin.dto.response;
import lombok.Data;
import java.time.LocalDateTime;
/** 后台词条，时间使用项目全局 Jackson 格式。 */
@Data public class SensitiveWordVO {
    private Long id;
    private String word;
    private String categoryCode;
    private String categoryName;
    private String status;
    private String remark;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
