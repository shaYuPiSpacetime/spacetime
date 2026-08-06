package com.spacetime.miniapp.controller;

import com.spacetime.common.exception.GlobalExceptionHandler;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.miniapp.dto.response.IdealMetaVO;
import com.spacetime.miniapp.dto.response.IdealHelpVO;
import com.spacetime.miniapp.dto.response.IdealResultPageVO;
import com.spacetime.miniapp.dto.response.IdealSearchRecordPageVO;
import com.spacetime.miniapp.dto.response.IdealSearchVO;
import com.spacetime.miniapp.dto.response.IdealUnlockConfirmVO;
import com.spacetime.miniapp.dto.response.IdealUnlockQuoteVO;
import com.spacetime.miniapp.dto.response.IdealUnlockRecordPageVO;
import com.spacetime.miniapp.service.IdealHistoryService;
import com.spacetime.miniapp.service.IdealService;
import com.spacetime.miniapp.service.IdealUnlockService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** PRD-08 理想型接口路由契约。 */
@ExtendWith(MockitoExtension.class)
class IdealControllerTest {
    @Mock private IdealService idealService;
    @Mock private IdealUnlockService idealUnlockService;
    @Mock private IdealHistoryService idealHistoryService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        UserContextHolder.set(new UserContext(7L, "移动端用户", List.of(), List.of()));
        mockMvc = MockMvcBuilders.standaloneSetup(
                        new IdealController(idealService, idealUnlockService, idealHistoryService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @AfterEach
    void tearDown() {
        UserContextHolder.clear();
    }

    @Test
    void exposesMetaSearchAndSnapshotResults() throws Exception {
        IdealMetaVO meta = new IdealMetaVO();
        meta.setPreferenceVersion(2);
        IdealSearchVO searched = new IdealSearchVO();
        searched.setSnapshotNo("IDS-001");
        searched.setResultCount(3);
        IdealResultPageVO results = new IdealResultPageVO();
        results.setSnapshotNo("IDS-001");
        results.setItems(List.of());
        when(idealService.getMeta(7L)).thenReturn(meta);
        when(idealService.search(eq(7L), any())).thenReturn(searched);
        when(idealService.getResults(7L, "IDS-001", "cursor-001")).thenReturn(results);

        mockMvc.perform(get("/miniapp/ideal/meta"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.preferenceVersion").value(2));
        mockMvc.perform(post("/miniapp/ideal/search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"requestId":"search-001","preferenceVersion":2,
                                 "targetCityCodes":["320100"],"minAge":24,"maxAge":34,
                                 "conditionCodes":["M08-IDEAL-height-165"]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.snapshotNo").value("IDS-001"))
                .andExpect(jsonPath("$.data.resultCount").value(3));
        mockMvc.perform(get("/miniapp/ideal/snapshots/IDS-001/results")
                        .param("cursor", "cursor-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.snapshotNo").value("IDS-001"));
    }

    @Test
    void exposesSelectedAllAndConfirmUnlockEndpoints() throws Exception {
        IdealUnlockQuoteVO selected = new IdealUnlockQuoteVO();
        selected.setQuoteToken("iuq_selected");
        selected.setPayableCost(10);
        IdealUnlockQuoteVO all = new IdealUnlockQuoteVO();
        all.setQuoteToken("iuq_all");
        all.setPayableCost(18);
        all.setDiscountPercent(10);
        IdealUnlockConfirmVO confirmed = new IdealUnlockConfirmVO();
        confirmed.setPaidCost(18);
        confirmed.setNewBalance(82);
        when(idealUnlockService.quote(eq(7L), any())).thenReturn(selected);
        when(idealUnlockService.quoteAll(eq(7L), any())).thenReturn(all);
        when(idealUnlockService.confirm(eq(7L), any())).thenReturn(confirmed);

        mockMvc.perform(post("/miniapp/ideal/unlock/quote")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"snapshotNo":"IDS-001","itemNos":["IDI-001"]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.quoteToken").value("iuq_selected"))
                .andExpect(jsonPath("$.data.payableCost").value(10));
        mockMvc.perform(post("/miniapp/ideal/unlock-all/quote")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"snapshotNo\":\"IDS-001\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.quoteToken").value("iuq_all"))
                .andExpect(jsonPath("$.data.discountPercent").value(10));
        mockMvc.perform(post("/miniapp/ideal/unlock/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"quoteToken":"iuq_all","requestId":"unlock-001"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.paidCost").value(18))
                .andExpect(jsonPath("$.data.newBalance").value(82));
    }

    @Test
    void exposesSearchRecordsUnlockRecordsAndHelpEndpoints() throws Exception {
        IdealSearchRecordPageVO searches = new IdealSearchRecordPageVO();
        searches.setItems(List.of());
        searches.setTotal(2L);
        IdealUnlockRecordPageVO unlocks = new IdealUnlockRecordPageVO();
        unlocks.setItems(List.of());
        unlocks.setTotal(1L);
        IdealHelpVO help = new IdealHelpVO();
        help.setTitle("什么是理想型？");
        when(idealHistoryService.searchRecords(7L, "cursor-search")).thenReturn(searches);
        when(idealHistoryService.unlockRecords(7L, "active", "cursor-unlock")).thenReturn(unlocks);
        when(idealHistoryService.help(7L)).thenReturn(help);

        mockMvc.perform(get("/miniapp/ideal/search-records").param("cursor", "cursor-search"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(2));
        mockMvc.perform(get("/miniapp/ideal/unlocks")
                        .param("status", "active").param("cursor", "cursor-unlock"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(1));
        mockMvc.perform(get("/miniapp/ideal/help"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("什么是理想型？"));
    }
}
