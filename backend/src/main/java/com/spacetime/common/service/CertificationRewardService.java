package com.spacetime.common.service;

/** 资料认证达标后的一次性本人奖励。 */
public interface CertificationRewardService {
    /** 后台奖励额度配置键，零表示关闭。 */
    String CONFIG_KEY = "commercial.certification.reward.coins";
    /** 与资料保存或审核事务共同提交，未达标不入账。 */
    void grantIfEligible(Long userId);
}
