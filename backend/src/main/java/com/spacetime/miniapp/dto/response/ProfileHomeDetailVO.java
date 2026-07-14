package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;
import java.util.Map;

/** 我的主页/编辑资料统一详情。 */
@Data
public class ProfileHomeDetailVO {
    /** 当前用户资料值。 */
    private ProfileDetailVO profile;
    /** 字段展示、必填、是否可编辑等配置。 */
    private List<BasicProfileFieldVO> fieldSettings;
    /** 三重认证轻量状态。 */
    private VerificationStatusVO verificationStatus;
    /** 准入状态。 */
    private AccessStatusVO accessStatus;
    /** 字典选项路径提示，前端仍通过 /miniapp/dict/profile-options 拉取最新字典。 */
    private String profileOptionsPath;
    /** 地区懒加载路径提示。 */
    private String locationOptionsPath;
    /** 上传、文案、SLA 等运行时配置摘要。 */
    private Map<String, Object> runtimeConfig;
}
