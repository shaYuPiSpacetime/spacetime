package com.spacetime.miniapp.service;

import com.spacetime.common.dao.DictDataDao;
import com.spacetime.common.entity.SysDictData;
import com.spacetime.miniapp.dto.response.DictOptionVO;
import com.spacetime.miniapp.dto.response.ProfileTagGroupVO;
import com.spacetime.miniapp.dto.response.RegionOptionVO;
import com.spacetime.miniapp.service.impl.MiniappDictServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("移动端地区字典服务")
class MiniappDictServiceImplTest {

    @Mock
    private DictDataDao dictDataDao;

    @Test
    @DisplayName("不传父编码时只返回省级地区")
    void shouldReturnProvinceOptionsOnly() {
        when(dictDataDao.selectChildren("china_region", 0L, true)).thenReturn(List.of(
                region(1L, 0L, "河南省", "410000", true),
                region(2L, 0L, "浙江省", "330000", true)
        ));
        MiniappDictService service = new MiniappDictServiceImpl(dictDataDao);

        List<RegionOptionVO> options = service.locations(null);

        assertThat(options).extracting(RegionOptionVO::getCode)
                .containsExactly("410000", "330000");
        assertThat(options).allMatch(item -> "PROVINCE".equals(item.getLevel()));
        verify(dictDataDao, never()).selectByDictType(any());
    }

    @Test
    @DisplayName("传省编码时只返回该省的城市")
    void shouldReturnCitiesByProvinceCode() {
        SysDictData province = region(1L, 0L, "河南省", "410000", true);
        when(dictDataDao.selectEnabledByTypeAndValue("china_region", "410000")).thenReturn(province);
        when(dictDataDao.selectChildren("china_region", 1L, true)).thenReturn(List.of(
                region(2L, 1L, "郑州市", "410100", true)
        ));
        MiniappDictService service = new MiniappDictServiceImpl(dictDataDao);

        List<RegionOptionVO> options = service.locations("410000");

        assertThat(options).hasSize(1);
        assertThat(options.get(0).getName()).isEqualTo("郑州市");
        assertThat(options.get(0).getLevel()).isEqualTo("CITY");
    }

    @Test
    @DisplayName("父编码不存在时返回空列表")
    void shouldReturnEmptyWhenParentCodeDoesNotExist() {
        when(dictDataDao.selectEnabledByTypeAndValue("china_region", "999999")).thenReturn(null);
        MiniappDictService service = new MiniappDictServiceImpl(dictDataDao);

        List<RegionOptionVO> options = service.locations("999999");

        assertThat(options).isEmpty();
    }

    @Test
    @DisplayName("一次返回资料页需要的字典选项，标签分类按父子关系读取")
    void shouldReturnProfileOptions() {
        when(dictDataDao.selectByDictType("app_identity")).thenReturn(List.of(dict("app_identity", "WORKER", "职场人")));
        when(dictDataDao.selectByDictType("app_education_level")).thenReturn(List.of(dict("app_education_level", "BACHELOR", "本科")));
        when(dictDataDao.selectByDictType("app_occupation")).thenReturn(List.of(dict("app_occupation", "ENGINEER", "工程师")));
        when(dictDataDao.selectByDictType("app_industry")).thenReturn(List.of(dict("app_industry", "INTERNET", "IT/互联网")));
        when(dictDataDao.selectByDictType("app_annual_income")).thenReturn(List.of(dict("app_annual_income", "FROM_150K_TO_300K", "15-30万")));
        when(dictDataDao.selectByDictType("app_marital_status")).thenReturn(List.of(dict("app_marital_status", "SINGLE", "未婚")));
        when(dictDataDao.selectByDictType("app_dating_goal")).thenReturn(List.of(dict("app_dating_goal", "TIMING_MATURE", "时机成熟就结婚")));
        when(dictDataDao.selectByDictType("app_emotional_status")).thenReturn(List.of(dict("app_emotional_status", "SEARCHING", "正在寻觅")));
        when(dictDataDao.selectByDictType("app_profile_tag")).thenReturn(List.of(
                dict(100L, 0L, "app_profile_tag", "MBTI", "MBTI"),
                dict(101L, 0L, "app_profile_tag", "SPORT", "运动"),
                dict(102L, 0L, "app_profile_tag", "FOOTPRINT", "足迹"),
                dict(1L, 100L, "app_profile_tag", "INFJ", "INFJ提倡者"),
                dict(2L, 101L, "app_profile_tag", "OUTDOOR_LOVER", "户外发烧友"),
                dict(3L, 102L, "app_profile_tag", "LOVE_TRAVEL", "热爱旅行")
        ));
        MiniappDictService service = new MiniappDictServiceImpl(dictDataDao);

        Map<String, Object> result = service.profileOptions();

        assertThat(result).containsOnlyKeys(
                "identity", "educationLevel", "industry", "occupation", "annualIncome", "maritalStatus",
                "datingGoal", "emotionalStatus", "profileTag", "profileTagGroups");
        assertThat(options(result, "identity").get(0).getCode()).isEqualTo("WORKER");
        assertThat(options(result, "educationLevel").get(0).getLabel()).isEqualTo("本科");
        assertThat(options(result, "industry").get(0).getLabel()).isEqualTo("IT/互联网");
        assertThat(options(result, "maritalStatus").get(0).getLabel()).isEqualTo("未婚");
        assertThat(options(result, "datingGoal").get(0).getCode()).isEqualTo("TIMING_MATURE");
        assertThat(options(result, "emotionalStatus").get(0).getLabel()).isEqualTo("正在寻觅");
        assertThat(options(result, "profileTag")).extracting(DictOptionVO::getCode)
                .containsExactly("INFJ", "OUTDOOR_LOVER", "LOVE_TRAVEL");
        assertThat(options(result, "profileTag").get(0).getCategoryLabel()).isEqualTo("MBTI");

        List<ProfileTagGroupVO> groups = tagGroups(result);
        assertThat(groups).extracting(ProfileTagGroupVO::getCategoryCode)
                .containsExactly("ALL", "MBTI", "SPORT", "FOOTPRINT");
        assertThat(groups.get(0).getOptions()).hasSize(3);
        assertThat(groups.get(1).getOptions()).extracting(DictOptionVO::getCode).containsExactly("INFJ");
    }

    private SysDictData region(Long id, Long parentId, String label, String value, boolean hasChildren) {
        SysDictData data = new SysDictData();
        data.setId(id);
        data.setParentId(parentId);
        data.setDictType("china_region");
        data.setDictLabel(label);
        data.setDictValue(value);
        data.setDictSort(1);
        data.setStatus("ENABLED");
        data.setHasChildren(hasChildren);
        return data;
    }

    private SysDictData dict(String type, String value, String label) {
        return dict(null, 0L, type, value, label);
    }

    private SysDictData dict(Long id, Long parentId, String type, String value, String label) {
        SysDictData data = new SysDictData();
        data.setId(id);
        data.setParentId(parentId);
        data.setDictType(type);
        data.setDictValue(value);
        data.setDictLabel(label);
        data.setDictSort(1);
        data.setStatus("ENABLED");
        return data;
    }

    @SuppressWarnings("unchecked")
    private List<DictOptionVO> options(Map<String, Object> result, String key) {
        return (List<DictOptionVO>) result.get(key);
    }

    @SuppressWarnings("unchecked")
    private List<ProfileTagGroupVO> tagGroups(Map<String, Object> result) {
        return (List<ProfileTagGroupVO>) result.get("profileTagGroups");
    }
}
