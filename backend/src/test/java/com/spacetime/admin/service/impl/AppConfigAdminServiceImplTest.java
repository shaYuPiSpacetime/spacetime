package com.spacetime.admin.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.admin.dto.request.AppConfigBatchReq;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.dao.ContentOperationLogDao;
import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("PRD01 字段配置固定矩阵测试")
class AppConfigAdminServiceImplTest {

    @Mock
    private AppConfigDao appConfigDao;
    @Mock
    private ContentOperationLogDao contentOperationLogDao;

    private AppConfigAdminServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new AppConfigAdminServiceImpl(appConfigDao, contentOperationLogDao, new ObjectMapper());
    }

    @Test
    @DisplayName("固定展示字段不能被关闭")
    void batchSave_shouldRejectHiddenFixedVisibleField() {
        AppConfigBatchReq req = request("{\"rows\":[{\"fieldId\":\"height\",\"visible\":false,\"required\":false,\"scoreEnabled\":true}]}");

        assertThatThrownBy(() -> service.batchSave(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("height")
                .hasMessageContaining("固定展示");

        verify(appConfigDao, never()).upsert(any());
    }

    @Test
    @DisplayName("固定必填字段不能改为选填")
    void batchSave_shouldRejectOptionalFixedRequiredField() {
        AppConfigBatchReq req = request("{\"rows\":[{\"fieldId\":\"identityType\",\"visible\":true,\"required\":false,\"scoreEnabled\":true}]}");

        assertThatThrownBy(() -> service.batchSave(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("identityType")
                .hasMessageContaining("固定必填");

        verify(appConfigDao, never()).upsert(any());
    }

    @Test
    @DisplayName("现居地区县已退出采集后允许配置为选填")
    void batchSave_shouldAllowOptionalLocationDistrictField() {
        AppConfigBatchReq req = request("{\"rows\":[{\"fieldId\":\"locationDistrict\",\"visible\":true,\"required\":false,\"scoreEnabled\":true}]}");

        service.batchSave(req);

        verify(appConfigDao).upsert(any());
        verify(contentOperationLogDao).insert(any());
    }

    @Test
    @DisplayName("身高固定展示但允许配置为选填")
    void batchSave_shouldAllowOptionalFixedVisibleField() {
        AppConfigBatchReq req = request("{\"rows\":[{\"fieldId\":\"height\",\"visible\":true,\"required\":false,\"scoreEnabled\":true}]}");

        service.batchSave(req);

        verify(appConfigDao).upsert(any());
        verify(contentOperationLogDao).insert(any());
    }

    private AppConfigBatchReq request(String configValue) {
        AppConfigBatchReq.AppConfigItem item = new AppConfigBatchReq.AppConfigItem();
        item.setConfigKey("prd01.profile.fieldSettings");
        item.setConfigValue(configValue);
        item.setConfigGroup("PRD01_PROFILE_FIELD");
        item.setConfigType("JSON");
        item.setPublicVisible(0);
        item.setStatus("ENABLED");
        item.setRemark("字段展示、必填、计分配置");

        AppConfigBatchReq req = new AppConfigBatchReq();
        req.setItems(List.of(item));
        req.setTabName("字段配置");
        req.setChangeReason("测试字段固定矩阵");
        return req;
    }
}
