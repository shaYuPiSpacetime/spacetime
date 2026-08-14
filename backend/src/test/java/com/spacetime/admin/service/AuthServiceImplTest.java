package com.spacetime.admin.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.admin.dto.request.LoginReq;
import com.spacetime.admin.dto.response.LoginVO;
import com.spacetime.admin.service.impl.AuthServiceImpl;
import com.spacetime.common.dao.MenuDao;
import com.spacetime.common.dao.UserDao;
import com.spacetime.common.entity.SysUser;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.ArgumentCaptor;
import com.spacetime.common.interceptor.UserContext;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("AuthServiceImpl L3 测试")
class AuthServiceImplTest {

    @Mock
    private UserDao userDao;
    @Mock
    private MenuDao menuDao;
    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOps;
    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private AuthServiceImpl authService;

    private SysUser enabledUser;

    @BeforeEach
    void setUp() throws Exception {
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        enabledUser = new SysUser();
        enabledUser.setId(1L);
        enabledUser.setUsername("peter");
        enabledUser.setNickname("peter");
        enabledUser.setPassword("$2a$10$YXv7Pv6eKNlm7dUOMSWLaOUjkwhikg50Vx053I514TJEpJqJ5odpa");
        enabledUser.setStatus(CommonStatusEnum.ENABLED.getCode());
    }

    @Test
    @DisplayName("L3-01 正常登录：返回 token 和权限列表")
    void shouldLoginSuccessfully() throws Exception {
        when(userDao.selectByUsernameOrPhone("peter")).thenReturn(enabledUser);
        when(menuDao.selectPermsByUserId(1L)).thenReturn(List.of("system:user:list", "system:role:list"));
        when(menuDao.selectRoleCodesByUserId(1L)).thenReturn(List.of("super_admin"));
        when(objectMapper.writeValueAsString(any())).thenReturn("{\"id\":1}");

        LoginReq req = new LoginReq();
        req.setAccount("peter");
        req.setPassword("000000");

        LoginVO vo = authService.login(req);

        assertThat(vo.getToken()).isNotNull();
        assertThat(vo.getNickname()).isEqualTo("peter");
        assertThat(vo.getPermissions()).contains("system:user:list", "system:role:list");

        ArgumentCaptor<UserContext> contextCaptor = ArgumentCaptor.forClass(UserContext.class);
        verify(objectMapper).writeValueAsString(contextCaptor.capture());
        assertThat(contextCaptor.getValue().getRoles()).containsExactly("super_admin");
    }

    @Test
    @DisplayName("L3-02 用户不存在 → BusinessException")
    void shouldThrowWhenUserNotFound() {
        when(userDao.selectByUsernameOrPhone("nonexist")).thenReturn(null);

        LoginReq req = new LoginReq();
        req.setAccount("nonexist");
        req.setPassword("xxx");

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("用户名或密码错误");
    }

    @Test
    @DisplayName("L3-03 密码错误 → BusinessException")
    void shouldThrowWhenPasswordWrong() {
        when(userDao.selectByUsernameOrPhone("peter")).thenReturn(enabledUser);

        LoginReq req = new LoginReq();
        req.setAccount("peter");
        req.setPassword("wrongpassword");

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("用户名或密码错误");
    }

    @Test
    @DisplayName("L3-04 账号已禁用 → BusinessException")
    void shouldThrowWhenUserDisabled() {
        enabledUser.setStatus(CommonStatusEnum.DISABLED.getCode());
        when(userDao.selectByUsernameOrPhone("peter")).thenReturn(enabledUser);

        LoginReq req = new LoginReq();
        req.setAccount("peter");
        req.setPassword("000000");

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("账号已禁用");
    }

    @Test
    @DisplayName("L3-05 查询当前权限：始终读取角色菜单最新授权")
    void shouldReturnCurrentPermissionsFromDatabase() {
        when(menuDao.selectPermsByUserId(1L))
                .thenReturn(List.of("user:app:list", "user:app:relation:view"));

        assertThat(authService.getCurrentPermissions(1L))
                .containsExactly("user:app:list", "user:app:relation:view");
    }
}
