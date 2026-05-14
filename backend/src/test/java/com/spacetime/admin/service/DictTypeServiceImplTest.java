package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.DictTypeCreateReq;
import com.spacetime.admin.dto.request.DictTypeUpdateReq;
import com.spacetime.admin.service.impl.DictTypeServiceImpl;
import com.spacetime.common.dao.DictDataDao;
import com.spacetime.common.dao.DictTypeDao;
import com.spacetime.common.entity.SysDictType;
import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("DictTypeServiceImpl L3 测试")
class DictTypeServiceImplTest {

    @Mock
    private DictTypeDao dictTypeDao;
    @Mock
    private DictDataDao dictDataDao;

    @InjectMocks
    private DictTypeServiceImpl dictTypeService;

    @Test
    @DisplayName("L3-D1-01 创建成功，默认值生效")
    void shouldCreateWithDefaults() {
        DictTypeCreateReq req = new DictTypeCreateReq();
        req.setDictName("性别");
        req.setDictType("gender");
        when(dictTypeDao.selectByCode("gender")).thenReturn(null);

        dictTypeService.create(req);

        ArgumentCaptor<SysDictType> captor = ArgumentCaptor.forClass(SysDictType.class);
        verify(dictTypeDao).insert(captor.capture());
        SysDictType entity = captor.getValue();
        assertThat(entity.getDictName()).isEqualTo("性别");
        assertThat(entity.getDictType()).isEqualTo("gender");
        assertThat(entity.getDictSort()).isEqualTo(0);
        assertThat(entity.getStatus()).isEqualTo("ENABLED");
    }

    @Test
    @DisplayName("L3-D1-02 创建时编码重复抛异常")
    void shouldRejectDuplicateCode() {
        DictTypeCreateReq req = new DictTypeCreateReq();
        req.setDictName("性别");
        req.setDictType("gender");
        SysDictType exist = new SysDictType();
        exist.setId(1L);
        exist.setDictType("gender");
        when(dictTypeDao.selectByCode("gender")).thenReturn(exist);

        assertThatThrownBy(() -> dictTypeService.create(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("字典类型编码已存在");
        verify(dictTypeDao, never()).insert(any());
    }

    @Test
    @DisplayName("L3-D1-03 更新-实体不存在")
    void shouldRejectUpdateNotFound() {
        DictTypeUpdateReq req = new DictTypeUpdateReq();
        req.setId(999L);
        req.setDictName("不存在");
        req.setDictType("nx");
        when(dictTypeDao.selectById(999L)).thenReturn(null);

        assertThatThrownBy(() -> dictTypeService.update(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("字典类型不存在");
    }

    @Test
    @DisplayName("L3-D1-04 更新-编码被其他记录占用")
    void shouldRejectCodeConflict() {
        SysDictType self = new SysDictType();
        self.setId(1L);
        self.setDictType("old_code");
        SysDictType other = new SysDictType();
        other.setId(2L);
        other.setDictType("new_code");
        when(dictTypeDao.selectById(1L)).thenReturn(self);
        when(dictTypeDao.selectByCode("new_code")).thenReturn(other);

        DictTypeUpdateReq req = new DictTypeUpdateReq();
        req.setId(1L);
        req.setDictName("更新");
        req.setDictType("new_code");

        assertThatThrownBy(() -> dictTypeService.update(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("字典类型编码已被其他字典使用");
    }

    @Test
    @DisplayName("L3-D1-05 删除-级联删关联字典数据")
    void shouldCascadeDeleteDictData() {
        SysDictType entity = new SysDictType();
        entity.setId(1L);
        entity.setDictType("gender");
        when(dictTypeDao.selectById(1L)).thenReturn(entity);

        dictTypeService.delete(1L);

        verify(dictDataDao).deleteByDictType("gender");
        verify(dictTypeDao).deleteById(1L);
    }
}
