package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class MiniappProfileHomeVO {
    private Long userId;
    private String nickname;
    private String avatar;
    private String gender;
    private Integer age;
    private String school;
    private String city;
    private Integer profileCompletion;
    private String realNameStatus;
    private String avatarStatus;
    private String educationStatus;
    private String vipStatus;
    private BigDecimal coinBalance;
    private List<MiniappEntryConfigVO> entries;
}
