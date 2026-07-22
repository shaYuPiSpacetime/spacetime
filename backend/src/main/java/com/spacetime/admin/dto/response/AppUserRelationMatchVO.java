package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/** APP 用户相互喜欢生命周期明细。 */
@Data
public class AppUserRelationMatchVO {
    private String recordNo;
    private RelationCounterpartyVO counterparty;
    private String primarySource;
    private List<String> activeSources;
    private String status;
    private String invalidReason;
    private LocalDateTime invalidTime;
    private LocalDateTime matchedTime;
}
