package com.spacetime.common.service;

import com.spacetime.common.dao.DictDataDao;
import com.spacetime.common.entity.SysDictData;
import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
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

    @Test
    @DisplayName("中国大陆地区code存在且父子层级匹配时通过")
    void shouldAcceptValidChinaRegionHierarchy() {
        when(dictDataDao.selectEnabledByTypeAndValue("china_region", "330000"))
                .thenReturn(region(1L, 0L, "330000"));
        when(dictDataDao.selectEnabledByTypeAndValue("china_region", "330100"))
                .thenReturn(region(2L, 1L, "330100"));
        when(dictDataDao.selectEnabledByTypeAndValue("china_region", "330106"))
                .thenReturn(region(3L, 2L, "330106"));
        ProfileDictionaryService service = new ProfileDictionaryService(dictDataDao);

        org.assertj.core.api.Assertions.assertThatCode(() -> service.requireChinaRegionPath(
                        "330000", "330100", "330106", "现居地"))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("市级code不属于所选省份时拒绝")
    void shouldRejectMismatchedChinaRegionHierarchy() {
        when(dictDataDao.selectEnabledByTypeAndValue("china_region", "330000"))
                .thenReturn(region(1L, 0L, "330000"));
        when(dictDataDao.selectEnabledByTypeAndValue("china_region", "410100"))
                .thenReturn(region(2L, 9L, "410100"));
        ProfileDictionaryService service = new ProfileDictionaryService(dictDataDao);

        assertThatThrownBy(() -> service.requireChinaRegionPath(
                        "330000", "410100", null, "现居地"))
                .isInstanceOf(BusinessException.class)
                .hasMessage("REGION_NOT_SUPPORTED：现居地必须使用有效的中国大陆省市编码");
    }

    @Test
    @DisplayName("城市存在启用区县节点时返回真实层级结果")
    void shouldDetectEnabledRegionChildren() {
        when(dictDataDao.selectEnabledByTypeAndValue("china_region", "320600"))
                .thenReturn(region(2L, 1L, "320600"));
        when(dictDataDao.selectList(any())).thenReturn(List.of(region(3L, 2L, "320602")));
        ProfileDictionaryService service = new ProfileDictionaryService(dictDataDao);

        assertThat(service.hasEnabledRegionChildren("320600")).isTrue();
    }

    private SysDictData dict(String type, String code, String label) {
        SysDictData data = new SysDictData();
        data.setDictType(type);
        data.setDictValue(code);
        data.setDictLabel(label);
        data.setStatus("ENABLED");
        return data;
    }

    private SysDictData region(Long id, Long parentId, String code) {
        SysDictData data = dict("china_region", code, code);
        data.setId(id);
        data.setParentId(parentId);
        return data;
    }
}
