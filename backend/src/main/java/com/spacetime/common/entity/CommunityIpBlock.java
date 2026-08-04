package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 社区写操作 IP 封禁。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("community_ip_block")
public class CommunityIpBlock extends BaseEntity {
    private String ipValue;
    private String ipRange;
    private String writeScope;
    private String reason;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String status;
    private Integer activeMarker;
    private Long sourceReportId;
    private Integer version;
}
