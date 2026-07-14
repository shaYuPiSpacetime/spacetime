package com.spacetime.miniapp.dto.request;

import lombok.Data;

import java.util.List;

/** 我的标签保存请求。 */
@Data
public class ProfileTagsSaveReq {
    /** 标签字典 code 列表，最多 16 个。 */
    private List<String> tagCodes;
}
