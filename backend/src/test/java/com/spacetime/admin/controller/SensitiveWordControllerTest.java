package com.spacetime.admin.controller;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.service.impl.SensitiveWordServiceImpl;
import com.spacetime.common.dao.*;
import com.spacetime.common.entity.ContentSensitiveWord;
import com.spacetime.common.service.*;
import com.spacetime.common.interceptor.*;
import com.spacetime.common.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.*;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.mockito.Mockito.*;
import java.util.List;
/** L2-01/02/03: real controller/service and PermissionInterceptor, mocked storage only. */
class SensitiveWordControllerTest {
    private final SensitiveWordDao dao=mock(SensitiveWordDao.class);
    private final MenuDao menus=mock(MenuDao.class);
    private MockMvc mvc;
    @BeforeEach void setup(){
        mvc=MockMvcBuilders.standaloneSetup(new SensitiveWordController(new SensitiveWordServiceImpl(dao,mock(LocalSensitiveWordService.class),mock(AfterCommitExecutor.class))))
            .setControllerAdvice(new GlobalExceptionHandler()).addInterceptors(new PermissionInterceptor(menus)).build();
        UserContextHolder.set(new UserContext(1L,"test",List.of(),List.of()));
        when(menus.selectPermsByUserId(1L)).thenReturn(List.of("sensitive-word:list","sensitive-word:add","sensitive-word:edit","sensitive-word:delete"));
        when(dao.lockRevision()).thenReturn(1L);
    }
    @AfterEach void clear(){UserContextHolder.clear();}
    @Test void sevenRoutesBindToRealService() throws Exception {
        var row=new ContentSensitiveWord();row.setId(2L);row.setWord("test");row.setCategoryCode("OTHER");row.setStatus("ENABLED");
        when(dao.page(1,20,null,null,null)).thenReturn(new Page<>(1,20));when(dao.findById(2L)).thenReturn(row);when(dao.findCurrent(2L)).thenReturn(row);
        mvc.perform(get("/admin/sensitive-words")).andExpect(jsonPath("$.code").value(200));
        mvc.perform(get("/admin/sensitive-words/categories")).andExpect(jsonPath("$.data.length()").value(18));
        mvc.perform(get("/admin/sensitive-words/2")).andExpect(jsonPath("$.data.word").value("test"));
        String body="{\"word\":\"test\",\"categoryCode\":\"OTHER\",\"status\":\"ENABLED\"}";
        mvc.perform(post("/admin/sensitive-words").contentType("application/json").content(body)).andExpect(jsonPath("$.code").value(200));
        mvc.perform(put("/admin/sensitive-words/2").contentType("application/json").content(body)).andExpect(jsonPath("$.code").value(200));
        mvc.perform(patch("/admin/sensitive-words/2/status").contentType("application/json").content("{\"status\":\"DISABLED\"}")).andExpect(jsonPath("$.code").value(200));
        mvc.perform(delete("/admin/sensitive-words/2")).andExpect(jsonPath("$.code").value(200));
        verify(dao).updateStatus(2L,"DISABLED");verify(dao).delete(2L);
    }
    @Test void invalidParametersNeverReachStorage() throws Exception {
        for(String query:List.of("page=0","size=101","page=abc","keyword="+"x".repeat(257),"categoryCode=BAD","status=bad"))
            mvc.perform(get("/admin/sensitive-words?"+query)).andExpect(jsonPath("$.code").value(4001));
        mvc.perform(get("/admin/sensitive-words/-1")).andExpect(jsonPath("$.code").value(4001));
        mvc.perform(post("/admin/sensitive-words").contentType("application/json").content(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(java.util.Map.of("word"," ","categoryCode","OTHER")))).andExpect(jsonPath("$.code").value(4001));
        verify(dao,never()).insert(any());verify(dao,never()).lockRevision();
    }
    @Test void realInterceptorSeparatesListWriteAndDeletePermission() throws Exception {
        when(menus.selectPermsByUserId(1L)).thenReturn(List.of("sensitive-word:list"));
        mvc.perform(get("/admin/sensitive-words/categories")).andExpect(status().isOk());
        mvc.perform(post("/admin/sensitive-words").contentType("application/json").content("{}")).andExpect(status().isForbidden());
        mvc.perform(put("/admin/sensitive-words/2").contentType("application/json").content("{}")).andExpect(status().isForbidden());
        mvc.perform(patch("/admin/sensitive-words/2/status").contentType("application/json").content("{}")).andExpect(status().isForbidden());
        mvc.perform(delete("/admin/sensitive-words/2")).andExpect(status().isForbidden());
        UserContextHolder.clear();mvc.perform(get("/admin/sensitive-words/categories")).andExpect(status().isForbidden());
        verifyNoInteractions(dao);
    }
}
