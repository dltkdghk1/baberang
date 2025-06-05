package com.ssafy.baperang.global.converter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Converter
public class StringListConverter implements AttributeConverter<List<String>, String> {

    private static final Logger log = LoggerFactory.getLogger(StringListConverter.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(List<String> attribute) {
        if (attribute == null || attribute.isEmpty()) {
            return "[]";  // Return empty array JSON instead of null
        }
        try {
            return objectMapper.writeValueAsString(attribute);
        } catch (JsonProcessingException e) {
            log.error("Error converting list to JSON string: {}", e.getMessage());
            return "[]";  // Return empty array as fallback
        }
    }

    @Override
    public List<String> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return new ArrayList<>();
        }
        
        try {
            // Check if the string starts with valid JSON array characters
            String trimmed = dbData.trim();
            if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
                log.warn("Malformed JSON array received: {}", dbData);
                return new ArrayList<>();
            }
            
            return objectMapper.readValue(dbData, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            // Catch all exceptions, not just JsonProcessingException
            log.error("Error converting database value to list: {}, Value: '{}'", e.getMessage(), dbData);
            return new ArrayList<>();  // Return empty list instead of throwing exception
        }
    }
} 