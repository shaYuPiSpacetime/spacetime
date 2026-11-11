package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;

/** 后台赠送请求，客户端为一次操作生成一个稳定请求编号。 */
@Data
public class UserAssetGrantReq {
    /** 请求编号 */
    @NotBlank @Pattern(regexp = "[a-zA-Z0-9-]{16,64}")
    private String requestId;
    /** VIP 天数，零表示不赠送会员 */
    @NotNull @DecimalMin("0") @DecimalMax("36500") @Digits(integer = 5, fraction = 0)
    private BigDecimal vipDays;
    /** 千寻币数量，零表示不赠币 */
    @NotNull @DecimalMin("0") @DecimalMax("2147483647") @Digits(integer = 10, fraction = 0)
    private BigDecimal coinAmount;
    /** 赠送原因 */
    @NotBlank @Size(max = 200)
    private String reason;
}
