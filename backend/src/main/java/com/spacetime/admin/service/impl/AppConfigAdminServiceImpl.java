package com.spacetime.admin.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.admin.dto.request.AppConfigBatchReq;
import com.spacetime.admin.dto.response.AppConfigVO;
import com.spacetime.admin.service.AppConfigAdminService;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.dao.ContentOperationLogDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.entity.ContentOperationLog;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.enums.ConfigGroupEnum;
import com.spacetime.common.enums.ConfigTypeEnum;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.net.URI;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * 应用配置管理服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AppConfigAdminServiceImpl implements AppConfigAdminService {

    private final AppConfigDao appConfigDao;
    private final ContentOperationLogDao contentOperationLogDao;
    private final ObjectMapper objectMapper;

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final String EDUCATION_SLA_HOURS_KEY = "prd01.audit.education.sla_hours";

    @Override
    public List<AppConfigVO> list(String group) {
        List<AppConfig> configs = appConfigDao.selectByGroup(group);
        return configs.stream().map(this::toVO).toList();
    }

    @Override
    public AppConfigVO getByKey(String configKey) {
        AppConfig entity = appConfigDao.selectByKey(configKey);
        if (entity == null) {
            throw new BusinessException("配置不存在");
        }
        return toVO(entity);
    }

    @Override
    @Transactional
    public void batchSave(AppConfigBatchReq req) {
        List<Map<String, Object>> fallbackChanges = new ArrayList<>();
        for (AppConfigBatchReq.AppConfigItem item : req.getItems()) {
            validateConfigType(item);
            AppConfig before = appConfigDao.selectByKey(item.getConfigKey());
            String beforeValue = before == null ? null : before.getConfigValue();
            if (!Objects.equals(beforeValue, item.getConfigValue())) {
                fallbackChanges.add(Map.of(
                        "configKey", item.getConfigKey(),
                        "label", StringUtils.hasText(item.getRemark()) ? item.getRemark() : item.getConfigKey(),
                        "beforeValue", beforeValue == null ? "-" : beforeValue,
                        "afterValue", item.getConfigValue() == null ? "-" : item.getConfigValue()
                ));
            }
            AppConfig entity = new AppConfig();
            entity.setConfigKey(item.getConfigKey());
            entity.setConfigValue(item.getConfigValue());
            entity.setConfigGroup(item.getConfigGroup());
            entity.setConfigType(item.getConfigType());
            entity.setPublicVisible(item.getPublicVisible());
            entity.setStatus(item.getStatus());
            entity.setRemark(item.getRemark());
            appConfigDao.upsert(entity);
        }
        writeLog("APP_CONFIG", null, "BATCH_SAVE", null,
                logPayload(req, fallbackChanges), req.getChangeReason());
        log.info("app config batch saved: count={}", req.getItems().size());
    }

    /** 生成配置变更日志 JSON。复杂配置由前端传入明细，普通配置由后端按 key 兜底生成。 */
    private String logPayload(AppConfigBatchReq req, List<Map<String, Object>> fallbackChanges) {
        if (StringUtils.hasText(req.getChangeDetailsJson())) {
            return req.getChangeDetailsJson();
        }
        Map<String, Object> payload = Map.of(
                "category", StringUtils.hasText(req.getTabName()) ? req.getTabName() : "配置",
                "tabName", StringUtils.hasText(req.getTabName()) ? req.getTabName() : "配置",
                "summary", StringUtils.hasText(req.getSummary()) ? req.getSummary() : "变更 " + fallbackChanges.size() + " 项",
                "changedCount", fallbackChanges.size(),
                "changes", fallbackChanges
        );
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            return StringUtils.hasText(req.getSummary()) ? req.getSummary() : req.getItems().size() + " items saved";
        }
    }

    /** 校验配置类型对应的值格式 */
    private void validateConfigType(AppConfigBatchReq.AppConfigItem item) {
        if (ConfigGroupEnum.getByCode(item.getConfigGroup()) == null) {
            throw new BusinessException("不支持的配置分组: " + item.getConfigGroup());
        }
        ConfigTypeEnum configType = ConfigTypeEnum.getByCode(item.getConfigType());
        if (configType == null) {
            throw new BusinessException("不支持的配置类型: " + item.getConfigType());
        }
        if (!isEnabledOrDisabled(item.getStatus())) {
            throw new BusinessException("不支持的配置状态: " + item.getStatus());
        }
        if (!isZeroOrOne(item.getPublicVisible())) {
            throw new BusinessException("publicVisible 只能为 0 或 1");
        }
        if (EDUCATION_SLA_HOURS_KEY.equals(item.getConfigKey()) && !StringUtils.hasText(item.getConfigValue())) {
            throw new BusinessException("学历审核承诺时间必须是大于 0 的整数");
        }
        if (!StringUtils.hasText(item.getConfigValue())) {
            return;
        }
        if (ConfigTypeEnum.URL.equals(configType)) {
            if (!isHttpUrl(item.getConfigValue())) {
                throw new BusinessException("配置键 " + item.getConfigKey() + " 的值必须是合法 URL");
            }
        }
        if (ConfigTypeEnum.JSON.equals(configType)) {
            try {
                objectMapper.readTree(item.getConfigValue());
            } catch (JsonProcessingException e) {
                throw new BusinessException("配置键 " + item.getConfigKey() + " 的值必须是合法 JSON");
            }
        }
        if (ConfigTypeEnum.NUMBER.equals(configType)) {
            try {
                new BigDecimal(item.getConfigValue().trim());
            } catch (NumberFormatException e) {
                throw new BusinessException("配置键 " + item.getConfigKey() + " 的值必须是合法数字");
            }
        }
        if (ConfigTypeEnum.NUMBER.equals(configType)
                && EDUCATION_SLA_HOURS_KEY.equals(item.getConfigKey())
                && !item.getConfigValue().trim().matches("[1-9]\\d*")) {
            throw new BusinessException("学历审核承诺时间必须是大于 0 的整数");
        }
        if (ConfigTypeEnum.BOOLEAN.equals(configType)
                && !"true".equalsIgnoreCase(item.getConfigValue().trim())
                && !"false".equalsIgnoreCase(item.getConfigValue().trim())) {
            throw new BusinessException("配置键 " + item.getConfigKey() + " 的值必须是 true 或 false");
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

    private void writeLog(String bizType, Long bizId, String action, String beforeValue, String afterValue, String remark) {
        ContentOperationLog log = new ContentOperationLog();
        log.setBizType(bizType);
        log.setBizId(bizId);
        log.setAction(action);
        log.setBeforeValue(beforeValue);
        log.setAfterValue(afterValue);
        log.setRemark(remark);
        contentOperationLogDao.insert(log);
    }

    private AppConfigVO toVO(AppConfig entity) {
        AppConfigVO vo = new AppConfigVO();
        vo.setId(entity.getId());
        vo.setConfigKey(entity.getConfigKey());
        vo.setConfigValue(entity.getConfigValue());
        vo.setConfigGroup(entity.getConfigGroup());
        vo.setConfigType(entity.getConfigType());
        vo.setPublicVisible(entity.getPublicVisible());
        vo.setStatus(entity.getStatus());
        vo.setRemark(entity.getRemark());
        vo.setUpdateTime(entity.getUpdateTime() != null ? entity.getUpdateTime().format(FMT) : null);
        return vo;
    }
}
