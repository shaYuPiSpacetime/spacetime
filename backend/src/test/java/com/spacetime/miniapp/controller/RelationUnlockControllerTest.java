package com.spacetime.miniapp.controller;

import com.spacetime.common.exception.GlobalExceptionHandler;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.miniapp.dto.response.UnlockConfirmVO;
import com.spacetime.miniapp.dto.response.UnlockQuoteVO;
import com.spacetime.miniapp.service.AssetService;
import com.spacetime.miniapp.service.RelationUnlockService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 喜欢/访客单条解锁必须走报价和确认两个接口。 */
@ExtendWith(MockitoExtension.class)
class RelationUnlockControllerTest {
    @Mock private AssetService assetService;
    @Mock private RelationUnlockService relationUnlockService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        UserContextHolder.set(new UserContext(7L, "移动端用户", List.of(), List.of()));
        mockMvc = MockMvcBuilders.standaloneSetup(new AssetController(assetService, relationUnlockService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @AfterEach
    void tearDown() {
        UserContextHolder.clear();
    }

    @Test
    void exposesQuoteAndConfirmRoutes() throws Exception {
        UnlockQuoteVO quote = new UnlockQuoteVO();
        quote.setQuoteToken("uq-token");
        quote.setUnitPrice(8);
        when(relationUnlockService.quote(eq(7L), any())).thenReturn(quote);
        UnlockConfirmVO confirm = new UnlockConfirmVO();
        confirm.setUnlockNo("ULK-001");
        confirm.setTargetUserId(8L);
        when(relationUnlockService.confirm(eq(7L), any())).thenReturn(confirm);

        mockMvc.perform(post("/miniapp/asset/unlock/quote")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"scene":"likes_unlock_one","targetBizType":"like","targetBizNo":"LIK-001"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.quoteToken").value("uq-token"))
                .andExpect(jsonPath("$.data.unitPrice").value(8));
        mockMvc.perform(post("/miniapp/asset/unlock/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"requestId\":\"unlock-001\",\"quoteToken\":\"uq-token\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.unlockNo").value("ULK-001"))
                .andExpect(jsonPath("$.data.targetUserId").value(8));
    }
}
