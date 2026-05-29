package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.dao.MobileEntryConfigDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.entity.MobileEntryConfig;
import com.spacetime.miniapp.dto.response.MiniappEntryConfigVO;
import com.spacetime.miniapp.service.MiniappMobileConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 小程序移动端配置服务实现
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MiniappMobileConfigServiceImpl implements MiniappMobileConfigService {

    private static final String CONFIG_PREFIX = "config:";

    private final MobileEntryConfigDao mobileEntryConfigDao;
    private final AppConfigDao appConfigDao;

    @Override
    public List<MiniappEntryConfigVO> getEntries(String pageCode) {
        List<MobileEntryConfig> entries = mobileEntryConfigDao.selectEnabledByPageCode(pageCode);
        return entries.stream().map(this::toVO).collect(Collectors.toList());
    }

    private MiniappEntryConfigVO toVO(MobileEntryConfig entity) {
        MiniappEntryConfigVO vo = new MiniappEntryConfigVO();
        vo.setEntryKey(entity.getEntryKey());
        vo.setEntryName(entity.getEntryName());
        vo.setIcon(entity.getIcon());
        vo.setJumpType(entity.getJumpType());
        vo.setBadgeText(entity.getBadgeText());
        vo.setBadgeType(entity.getBadgeType());
        vo.setLoginRequired(entity.getLoginRequired());
        vo.setSort(entity.getSort());

        String jumpTarget = entity.getJumpTarget();
        if (StrUtil.isNotBlank(jumpTarget) && jumpTarget.startsWith(CONFIG_PREFIX)) {
            String configKey = jumpTarget.substring(CONFIG_PREFIX.length());
            AppConfig config = appConfigDao.selectPublicEnabled(List.of(configKey)).stream().findFirst().orElse(null);
            vo.setJumpTarget(config != null ? config.getConfigValue() : jumpTarget);
        } else {
            vo.setJumpTarget(jumpTarget);
        }
        return vo;
    }
}
