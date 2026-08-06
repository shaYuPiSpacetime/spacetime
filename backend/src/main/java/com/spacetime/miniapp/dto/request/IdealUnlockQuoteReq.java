package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

/** 理想型指定结果项报价请求。 */
@Data
public class IdealUnlockQuoteReq {
    @NotBlank(message = "筛选快照编号不能为空")
    private String snapshotNo;
    @NotEmpty(message = "请选择需要解锁的用户")
    private List<String> itemNos;
}
