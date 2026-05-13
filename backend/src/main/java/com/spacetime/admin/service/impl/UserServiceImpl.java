package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.hutool.crypto.digest.BCrypt;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.*;
import com.spacetime.admin.dto.response.UserDetailVO;
import com.spacetime.admin.dto.response.UserVO;
import com.spacetime.admin.service.UserService;
import com.spacetime.common.dao.RoleDao;
import com.spacetime.common.dao.UserDao;
import com.spacetime.common.dao.UserRoleDao;
import com.spacetime.common.entity.SysRole;
import com.spacetime.common.entity.SysUser;
import com.spacetime.common.entity.SysUserRole;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.enums.ResultCodeEnum;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 用户管理服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserDao userDao;
    private final UserRoleDao userRoleDao;
    private final RoleDao roleDao;

    /** 分页查询用户，支持关键词和状态筛选 */
    @Override
    public Page<UserVO> list(UserPageReq req) {
        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<SysUser>()
                .like(StrUtil.isNotBlank(req.getKeyword()), SysUser::getUsername, req.getKeyword())
                .or().like(StrUtil.isNotBlank(req.getKeyword()), SysUser::getNickname, req.getKeyword())
                .eq(StrUtil.isNotBlank(req.getStatus()), SysUser::getStatus, req.getStatus())
                .orderByDesc(SysUser::getCreateTime);
        Page<SysUser> page = userDao.selectPage(
                new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<UserVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(this::toVO).toList());
        return result;
    }

    /** 查询用户详情（含角色 ID 列表） */
    @Override
    public UserDetailVO detail(Long id) {
        SysUser user = userDao.selectById(id);
        if (user == null) return null;
        UserDetailVO vo = new UserDetailVO();
        vo.setId(user.getId());
        vo.setUsername(user.getUsername());
        vo.setNickname(user.getNickname());
        vo.setEmail(user.getEmail());
        vo.setPhone(user.getPhone());
        vo.setAvatar(user.getAvatar());
        vo.setStatus(user.getStatus());
        vo.setLastLoginTime(user.getLastLoginTime());
        vo.setCreateTime(user.getCreateTime());
        List<SysUserRole> userRoles = userRoleDao.selectByUserId(id);
        vo.setRoleIds(userRoles.stream().map(SysUserRole::getRoleId).toList());
        return vo;
    }

    /** 创建用户，校验用户名唯一性，密码 BCrypt 加密 */
    @Override
    @Transactional
    public Long create(UserCreateReq req) {
        SysUser exist = userDao.selectByUsername(req.getUsername());
        if (exist != null) {
            throw new BusinessException(ResultCodeEnum.BUSINESS_ERROR.getCode(), "用户名已存在");
        }
        SysUser user = new SysUser();
        user.setUsername(req.getUsername());
        user.setPassword(BCrypt.hashpw(req.getPassword()));
        user.setNickname(req.getNickname());
        user.setEmail(req.getEmail());
        user.setPhone(req.getPhone());
        user.setStatus(req.getStatus() != null ? req.getStatus() : CommonStatusEnum.ENABLED.getCode());
        userDao.insert(user);
        log.info("user created: id={}, username={}, nickname={}", user.getId(), user.getUsername(), user.getNickname());
        return user.getId();
    }

    /** 更新用户基本信息 */
    @Override
    @Transactional
    public void update(UserUpdateReq req) {
        SysUser user = userDao.selectById(req.getId());
        if (user == null) {
            throw new BusinessException(ResultCodeEnum.BUSINESS_ERROR.getCode(), "用户不存在");
        }
        user.setNickname(req.getNickname());
        user.setEmail(req.getEmail());
        user.setPhone(req.getPhone());
        user.setStatus(req.getStatus());
        userDao.updateById(user);
        log.info("user updated: id={}, nickname={}", user.getId(), user.getNickname());
    }

    /** 删除用户，同时清理用户-角色关联 */
    @Override
    @Transactional
    public void delete(Long id) {
        userDao.deleteById(id);
        userRoleDao.deleteByUserId(id);
        log.info("user deleted: id={}", id);
    }

    /** 重置用户密码，BCrypt 加密后更新 */
    @Override
    @Transactional
    public void resetPassword(ResetPwdReq req) {
        SysUser user = userDao.selectById(req.getUserId());
        if (user == null) {
            throw new BusinessException(ResultCodeEnum.BUSINESS_ERROR.getCode(), "用户不存在");
        }
        user.setPassword(BCrypt.hashpw(req.getNewPassword()));
        userDao.updateById(user);
        log.info("user password reset: id={}", user.getId());
    }

    public static void main(String[] args) {
        System.out.println(BCrypt.hashpw("000000"));
    }

    /** 为用户分配角色：先清除旧关联，再批量插入新关联 */
    @Override
    @Transactional
    public void assignRoles(UserRoleReq req) {
        // 1. 清除旧关联
        userRoleDao.deleteByUserId(req.getUserId());
        // 2. 批量插入新关联
        if (req.getRoleIds() != null && !req.getRoleIds().isEmpty()) {
            List<SysUserRole> list = new ArrayList<>();
            for (Long roleId : req.getRoleIds()) {
                SysUserRole ur = new SysUserRole();
                ur.setUserId(req.getUserId());
                ur.setRoleId(roleId);
                list.add(ur);
            }
            userRoleDao.batchInsert(list);
        }
        log.info("user roles assigned: userId={}, roleIds={}", req.getUserId(), req.getRoleIds());
    }

    private UserVO toVO(SysUser user) {
        UserVO vo = new UserVO();
        vo.setId(user.getId());
        vo.setUsername(user.getUsername());
        vo.setNickname(user.getNickname());
        vo.setEmail(user.getEmail());
        vo.setPhone(user.getPhone());
        vo.setAvatar(user.getAvatar());
        vo.setStatus(user.getStatus());
        vo.setLastLoginTime(user.getLastLoginTime());
        vo.setCreateTime(user.getCreateTime());
        // 解析角色名称
        List<SysUserRole> userRoles = userRoleDao.selectByUserId(user.getId());
        if (!userRoles.isEmpty()) {
            List<Long> roleIds = userRoles.stream().map(SysUserRole::getRoleId).toList();
            List<SysRole> roles = roleDao.selectBatchIds(roleIds);
            vo.setRoleNames(roles.stream().map(SysRole::getRoleName).collect(Collectors.toList()));
        }
        return vo;
    }
}
