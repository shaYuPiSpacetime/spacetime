package com.spacetime.admin.dto.request;

import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

/** 管理后台关系列表通用查询条件。 */
@Data
public class RelationPageReq {
    /** 页码，从 1 开始。 */
    private int page = 1;
    /** 每页条数，管理后台弹窗默认 5 条，接口兼容 10、20、50。 */
    private int size = 5;
    /** 方向：ALL-全部，OUTBOUND-当前用户发起，INBOUND-当前用户接收。 */
    private String direction = "ALL";
    /** 当前 Tab 的正式状态编码。 */
    private String status;
    /** 来源场景或匹配来源编码。 */
    private String source;
    /** 闭区间起始时间。 */
    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime startTime;
    /** 闭区间结束时间。 */
    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime endTime;
}
