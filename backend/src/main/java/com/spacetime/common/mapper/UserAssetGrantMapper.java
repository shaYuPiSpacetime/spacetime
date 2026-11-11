package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.UserAssetGrant;
import org.apache.ibatis.annotations.Mapper;

/** 资产赠送台账数据库映射。 */
@Mapper
public interface UserAssetGrantMapper extends BaseMapper<UserAssetGrant> {}
