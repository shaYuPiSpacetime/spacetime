package com.spacetime.miniapp.dto.request;

import lombok.Data;

@Data
public class MiniappAccountCancelReq {
    private Boolean confirm;
    private String reason;
    /** 最近一次实时校验返回的短期凭证。 */
    private String recheckToken;
}
