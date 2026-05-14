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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("DictDataServiceImpl L3 测试")
class DictDataServiceImplTest {

    @Mock
    private DictDataDao dictDataDao;
    @Mock
    private DictTypeDao dictTypeDao;

    @InjectMocks
    private DictDataServiceImpl dictDataService;

    @Test
    @DisplayName("L3-D2-01 树构建-多级嵌套")
    void shouldBuildMultiLevelTree() {
        SysDictData parent = buildData(1L, 0L, "性别", "gender", "男", "male");
        SysDictData child = buildData(2L, 1L, "gender", "gender", "男性", "male_full");
        when(dictDataDao.selectList(any())).thenReturn(List.of(parent, child));

        List<DictDataVO> tree = dictDataService.tree("gender");

        assertThat(tree).hasSize(1);
        assertThat(tree.get(0).getDictLabel()).isEqualTo("男");
        assertThat(tree.get(0).getChildren()).hasSize(1);
        assertThat(tree.get(0).getChildren().get(0).getDictLabel()).isEqualTo("男性");
    }

    @Test
    @DisplayName("L3-D2-02 树构建-空数据")
    void shouldReturnEmptyTree() {
        when(dictDataDao.selectList(any())).thenReturn(List.of());

        List<DictDataVO> tree = dictDataService.tree("empty");

        assertThat(tree).isEmpty();
    }

    @Test
    @DisplayName("L3-D2-03 创建-默认值生效")
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
    @DisplayName("L3-D2-04 更新-实体不存在")
    void shouldRejectUpdateNotFound() {
        DictDataUpdateReq req = new DictDataUpdateReq();
        req.setId(999L);
        req.setDictType("gender");
        req.setDictLabel("不存在");
        req.setDictValue("nx");
        when(dictDataDao.selectById(999L)).thenReturn(null);

        assertThatThrownBy(() -> dictDataService.update(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("字典数据不存在");
    }

    @Test
    @DisplayName("L3-D2-05 级联删除-3层嵌套")
    void shouldCascadeDeleteThreeLevels() {
        SysDictData grandpa = buildData(1L, 0L, "gender", "gender", "祖", "z");
        SysDictData dad = buildData(2L, 1L, "gender", "gender", "父", "f");
        SysDictData son = buildData(3L, 2L, "gender", "gender", "子", "s");
        when(dictDataDao.selectList(any())).thenReturn(List.of(grandpa, dad, son));

        dictDataService.delete(1L);

        verify(dictDataDao).deleteById(1L);
        verify(dictDataDao).deleteById(2L);
        verify(dictDataDao).deleteById(3L);
    }

    private SysDictData buildData(Long id, Long parentId, String dictType, String dictType2, String label, String value) {
        SysDictData d = new SysDictData();
        d.setId(id);
        d.setParentId(parentId);
        d.setDictType(dictType);
        d.setDictLabel(label);
        d.setDictValue(value);
        d.setDictSort(1);
        d.setStatus("ENABLED");
        return d;
    }
}
