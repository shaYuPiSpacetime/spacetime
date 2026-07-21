package com.spacetime.admin.dto.request;

import com.spacetime.common.dto.PageReq;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class CancelRequestPageReq extends PageReq {
    /** 申请编号、成家号或手机号。 */
    private String keyword;
    private String requestNo;
    private Long userId;
    private String phone;
    private String status;
    private Boolean hasBlock;
}
