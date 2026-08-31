package com.spacetime.common.provider.impl;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.common.config.GuGuDataCollegeProperties;
import com.spacetime.common.entity.SchoolDictionary;
import com.spacetime.common.provider.CollegeSearchProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Collections;
import java.util.List;

@Component
@RequiredArgsConstructor
public class GuGuDataCollegeSearchProvider implements CollegeSearchProvider {
    private final GuGuDataCollegeProperties properties;
    private final ObjectMapper objectMapper;

    @Override
    public List<SchoolDictionary> search(String keyword, int limit) {
        if (!StringUtils.hasText(properties.getAppKey())) {
            throw new IllegalStateException("GuGuData college app key is not configured");
        }
        try {
            URI uri = UriComponentsBuilder.fromUriString(properties.getBaseUrl())
                    .queryParam("keywords", keyword)
                    .queryParam("pagesize", limit)
                    .queryParam("pageindex", 1)
                    .queryParam("keywordstrict", false)
                    .build().encode().toUri();
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofMillis(properties.getConnectTimeoutMillis()))
                    .build();
            HttpRequest request = HttpRequest.newBuilder(uri)
                    .timeout(Duration.ofMillis(properties.getRequestTimeoutMillis()))
                    .header("X-GUGUDATA-APPKEY", properties.getAppKey())
                    .GET().build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                throw new IllegalStateException("GuGuData college HTTP status: " + response.statusCode());
            }
            CollegeResponse body = objectMapper.readValue(response.body(), CollegeResponse.class);
            if (body.dataStatus == null || body.dataStatus.statusCode != 100) {
                String description = body.dataStatus == null ? "missing DataStatus" : body.dataStatus.statusDescription;
                throw new IllegalStateException("GuGuData college business error: " + description);
            }
            if (body.data == null) return Collections.emptyList();
            return body.data.stream().filter(item -> StringUtils.hasText(item.uuid) && StringUtils.hasText(item.name))
                    .map(this::toEntity).toList();
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("GuGuData college request interrupted", ex);
        } catch (Exception ex) {
            throw ex instanceof IllegalStateException state ? state
                    : new IllegalStateException("GuGuData college request failed", ex);
        }
    }

    private SchoolDictionary toEntity(CollegeItem item) {
        SchoolDictionary school = new SchoolDictionary();
        school.setProviderUuid(item.uuid);
        school.setSchoolCode(StringUtils.hasText(item.code) ? item.code : item.uuid);
        school.setSchoolName(item.name);
        school.setShortName(item.shortName);
        school.setOldName(item.oldName);
        school.setProvince(item.province);
        school.setCity(item.city);
        school.setDistrict(item.district);
        school.setCollegeType(item.type);
        school.setCategory(item.category);
        school.setEducationLevel(item.level);
        school.setSchoolProperty(item.property);
        school.setIs985(Boolean.TRUE.equals(item.is985));
        school.setIs211(Boolean.TRUE.equals(item.is211));
        school.setIsDualClass(Boolean.TRUE.equals(item.isDualClass));
        school.setSource("GUGUDATA");
        school.setStatus("ENABLED");
        return school;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class CollegeResponse {
        @JsonProperty("DataStatus") private DataStatus dataStatus;
        @JsonProperty("Data") private List<CollegeItem> data;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class DataStatus {
        @JsonProperty("StatusCode") private int statusCode;
        @JsonProperty("StatusDescription") private String statusDescription;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class CollegeItem {
        @JsonProperty("SchoolUUID") @JsonAlias("Uuid") private String uuid;
        @JsonProperty("CollegeCode") @JsonAlias("Code") private String code;
        @JsonProperty("CollegeName") @JsonAlias("Name") private String name;
        @JsonProperty("ShortName") private String shortName;
        @JsonProperty("OldName") private String oldName;
        @JsonProperty("Province") private String province;
        @JsonProperty("City") private String city;
        @JsonProperty("District") private String district;
        @JsonProperty("CollegeType") @JsonAlias("Type") private String type;
        @JsonProperty("CollegeCategory") @JsonAlias("Category") private String category;
        @JsonProperty("EduLevel") @JsonAlias("Level") private String level;
        @JsonProperty("CollegeProperty") @JsonAlias("Property") private String property;
        @JsonProperty("Is985") private Boolean is985;
        @JsonProperty("Is211") private Boolean is211;
        @JsonProperty("IsDualClass") private Boolean isDualClass;
    }
}
