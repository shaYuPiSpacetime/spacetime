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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AppUserController 命名空间 XLSX 测试")
class AppUserControllerNamespacedXlsxTest {

    @Mock
    private AppUserAdminService appUserAdminService;

    @InjectMocks
    private AppUserController controller;

    @Test
    @DisplayName("导入接口应支持带命名空间前缀的 xlsx 工作表")
    void shouldReadNamespacedXlsxImportFileAsCsvContent() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "app-users-namespaced.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                buildNamespacedXlsx());
        when(appUserAdminService.previewImport(eq("app-users-namespaced.xlsx"), anyString()))
                .thenReturn(new ImportBatchVO());

        controller.previewImport(file);

        ArgumentCaptor<String> contentCaptor = ArgumentCaptor.forClass(String.class);
        verify(appUserAdminService).previewImport(eq("app-users-namespaced.xlsx"), contentCaptor.capture());
        assertThat(contentCaptor.getValue()).isEqualTo("phone,nickname\n13800000002,命名空间用户");
    }

    private byte[] buildNamespacedXlsx() throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(out, StandardCharsets.UTF_8)) {
            put(zip, "[Content_Types].xml", """
                    <?xml version="1.0" encoding="UTF-8"?>
                    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                      <Default Extension="xml" ContentType="application/xml"/>
                    </Types>
                    """);
            put(zip, "xl/worksheets/sheet1.xml", """
                    <?xml version="1.0" encoding="UTF-8"?>
                    <x:worksheet xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
                      <x:sheetData>
                        <x:row r="1">
                          <x:c r="A1" t="inlineStr"><x:is><x:t>phone</x:t></x:is></x:c>
                          <x:c r="B1" t="inlineStr"><x:is><x:t>nickname</x:t></x:is></x:c>
                        </x:row>
                        <x:row r="2">
                          <x:c r="A2" t="inlineStr"><x:is><x:t>13800000002</x:t></x:is></x:c>
                          <x:c r="B2" t="inlineStr"><x:is><x:t>命名空间用户</x:t></x:is></x:c>
                        </x:row>
                      </x:sheetData>
                    </x:worksheet>
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
