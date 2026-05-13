package com.spacetime.admin.controller;

import com.spacetime.admin.dto.response.MenuVO;
import com.spacetime.admin.service.MenuService;
import com.spacetime.common.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("MenuController L2 测试")
class MenuControllerTest {

    @Mock
    private MenuService menuService;

    @InjectMocks
    private MenuController menuController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(menuController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("L2-19 菜单列表查询")
    void shouldReturnMenuList() throws Exception {
        MenuVO vo = new MenuVO();
        vo.setId(1L);
        vo.setMenuName("系统管理");
        vo.setMenuType("M");
        when(menuService.list()).thenReturn(List.of(vo));

        mockMvc.perform(get("/admin/menu/list"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].menuName").value("系统管理"));
    }

    @Test
    @DisplayName("L2-20 菜单树查询")
    void shouldReturnMenuTree() throws Exception {
        MenuVO root = new MenuVO();
        root.setId(1L);
        root.setMenuName("系统管理");
        root.setMenuType("M");
        MenuVO child = new MenuVO();
        child.setId(2L);
        child.setMenuName("用户管理");
        child.setMenuType("C");
        child.setParentId(1L);
        root.setChildren(List.of(child));
        when(menuService.tree()).thenReturn(List.of(root));

        mockMvc.perform(get("/admin/menu/tree"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].children[0].menuName").value("用户管理"));
    }

    @Test
    @DisplayName("L2-21 菜单详情查询")
    void shouldReturnMenuDetail() throws Exception {
        MenuVO vo = new MenuVO();
        vo.setId(1L);
        vo.setMenuName("系统管理");
        vo.setMenuType("M");
        when(menuService.detail(1L)).thenReturn(vo);

        mockMvc.perform(get("/admin/menu/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.menuName").value("系统管理"));
    }

    @Test
    @DisplayName("L2-22 创建菜单，返回新菜单ID")
    void shouldCreateMenu() throws Exception {
        when(menuService.create(any())).thenReturn(1L);

        mockMvc.perform(post("/admin/menu")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"menuName\":\"测试菜单\",\"menuType\":\"M\",\"path\":\"/test\",\"menuSort\":99}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").value(1));
    }

    @Test
    @DisplayName("L2-23 更新菜单")
    void shouldUpdateMenu() throws Exception {
        doNothing().when(menuService).update(any());

        mockMvc.perform(put("/admin/menu/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"menuName\":\"已更新\",\"menuType\":\"M\",\"path\":\"/test\",\"menuSort\":99}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    @DisplayName("L2-24 删除菜单")
    void shouldDeleteMenu() throws Exception {
        doNothing().when(menuService).delete(1L);

        mockMvc.perform(delete("/admin/menu/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }
}
