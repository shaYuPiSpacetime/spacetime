package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/** 社区配置版本快照。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("community_config_version")
public class CommunityConfigVersion extends BaseEntity {
    private String versionNo;
    private Integer version;
    private String configSnapshot;
    private String changeSummary;
    private Integer highRiskConfirmed;
    private Long operatorId;
}
