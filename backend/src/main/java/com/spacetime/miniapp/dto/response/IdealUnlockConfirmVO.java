package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 理想型确认扣币与解锁结果。 */
@Data
public class IdealUnlockConfirmVO {
    private String snapshotNo;
    private Integer paidCost;
    private Integer newBalance;
    private Boolean alreadyConfirmed;
    private List<IdealUnlockedItemVO> unlockedItems;
}
