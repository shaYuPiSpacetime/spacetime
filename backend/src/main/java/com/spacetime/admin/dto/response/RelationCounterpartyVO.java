package com.spacetime.admin.dto.response;

import lombok.Data;

/** 关系记录中的对方用户摘要。 */
@Data
public class RelationCounterpartyVO {
    private Long userId;
    private String userNo;
    private String nickname;
    private String maskedPhone;
    private String avatar;
    private Boolean anonymous;
}
