package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** 理想型当前快照全部未解锁结果的报价请求。 */
@Data
public class IdealUnlockAllQuoteReq {
    @NotBlank(message = "筛选快照编号不能为空")
    private String snapshotNo;
}
