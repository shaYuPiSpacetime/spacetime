package com.spacetime.miniapp.dto.request;

import lombok.Data;

@Data
public class MiniappAccountCancelReq {
    private Boolean confirm;
    private String reason;
}
