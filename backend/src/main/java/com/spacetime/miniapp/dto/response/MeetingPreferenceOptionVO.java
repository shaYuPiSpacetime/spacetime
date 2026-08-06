package com.spacetime.miniapp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 见面偏好字典选项；停用历史值仅用于只读回显。 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MeetingPreferenceOptionVO {
    private String code;
    private String label;
    private Boolean enabled;
}
