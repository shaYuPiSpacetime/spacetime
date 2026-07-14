package com.spacetime.miniapp.service.impl;

import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.enums.MobilePageCodeEnum;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.service.Prd01ProfileCompletenessCalculator;
import com.spacetime.miniapp.dto.response.MiniappCertificationCenterVO;
import com.spacetime.miniapp.dto.response.MiniappProfileHomeVO;
import com.spacetime.miniapp.service.MiniappMobileConfigService;
import com.spacetime.miniapp.service.MiniappProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 小程序我的页与认证中心聚合服务
 * TODO: 后续从认证表读取 realNameStatus/avatarStatus/educationStatus，
 * PRD-04 接入后从资产表读取 vipStatus/coinBalance。
 */
@Service
@RequiredArgsConstructor
public class MiniappProfileServiceImpl extends UserSecurityBaseSupport implements MiniappProfileService {
    private final AppUserDao appUserDao;
    private final MiniappMobileConfigService mobileConfigService;
    private final AppUserAuditContentService auditContentService;
    private final Prd01ProfileCompletenessCalculator profileCompletenessCalculator;

    @Override
    public MiniappProfileHomeVO home(Long userId) {
        AppUser user = appUserDao.selectById(userId);
        MiniappProfileHomeVO vo = new MiniappProfileHomeVO();
        vo.setUserId(userId);
        vo.setNickname(displayName(user, userId));
        vo.setAvatar(user == null ? null : auditContentService.ownerAvatar(userId));
        vo.setGender(user != null ? user.getGender() : null);
        vo.setAge(user != null ? user.getAge() : null);
        vo.setSchool(user != null ? user.getSchool() : null);
        vo.setCity(user != null ? user.getLocationCity() : null);
        vo.setProfileCompletion(user != null ? profileCompletenessCalculator.calculate(user) : 0);
        vo.setRealNameStatus("NOT_CERTIFIED");
        vo.setAvatarStatus("NOT_CERTIFIED");
        vo.setEducationStatus("NOT_CERTIFIED");
        vo.setVipStatus(null);
        vo.setCoinBalance(null);
        vo.setEntries(mobileConfigService.getEntries(MobilePageCodeEnum.MY_PAGE.getCode()));
        return vo;
    }

    @Override
    public MiniappCertificationCenterVO certificationCenter(Long userId) {
        MiniappCertificationCenterVO vo = new MiniappCertificationCenterVO();
        vo.setRealNameStatus("NOT_CERTIFIED");
        vo.setAvatarStatus("NOT_CERTIFIED");
        vo.setEducationStatus("NOT_CERTIFIED");
        vo.setTitle("认证中心");
        vo.setDescription("完成认证后可解锁更多互动能力");
        return vo;
    }
}
