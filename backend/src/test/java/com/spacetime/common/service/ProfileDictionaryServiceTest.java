package com.spacetime.common.service;

import com.spacetime.common.dao.DictDataDao;
import com.spacetime.common.entity.SysDictData;
import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("用户资料业务字典")
class ProfileDictionaryServiceTest {

    @Mock
    private DictDataDao dictDataDao;

    @Test
    @DisplayName("命中字典时返回标准code和中文标签")
    void shouldResolveEnabledDictionaryCode() {
        when(dictDataDao.selectEnabledByTypeAndValue("app_identity", "WORKER"))
                .thenReturn(dict("app_identity", "WORKER", "职场人"));
        ProfileDictionaryService service = new ProfileDictionaryService(dictDataDao);

        assertThat(service.requireCode("app_identity", " WORKER ", "身份")).isEqualTo("WORKER");
        assertThat(service.label("app_identity", "WORKER")).isEqualTo("职场人");
    }

    @Test
    @DisplayName("中文值或未配置code不允许写入业务表")
    void shouldRejectUnknownOrChineseValue() {
        ProfileDictionaryService service = new ProfileDictionaryService(dictDataDao);

        assertThatThrownBy(() -> service.requireCode("app_identity", "职场人", "身份"))
                .isInstanceOf(BusinessException.class)
                .hasMessage("身份编码不存在或已停用");
    }

    private SysDictData dict(String type, String code, String label) {
        SysDictData data = new SysDictData();
        data.setDictType(type);
        data.setDictValue(code);
        data.setDictLabel(label);
        data.setStatus("ENABLED");
        return data;
    }
}
