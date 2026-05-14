package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.DictTypeCreateReq;
import com.spacetime.admin.dto.request.DictTypePageReq;
import com.spacetime.admin.dto.request.DictTypeUpdateReq;
import com.spacetime.admin.dto.response.DictTypeVO;
import com.spacetime.admin.service.DictTypeService;
import com.spacetime.common.dao.DictDataDao;
import com.spacetime.common.dao.DictTypeDao;
import com.spacetime.common.entity.SysDictType;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.enums.ResultCodeEnum;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 字典类型服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DictTypeServiceImpl implements DictTypeService {

    private final DictTypeDao dictTypeDao;
    private final DictDataDao dictDataDao;

    @Override
    public Page<DictTypeVO> list(DictTypePageReq req) {
        LambdaQueryWrapper<SysDictType> wrapper = new LambdaQueryWrapper<SysDictType>()
                .and(StrUtil.isNotBlank(req.getKeyword()), w -> w
                        .like(SysDictType::getDictName, req.getKeyword())
                        .or()
                        .like(SysDictType::getDictType, req.getKeyword()))
                .eq(StrUtil.isNotBlank(req.getStatus()), SysDictType::getStatus, req.getStatus())
                .orderByAsc(SysDictType::getDictSort);
        Page<SysDictType> page = dictTypeDao.selectPage(
                new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<DictTypeVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(this::toVO).toList());
        return result;
    }

    @Override
    public List<DictTypeVO> all() {
        return dictTypeDao.selectAll().stream().map(this::toVO).toList();
    }

    @Override
    @Transactional
    public Long create(DictTypeCreateReq req) {
        SysDictType exist = dictTypeDao.selectByCode(req.getDictType());
        if (exist != null) {
            throw new BusinessException(ResultCodeEnum.BUSINESS_ERROR.getCode(), "字典类型编码已存在");
        }
        SysDictType entity = new SysDictType();
        entity.setDictName(req.getDictName());
        entity.setDictType(req.getDictType());
        entity.setDictSort(req.getDictSort() != null ? req.getDictSort() : 0);
        entity.setStatus(req.getStatus() != null ? req.getStatus() : CommonStatusEnum.ENABLED.getCode());
        entity.setRemark(req.getRemark());
        dictTypeDao.insert(entity);
        log.info("dict type created: id={}, dictName={}, dictType={}", entity.getId(), entity.getDictName(), entity.getDictType());
        return entity.getId();
    }

    @Override
    @Transactional
    public void update(DictTypeUpdateReq req) {
        SysDictType entity = dictTypeDao.selectById(req.getId());
        if (entity == null) {
            throw new BusinessException(ResultCodeEnum.BUSINESS_ERROR.getCode(), "字典类型不存在");
        }
        SysDictType byCode = dictTypeDao.selectByCode(req.getDictType());
        if (byCode != null && !byCode.getId().equals(req.getId())) {
            throw new BusinessException(ResultCodeEnum.BUSINESS_ERROR.getCode(), "字典类型编码已被其他字典使用");
        }
        entity.setDictName(req.getDictName());
        entity.setDictType(req.getDictType());
        entity.setDictSort(req.getDictSort());
        entity.setStatus(req.getStatus());
        entity.setRemark(req.getRemark());
        dictTypeDao.updateById(entity);
        log.info("dict type updated: id={}, dictName={}", entity.getId(), entity.getDictName());
    }

    @Override
    @Transactional
    public void delete(Long id) {
        SysDictType entity = dictTypeDao.selectById(id);
        if (entity != null) {
            dictDataDao.deleteByDictType(entity.getDictType());
        }
        dictTypeDao.deleteById(id);
        log.info("dict type deleted: id={}", id);
    }

    private DictTypeVO toVO(SysDictType entity) {
        DictTypeVO vo = new DictTypeVO();
        vo.setId(entity.getId());
        vo.setDictName(entity.getDictName());
        vo.setDictType(entity.getDictType());
        vo.setDictSort(entity.getDictSort());
        vo.setStatus(entity.getStatus());
        vo.setRemark(entity.getRemark());
        vo.setCreateTime(entity.getCreateTime());
        return vo;
    }
}
