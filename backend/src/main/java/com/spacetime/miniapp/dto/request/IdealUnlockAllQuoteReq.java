package com.spacetime.miniapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import java.util.List;

/** 理想型当前页全部未解锁人员的报价请求，不隐式扩展到整个快照。 */
@Data
public class IdealUnlockAllQuoteReq {
    @NotBlank(message = "筛选快照编号不能为空")
    private String snapshotNo;

    /** 当前页展示的人员编号；旧客户端未传范围时拒绝全量报价。 */
    @NotEmpty(message = "请更新小程序后，按当前页重新解锁")
    private List<@NotBlank(message = "理想型人员编号不能为空") String> itemNos;
}
