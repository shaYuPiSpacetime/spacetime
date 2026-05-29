package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

@Data
public class MiniappSettingsHomeVO {
    private String phoneBindStatus;
    private String maskedPhone;
    private String wechatBindStatus;
    private List<MiniappEntryConfigVO> entries;
    private String currentVersion;
}
