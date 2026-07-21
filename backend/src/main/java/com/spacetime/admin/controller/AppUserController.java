package com.spacetime.admin.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.AppUserPageReq;
import com.spacetime.admin.dto.request.RelationPageReq;
import com.spacetime.admin.dto.request.RelationUnlockPageReq;
import com.spacetime.admin.dto.request.UpdateStatusReq;
import com.spacetime.admin.dto.response.AppUserRelationLikeVO;
import com.spacetime.admin.dto.response.AppUserRelationMatchVO;
import com.spacetime.admin.dto.response.AppUserRelationSummaryVO;
import com.spacetime.admin.dto.response.AppUserRelationUnlockVO;
import com.spacetime.admin.dto.response.AppUserRelationVisitVO;
import com.spacetime.admin.dto.response.AppUserDetailVO;
import com.spacetime.admin.dto.response.AppUserListVO;
import com.spacetime.admin.dto.response.AppUserStatsVO;
import com.spacetime.admin.dto.response.AppUserWorkflowHistoryVO;
import com.spacetime.admin.dto.response.ExportTaskVO;
import com.spacetime.admin.dto.response.ImportBatchVO;
import com.spacetime.admin.service.AppUserAdminService;
import com.spacetime.admin.service.AppUserRelationAdminService;
import com.spacetime.common.annotation.RequirePermission;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

/**
 * 管理后台 — 小程序用户管理接口
 * 提供用户列表分页查询、详情查看、账号状态变更（冻结/解冻）
 */
@RestController
@RequestMapping("/admin/users/app")
@RequiredArgsConstructor
public class AppUserController {

    private final AppUserAdminService appUserAdminService;
    private final AppUserRelationAdminService appUserRelationAdminService;
    private static final Pattern XLSX_CELL_REF = Pattern.compile("([A-Z]+)");

    /**
     * 用户列表分页查询
     * @param req 筛选条件（关键词/昵称/学校/性别/状态/认证状态）
     * @return 分页用户列表
     */
    @GetMapping("/list")
    @RequirePermission("user:app:list")
    public R<Page<AppUserListVO>> list(@Valid AppUserPageReq req) {
        return R.ok(appUserAdminService.getUserPage(req));
    }

    /** APP 用户管理页头部统计。 */
    @GetMapping("/stats")
    @RequirePermission("user:app:list")
    public R<AppUserStatsVO> stats() {
        return R.ok(appUserAdminService.getUserStats());
    }

    /**
     * 用户详情
     * @param id 用户ID
     * @return 用户完整资料 + 认证信息
     */
    @GetMapping("/{id}")
    @RequirePermission("user:app:detail")
    public R<AppUserDetailVO> detail(@PathVariable Long id) {
        return R.ok(appUserAdminService.getUserDetail(id));
    }

    /** 查询 APP 用户关系反馈摘要。 */
    @GetMapping("/{userId}/relations/summary")
    @RequirePermission("user:app:relation:view")
    public R<AppUserRelationSummaryVO> relationSummary(@PathVariable Long userId) {
        return R.ok(appUserRelationAdminService.summary(userId));
    }

    /** 分页查询 APP 用户喜欢关系。 */
    @GetMapping("/{userId}/relations/likes")
    @RequirePermission("user:app:relation:view")
    public R<Page<AppUserRelationLikeVO>> relationLikes(@PathVariable Long userId, RelationPageReq req) {
        return R.ok(appUserRelationAdminService.likes(userId, req));
    }

    /** 分页查询 APP 用户访客关系。 */
    @GetMapping("/{userId}/relations/visits")
    @RequirePermission("user:app:relation:view")
    public R<Page<AppUserRelationVisitVO>> relationVisits(@PathVariable Long userId, RelationPageReq req) {
        return R.ok(appUserRelationAdminService.visits(userId, req));
    }

    /** 分页查询 APP 用户相互喜欢关系。 */
    @GetMapping("/{userId}/relations/matches")
    @RequirePermission("user:app:relation:view")
    public R<Page<AppUserRelationMatchVO>> relationMatches(@PathVariable Long userId, RelationPageReq req) {
        return R.ok(appUserRelationAdminService.matches(userId, req));
    }

    /** 分页查询 APP 用户关系单条解锁记录。 */
    @GetMapping("/{userId}/relations/unlocks")
    @RequirePermission("user:app:relation:view")
    public R<Page<AppUserRelationUnlockVO>> relationUnlocks(@PathVariable Long userId, RelationUnlockPageReq req) {
        return R.ok(appUserRelationAdminService.unlocks(userId, req));
    }

    /**
     * 变更用户账号状态（冻结/解冻）
     * @param id 用户ID
     * @param req 目标状态
     */
    @PutMapping("/{id}/status")
    @RequirePermission("user:app:freeze")
    public R<Void> updateStatus(@PathVariable Long id, @Valid @RequestBody UpdateStatusReq req) {
        appUserAdminService.updateUserStatus(id, req.getStatus());
        return R.ok();
    }

    /**
     * 批量导入 App 用户预校验。
     *
     * @param file CSV 文件，首版按模板表头预校验
     * @return 批次统计
     */
    @PostMapping("/import")
    @RequirePermission("user:app:import")
    public R<ImportBatchVO> previewImport(@RequestParam("file") MultipartFile file) {
        try {
            String content = readImportContent(file);
            return R.ok(appUserAdminService.previewImport(file.getOriginalFilename(), content));
        } catch (IOException e) {
            throw new BusinessException("导入文件读取失败");
        }
    }

    /**
     * 创建固定字段导出任务。
     *
     * @param req           筛选条件
     * @param confirmNoMask 是否确认固定字段不掩码导出
     * @return 导出任务
     */
    @PostMapping("/export")
    @RequirePermission("user:app:export")
    public R<ExportTaskVO> export(AppUserPageReq req,
                                  @RequestParam(defaultValue = "false") boolean confirmNoMask) {
        return R.ok(appUserAdminService.exportFixedFields(req, confirmNoMask));
    }

    @GetMapping("/workflow-history")
    @RequirePermission("user:app:list")
    public R<Page<AppUserWorkflowHistoryVO>> workflowHistory(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size) {
        return R.ok(appUserAdminService.getWorkflowHistory(page, size));
    }

    /**
     * 导入文件统一转成 CSV 文本，服务层只关注表头和行数据校验。
     */
    private String readImportContent(MultipartFile file) throws IOException {
        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        byte[] bytes = file.getBytes();
        if (filename.endsWith(".xlsx")) {
            return xlsxToCsv(bytes);
        }
        if (filename.endsWith(".xls")) {
            throw new BusinessException("暂不支持 xls，请另存为 xlsx 或 CSV 后再导入");
        }
        return stripUtf8Bom(new String(bytes, StandardCharsets.UTF_8));
    }

    /**
     * 轻量解析 xlsx：读取第一张工作表，转换成逗号分隔文本。
     */
    private String xlsxToCsv(byte[] bytes) throws IOException {
        Map<String, byte[]> entries = unzipXlsxXmlEntries(bytes);
        List<String> sharedStrings = entries.containsKey("xl/sharedStrings.xml")
                ? parseSharedStrings(entries.get("xl/sharedStrings.xml"))
                : List.of();
        String firstSheet = entries.keySet().stream()
                .filter(name -> name.startsWith("xl/worksheets/sheet") && name.endsWith(".xml"))
                .sorted()
                .findFirst()
                .orElseThrow(() -> new BusinessException("Excel 缺少工作表"));
        return parseSheetToCsv(entries.get(firstSheet), sharedStrings);
    }

    private Map<String, byte[]> unzipXlsxXmlEntries(byte[] bytes) throws IOException {
        Map<String, byte[]> entries = new HashMap<>();
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (!entry.isDirectory() && entry.getName().endsWith(".xml")) {
                    ByteArrayOutputStream out = new ByteArrayOutputStream();
                    zip.transferTo(out);
                    entries.put(entry.getName(), out.toByteArray());
                }
            }
        }
        return entries;
    }

    private List<String> parseSharedStrings(byte[] xml) throws IOException {
        Document document = parseXml(xml);
        NodeList items = document.getElementsByTagName("si");
        List<String> values = new ArrayList<>();
        for (int i = 0; i < items.getLength(); i++) {
            values.add(items.item(i).getTextContent());
        }
        return values;
    }

    private String parseSheetToCsv(byte[] sheetXml, List<String> sharedStrings) throws IOException {
        Document document = parseXml(sheetXml);
        NodeList rowNodes = document.getElementsByTagName("row");
        List<String> lines = new ArrayList<>();
        for (int i = 0; i < rowNodes.getLength(); i++) {
            Element row = (Element) rowNodes.item(i);
            NodeList cellNodes = row.getElementsByTagName("c");
            Map<Integer, String> values = new HashMap<>();
            int maxIndex = -1;
            for (int j = 0; j < cellNodes.getLength(); j++) {
                Element cell = (Element) cellNodes.item(j);
                int index = cellIndex(cell.getAttribute("r"));
                values.put(index, readCellValue(cell, sharedStrings));
                maxIndex = Math.max(maxIndex, index);
            }
            if (maxIndex >= 0) {
                List<String> cells = new ArrayList<>();
                for (int j = 0; j <= maxIndex; j++) {
                    cells.add(csvCell(values.getOrDefault(j, "")));
                }
                lines.add(String.join(",", cells));
            }
        }
        return String.join("\n", lines);
    }

    private String readCellValue(Element cell, List<String> sharedStrings) {
        if ("inlineStr".equals(cell.getAttribute("t"))) {
            NodeList inlineStrings = cell.getElementsByTagName("is");
            return inlineStrings.getLength() == 0 ? "" : inlineStrings.item(0).getTextContent();
        }
        NodeList valueNodes = cell.getElementsByTagName("v");
        String raw = valueNodes.getLength() == 0 ? "" : valueNodes.item(0).getTextContent();
        if ("s".equals(cell.getAttribute("t")) && !raw.isBlank()) {
            int index = Integer.parseInt(raw);
            return index >= 0 && index < sharedStrings.size() ? sharedStrings.get(index) : "";
        }
        return raw;
    }

    private int cellIndex(String ref) {
        Matcher matcher = XLSX_CELL_REF.matcher(ref == null ? "" : ref);
        if (!matcher.find()) {
            return 0;
        }
        int index = 0;
        for (char ch : matcher.group(1).toCharArray()) {
            index = index * 26 + (ch - 'A' + 1);
        }
        return Math.max(index - 1, 0);
    }

    private Document parseXml(byte[] xml) throws IOException {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);
            return factory.newDocumentBuilder().parse(new ByteArrayInputStream(xml));
        } catch (Exception e) {
            throw new IOException("Excel 内容解析失败", e);
        }
    }

    private String csvCell(String value) {
        String safeValue = value == null ? "" : value;
        if (safeValue.contains(",") || safeValue.contains("\"") || safeValue.contains("\n") || safeValue.contains("\r")) {
            return "\"" + safeValue.replace("\"", "\"\"") + "\"";
        }
        return safeValue;
    }

    private String stripUtf8Bom(String value) {
        return value != null && value.startsWith("\uFEFF") ? value.substring(1) : value;
    }
}
