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
import java.util.Map;

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
    @DisplayName("未知或空字典编码不应作为用户展示文案回传")
    void shouldHideUnknownDisplayCodes() {
        ProfileDictionaryService service = new ProfileDictionaryService(dictDataDao);

        assertThat(service.label("app_occupation", "UNKNOWN_JOB")).isNull();
        assertThat(service.label(Map.of("ENGINEER", "工程师"), "UNKNOWN_JOB")).isNull();
        assertThat(service.label(Map.of(), " ")).isNull();
    }

    @Test
    @DisplayName("历史直辖市虚拟节点展示市名而不是市辖区或县")
    void shouldDisplayMunicipalityNameForLegacyVirtualCity() {
        when(dictDataDao.selectEnabledByTypeAndValue("china_region", "500200"))
                .thenReturn(dict("china_region", "500200", "县"));
        when(dictDataDao.selectList(any())).thenReturn(List.of(
                dict("china_region", "500200", "县"),
                dict("china_region", "500233", "忠县")));
        ProfileDictionaryService service = new ProfileDictionaryService(dictDataDao);

        assertThat(service.label("china_region", "500200")).isEqualTo("重庆市");
        assertThat(service.labels("china_region", List.of("500200", "500233")))
                .containsEntry("500200", "重庆市")
                .containsEntry("500233", "忠县");
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
    @DisplayName("直辖市两级选择器提交真实区县时通过")
    void shouldAcceptMunicipalityDistrictAsCity() {
        when(dictDataDao.selectEnabledByTypeAndValue("china_region", "500000"))
                .thenReturn(region(1L, 0L, "500000"));
        when(dictDataDao.selectEnabledByTypeAndValue("china_region", "500233"))
                .thenReturn(region(3L, 2L, "500233"));
        SysDictData virtualCity = region(2L, 1L, "500200");
        virtualCity.setDictLabel("县");
        when(dictDataDao.selectById(2L)).thenReturn(virtualCity);
        ProfileDictionaryService service = new ProfileDictionaryService(dictDataDao);

        org.assertj.core.api.Assertions.assertThatCode(() -> service.requireChinaRegionPath(
                        "500000", "500233", null, "现居地"))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("省及自治区直辖县级地区可作为城市保存且兼容旧地区路径")
    void shouldAcceptDirectAdminDistrictAsCityAndLegacyPath() {
        when(dictDataDao.selectEnabledByTypeAndValue("china_region", "410000"))
                .thenReturn(region(1L, 0L, "410000"));
        when(dictDataDao.selectEnabledByTypeAndValue("china_region", "419000"))
                .thenReturn(region(2L, 1L, "419000"));
        when(dictDataDao.selectEnabledByTypeAndValue("china_region", "419001"))
                .thenReturn(region(3L, 2L, "419001"));
        SysDictData virtualCity = region(2L, 1L, "419000");
        virtualCity.setDictLabel("省直辖县级行政区划");
        when(dictDataDao.selectById(2L)).thenReturn(virtualCity);
        ProfileDictionaryService service = new ProfileDictionaryService(dictDataDao);

        org.assertj.core.api.Assertions.assertThatCode(() -> service.requireChinaRegionPath(
                        "410000", "419001", null, "家乡"))
                .doesNotThrowAnyException();
        org.assertj.core.api.Assertions.assertThatCode(() -> service.requireChinaRegionPath(
                        "410000", "419000", "419001", "家乡"))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("省及自治区直辖县级地区不属于所选省份时拒绝")
    void shouldRejectDirectAdminDistrictUnderAnotherProvince() {
        when(dictDataDao.selectEnabledByTypeAndValue("china_region", "410000"))
                .thenReturn(region(1L, 0L, "410000"));
        when(dictDataDao.selectEnabledByTypeAndValue("china_region", "429004"))
                .thenReturn(region(3L, 2L, "429004"));
        SysDictData virtualCity = region(2L, 9L, "429000");
        virtualCity.setDictLabel("省直辖县级行政区划");
        when(dictDataDao.selectById(2L)).thenReturn(virtualCity);
        ProfileDictionaryService service = new ProfileDictionaryService(dictDataDao);

        assertThatThrownBy(() -> service.requireChinaRegionPath(
                        "410000", "429004", null, "家乡"))
                .isInstanceOf(BusinessException.class)
                .hasMessage("REGION_NOT_SUPPORTED：家乡必须使用有效的中国大陆省市编码");
    }

    @Test
    @DisplayName("直辖市区县不属于所选省份时拒绝")
    void shouldRejectMunicipalityDistrictUnderAnotherProvince() {
        when(dictDataDao.selectEnabledByTypeAndValue("china_region", "500000"))
                .thenReturn(region(1L, 0L, "500000"));
        when(dictDataDao.selectEnabledByTypeAndValue("china_region", "500233"))
                .thenReturn(region(3L, 2L, "500233"));
        SysDictData virtualCity = region(2L, 9L, "500200");
        virtualCity.setDictLabel("县");
        when(dictDataDao.selectById(2L)).thenReturn(virtualCity);
        ProfileDictionaryService service = new ProfileDictionaryService(dictDataDao);

        assertThatThrownBy(() -> service.requireChinaRegionPath(
                        "500000", "500233", null, "现居地"))
                .isInstanceOf(BusinessException.class)
                .hasMessage("REGION_NOT_SUPPORTED：现居地必须使用有效的中国大陆省市编码");
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
