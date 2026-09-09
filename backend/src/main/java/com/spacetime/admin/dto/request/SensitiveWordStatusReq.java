package com.spacetime.admin.dto.request;
import lombok.Data;
/** 仅启停命令。 */
@Data public class SensitiveWordStatusReq {
    /** 目标状态。 */ private String status;
}
