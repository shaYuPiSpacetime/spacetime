package com.spacetime.admin.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.admin.dto.request.MobileEntryConfigSaveReq;
import com.spacetime.admin.dto.request.MobileEntrySortReq;
import com.spacetime.admin.dto.request.StatusUpdateReq;
import com.spacetime.admin.dto.response.MobileEntryConfigVO;
import com.spacetime.admin.service.MobileEntryConfigAdminService;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.dao.ContentOperationLogDao;
import com.spacetime.common.dao.MobileEntryConfigDao;
import com.spacetime.common.entity.ContentOperationLog;
import com.spacetime.common.entity.MobileEntryConfig;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.enums.JumpTypeEnum;
import com.spacetime.common.enums.MobilePageCodeEnum;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * 移动端入口配置管理服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MobileEntryConfigAdminServiceImpl implements MobileEntryConfigAdminService {

    private final MobileEntryConfigDao mobileEntryConfigDao;
    private final AppConfigDao appConfigDao;
    private final ContentOperationLogDao contentOperationLogDao;
    private final ObjectMapper objectMapper;

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Override
    public List<MobileEntryConfigVO> list(String pageCode) {
        List<MobileEntryConfig> entries = mobileEntryConfigDao.selectByPageCode(pageCode);
        return entries.stream().map(this::toVO).toList();
    }

    @Override
    @Transactional
    public Long create(MobileEntryConfigSaveReq req) {
        validateUniqueness(req.getPageCode(), req.getEntryKey(), null);
        validateJumpTarget(req);
        MobileEntryConfig entity = new MobileEntryConfig();
        fillEntity(entity, req);
        mobileEntryConfigDao.insert(entity);
        writeLog("MOBILE_ENTRY", entity.getId(), "CREATE", null, entity.getEntryName());
        log.info("mobile entry created: id={}, pageCode={}, entryKey={}",
                entity.getId(), req.getPageCode(), req.getEntryKey());
        return entity.getId();
    }

    @Override
    @Transactional
    public void update(Long id, MobileEntryConfigSaveReq req) {
        MobileEntryConfig entity = mobileEntryConfigDao.selectById(id);
        if (entity == null) {
            throw new BusinessException("入口配置不存在");
        }
        validateUniqueness(req.getPageCode(), req.getEntryKey(), id);
        validateJumpTarget(req);
        String beforeName = entity.getEntryName();
        fillEntity(entity, req);
        mobileEntryConfigDao.updateById(entity);
        writeLog("MOBILE_ENTRY", id, "UPDATE", beforeName, req.getEntryName());
        log.info("mobile entry updated: id={}", id);
    }

    @Override
    @Transactional
    public void updateStatus(Long id, StatusUpdateReq req) {
        MobileEntryConfig entity = mobileEntryConfigDao.selectById(id);
        if (entity == null) {
            throw new BusinessException("入口配置不存在");
        }
        if (!isEnabledOrDisabled(req.getStatus())) {
            throw new BusinessException("不支持的入口状态: " + req.getStatus());
        }
        String beforeStatus = entity.getStatus();
        entity.setStatus(req.getStatus());
        mobileEntryConfigDao.updateById(entity);
        writeLog("MOBILE_ENTRY", id, "STATUS_CHANGE", beforeStatus, req.getStatus());
        log.info("mobile entry status changed: id={}, {} -> {}", id, beforeStatus, req.getStatus());
    }

    @Override
    @Transactional
    public void sort(MobileEntrySortReq req) {
        List<MobileEntryConfig> entries = new ArrayList<>();
        for (MobileEntrySortReq.SortItem item : req.getItems()) {
            MobileEntryConfig existing = mobileEntryConfigDao.selectById(item.getId());
            if (existing == null) {
                throw new BusinessException("入口配置不存在: " + item.getId());
            }
            MobileEntryConfig entry = new MobileEntryConfig();
            entry.setId(item.getId());
            entry.setSort(item.getSort());
            entries.add(entry);
        }
        mobileEntryConfigDao.batchUpdateSort(entries);
        writeLog("MOBILE_ENTRY", null, "SORT", null, String.valueOf(req.getItems().size()));
        log.info("mobile entry sort updated: count={}", req.getItems().size());
    }

    @Override
    @Transactional
    public void delete(Long id) {
        MobileEntryConfig entity = mobileEntryConfigDao.selectById(id);
        if (entity == null) {
            throw new BusinessException("入口配置不存在");
        }
        mobileEntryConfigDao.deleteById(id);
        writeLog("MOBILE_ENTRY", id, "DELETE", entity.getEntryName(), null);
        log.info("mobile entry deleted: id={}", id);
    }

    /** 校验 pageCode + entryKey 唯一性 */
    private void validateUniqueness(String pageCode, String entryKey, Long excludeId) {
        MobileEntryConfig existing = mobileEntryConfigDao.selectByPageCodeAndKey(pageCode, entryKey);
        if (existing != null && !existing.getId().equals(excludeId)) {
            throw new BusinessException("该页面下已存在相同入口键: " + entryKey);
        }
    }

    /** 校验跳转类型和跳转目标的一致性 */
    private void validateJumpTarget(MobileEntryConfigSaveReq req) {
        if (MobilePageCodeEnum.getByCode(req.getPageCode()) == null) {
            throw new BusinessException("不支持的页面编码: " + req.getPageCode());
        }
        JumpTypeEnum jumpType = JumpTypeEnum.getByCode(req.getJumpType());
        if (jumpType == null) {
            throw new BusinessException("不支持的跳转类型: " + req.getJumpType());
        }
        if (!isEnabledOrDisabled(req.getStatus())) {
            throw new BusinessException("不支持的入口状态: " + req.getStatus());
        }
        if (!isZeroOrOne(req.getLoginRequired())) {
            throw new BusinessException("loginRequired 只能为 0 或 1");
        }
        if (StringUtils.hasText(req.getExtraJson())) {
            try {
                objectMapper.readTree(req.getExtraJson());
            } catch (JsonProcessingException e) {
                throw new BusinessException("扩展 JSON 格式不合法");
            }
        }
        if (JumpTypeEnum.NONE.equals(jumpType)) {
            return;
        }
        if (!StringUtils.hasText(req.getJumpTarget())) {
            throw new BusinessException("跳转目标不能为空");
        }
        if (JumpTypeEnum.H5.equals(jumpType) && req.getJumpTarget().startsWith("config:")) {
            String configKey = req.getJumpTarget().substring("config:".length()).trim();
            if (configKey.isEmpty() || appConfigDao.selectPublicEnabled(List.of(configKey)).isEmpty()) {
                throw new BusinessException("config 跳转目标不存在或未公开: " + configKey);
            }
            return;
        }
        if (JumpTypeEnum.H5.equals(jumpType) && !isHttpUrl(req.getJumpTarget())) {
            throw new BusinessException("H5 跳转目标必须是合法 URL 或 config:{key}");
        }
        if (JumpTypeEnum.NATIVE_ROUTE.equals(jumpType) && !req.getJumpTarget().startsWith("/")) {
            throw new BusinessException("原生路由跳转目标必须以 / 开头");
        }
    }

    private boolean isEnabledOrDisabled(String status) {
        return CommonStatusEnum.ENABLED.getCode().equals(status) || CommonStatusEnum.DISABLED.getCode().equals(status);
    }

    private boolean isZeroOrOne(Integer value) {
        return Integer.valueOf(0).equals(value) || Integer.valueOf(1).equals(value);
    }

    private boolean isHttpUrl(String value) {
        try {
            URI uri = URI.create(value.trim());
            return ("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                    && StringUtils.hasText(uri.getHost());
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private void fillEntity(MobileEntryConfig entity, MobileEntryConfigSaveReq req) {
        entity.setPageCode(req.getPageCode());
        entity.setEntryKey(req.getEntryKey());
        entity.setEntryName(req.getEntryName());
        entity.setIcon(req.getIcon());
        entity.setJumpType(req.getJumpType());
        entity.setJumpTarget(req.getJumpTarget());
        entity.setBadgeText(req.getBadgeText());
        entity.setBadgeType(req.getBadgeType());
        entity.setLoginRequired(req.getLoginRequired());
        entity.setSort(req.getSort() != null ? req.getSort() : 0);
        entity.setStatus(req.getStatus());
        entity.setExtraJson(req.getExtraJson());
    }

    private void writeLog(String bizType, Long bizId, String action, String beforeValue, String afterValue) {
        ContentOperationLog log = new ContentOperationLog();
        log.setBizType(bizType);
        log.setBizId(bizId);
        log.setAction(action);
        log.setBeforeValue(beforeValue);
        log.setAfterValue(afterValue);
        contentOperationLogDao.insert(log);
    }

    private MobileEntryConfigVO toVO(MobileEntryConfig entity) {
        MobileEntryConfigVO vo = new MobileEntryConfigVO();
        vo.setId(entity.getId());
        vo.setPageCode(entity.getPageCode());
        vo.setEntryKey(entity.getEntryKey());
        vo.setEntryName(entity.getEntryName());
        vo.setIcon(entity.getIcon());
        vo.setJumpType(entity.getJumpType());
        vo.setJumpTarget(entity.getJumpTarget());
        vo.setBadgeText(entity.getBadgeText());
        vo.setBadgeType(entity.getBadgeType());
        vo.setLoginRequired(entity.getLoginRequired());
        vo.setSort(entity.getSort());
        vo.setStatus(entity.getStatus());
        vo.setExtraJson(entity.getExtraJson());
        vo.setCreateTime(entity.getCreateTime() != null ? entity.getCreateTime().format(FMT) : null);
        return vo;
    }
}
