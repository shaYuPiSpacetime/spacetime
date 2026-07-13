package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.DictDataCreateReq;
import com.spacetime.admin.dto.request.DictDataUpdateReq;
import com.spacetime.admin.dto.response.DictDataVO;
import com.spacetime.admin.service.impl.DictDataServiceImpl;
import com.spacetime.common.dao.DictDataDao;
import com.spacetime.common.dao.DictTypeDao;
import com.spacetime.common.entity.SysDictData;
import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("字典数据服务测试")
class DictDataServiceImplTest {

    @Mock
    private DictDataDao dictDataDao;
    @Mock
    private DictTypeDao dictTypeDao;

    @InjectMocks
    private DictDataServiceImpl dictDataService;

    @Test
    @DisplayName("L3-D2-01 只查询指定父节点的直接子级")
    void shouldReturnDirectChildrenOnly() {
        SysDictData province = buildData(1L, 0L, "china_region", "河南省", "410000");
        province.setHasChildren(true);
        when(dictDataDao.selectChildren("china_region", 0L, false)).thenReturn(List.of(province));

        List<DictDataVO> children = dictDataService.children("china_region", 0L);

        assertThat(children).hasSize(1);
        assertThat(children.get(0).getDictLabel()).isEqualTo("河南省");
        assertThat(children.get(0).getHasChildren()).isTrue();
        assertThat(children.get(0).getChildren()).isNull();
        verify(dictDataDao, never()).selectByDictType(any());
    }

    @Test
    @DisplayName("L3-D2-02 子级为空时返回空列表")
    void shouldReturnEmptyChildren() {
        when(dictDataDao.selectChildren("china_region", 410L, false)).thenReturn(List.of());

        List<DictDataVO> children = dictDataService.children("china_region", 410L);

        assertThat(children).isEmpty();
    }

    @Test
    @DisplayName("L3-D2-03 创建时使用默认值")
    void shouldCreateWithDefaults() {
        DictDataCreateReq req = new DictDataCreateReq();
        req.setDictType("gender");
        req.setDictLabel("男");
        req.setDictValue("male");

        dictDataService.create(req);

        ArgumentCaptor<SysDictData> captor = ArgumentCaptor.forClass(SysDictData.class);
        verify(dictDataDao).insert(captor.capture());
        SysDictData entity = captor.getValue();
        assertThat(entity.getParentId()).isEqualTo(0L);
        assertThat(entity.getDictSort()).isEqualTo(0);
        assertThat(entity.getStatus()).isEqualTo("ENABLED");
    }

    @Test
    @DisplayName("L3-D2-04 更新不存在的数据时拒绝")
    void shouldRejectUpdateNotFound() {
        DictDataUpdateReq req = new DictDataUpdateReq();
        req.setId(999L);
        req.setDictType("gender");
        req.setDictLabel("不存在");
        req.setDictValue("nx");
        when(dictDataDao.selectById(999L)).thenReturn(null);

        assertThatThrownBy(() -> dictDataService.update(req))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("L3-D2-05 级联删除三层节点")
    void shouldCascadeDeleteThreeLevels() {
        SysDictData grandpa = buildData(1L, 0L, "gender", "祖", "z");
        SysDictData dad = buildData(2L, 1L, "gender", "父", "f");
        SysDictData son = buildData(3L, 2L, "gender", "子", "s");
        when(dictDataDao.selectList(any())).thenReturn(List.of(grandpa, dad, son));

        dictDataService.delete(1L);

        verify(dictDataDao).deleteById(1L);
        verify(dictDataDao).deleteById(2L);
        verify(dictDataDao).deleteById(3L);
    }

    private SysDictData buildData(Long id, Long parentId, String dictType, String label, String value) {
        SysDictData data = new SysDictData();
        data.setId(id);
        data.setParentId(parentId);
        data.setDictType(dictType);
        data.setDictLabel(label);
        data.setDictValue(value);
        data.setDictSort(1);
        data.setStatus("ENABLED");
        return data;
    }
}
