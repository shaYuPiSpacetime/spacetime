package com.spacetime.miniapp.dto.response;

import lombok.Data;

@Data
public class MiniappSearchResultItemVO {
    private Long id;
    private String type;
    private String title;
    private String subtitle;
    private String avatar;
}
