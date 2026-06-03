package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.AppUser;
import org.apache.ibatis.annotations.Mapper;

/**
 * 小程序用户 MyBatis 数据库映射接口
 * 继承 BaseMapper，获得 CRUD 能力
 */
@Mapper
public interface AppUserMapper extends BaseMapper<AppUser> {
}
