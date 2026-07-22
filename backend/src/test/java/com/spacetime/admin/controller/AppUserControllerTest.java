package com.spacetime.admin.controller;

import com.spacetime.admin.dto.response.ImportBatchVO;
import com.spacetime.admin.service.AppUserAdminService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * App 用户管理控制器测试。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AppUserController 测试")
class AppUserControllerTest {

    @Mock
    private AppUserAdminService appUserAdminService;

    @InjectMocks
    private AppUserController controller;

    @Test
    @DisplayName("导入接口应支持读取 xlsx 第一张表并转成 CSV 内容")
    void shouldReadXlsxImportFileAsCsvContent() throws Exception {
        byte[] xlsx = buildSimpleXlsx();
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "app-users.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                xlsx);
        when(appUserAdminService.previewImport(eq("app-users.xlsx"), org.mockito.ArgumentMatchers.anyString()))
                .thenReturn(new ImportBatchVO());

        controller.previewImport(file);

        ArgumentCaptor<String> contentCaptor = ArgumentCaptor.forClass(String.class);
        verify(appUserAdminService).previewImport(eq("app-users.xlsx"), contentCaptor.capture());
        assertThat(contentCaptor.getValue()).isEqualTo("phone,nickname,avatarUrl\n13800000001,导入用户,https://img.example.com/avatar.jpg");
    }

    private byte[] buildSimpleXlsx() throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(out, StandardCharsets.UTF_8)) {
            put(zip, "[Content_Types].xml", """
                    <?xml version="1.0" encoding="UTF-8"?>
                    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                      <Default Extension="xml" ContentType="application/xml"/>
                    </Types>
                    """);
            put(zip, "xl/sharedStrings.xml", """
                    <?xml version="1.0" encoding="UTF-8"?>
                    <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
                      <si><t>phone</t></si>
                      <si><t>nickname</t></si>
                      <si><t>avatarUrl</t></si>
                      <si><t>13800000001</t></si>
                      <si><t>导入用户</t></si>
                      <si><t>https://img.example.com/avatar.jpg</t></si>
                    </sst>
                    """);
            put(zip, "xl/worksheets/sheet1.xml", """
                    <?xml version="1.0" encoding="UTF-8"?>
                    <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
                      <sheetData>
                        <row r="1">
                          <c r="A1" t="s"><v>0</v></c>
                          <c r="B1" t="s"><v>1</v></c>
                          <c r="C1" t="s"><v>2</v></c>
                        </row>
                        <row r="2">
                          <c r="A2" t="s"><v>3</v></c>
                          <c r="B2" t="s"><v>4</v></c>
                          <c r="C2" t="s"><v>5</v></c>
                        </row>
                      </sheetData>
                    </worksheet>
                    """);
        }
        return out.toByteArray();
    }

    private void put(ZipOutputStream zip, String name, String content) throws Exception {
        zip.putNextEntry(new ZipEntry(name));
        zip.write(content.getBytes(StandardCharsets.UTF_8));
        zip.closeEntry();
    }
}
