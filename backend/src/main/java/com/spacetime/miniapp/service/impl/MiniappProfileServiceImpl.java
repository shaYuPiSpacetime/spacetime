package com.spacetime.miniapp.service.impl;

import com.spacetime.common.dao.UserDao;
import com.spacetime.common.entity.SysUser;
import com.spacetime.common.enums.MobilePageCodeEnum;
import com.spacetime.miniapp.dto.response.MiniappCertificationCenterVO;
import com.spacetime.miniapp.dto.response.MiniappProfileHomeVO;
import com.spacetime.miniapp.service.MiniappMobileConfigService;
import com.spacetime.miniapp.service.MiniappProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 小程序我的页与认证中心聚合服务
 * TODO: PRD-01 app_user/app_user_auth 表落地后：
 *   1. 替换 UserDao(SysUser) 为 AppUserDao
 *   2. 从认证表读取 realNameStatus/avatarStatus/educationStatus
 *   3. 从用户资料表读取 gender/age/school/city/profileCompletion
 *   4. PRD-04 接入后从资产表读取 vipStatus/coinBalance
 */
@Service
@RequiredArgsConstructor
public class MiniappProfileServiceImpl extends UserSecurityBaseSupport implements MiniappProfileService {
    private final UserDao userDao;
    private final MiniappMobileConfigService mobileConfigService;

    @Override
    public MiniappProfileHomeVO home(Long userId) {
        SysUser user = userDao.selectById(userId);
        MiniappProfileHomeVO vo = new MiniappProfileHomeVO();
        vo.setUserId(userId);
        vo.setNickname(displayName(user, userId));
        vo.setAvatar(user != null ? user.getAvatar() : null);
        vo.setGender(null);
        vo.setAge(null);
        vo.setSchool(null);
        vo.setCity(null);
        vo.setProfileCompletion(0);
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
