package com.dentaflow.backend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping({"/api/upload", "/api/uploads"})
public class FileUploadController {

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    private static final List<String> ALLOWED_EXTENSIONS = List.of(".jpg", ".jpeg", ".png", ".webp");
    private static final List<String> ALLOWED_MIME_TYPES = List.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @PostMapping
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file) {
        return handleUpload(file);
    }

    @PostMapping("/image")
    public ResponseEntity<?> uploadImageFile(@RequestParam("file") MultipartFile file) {
        return handleUpload(file);
    }

    private ResponseEntity<?> handleUpload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No file was uploaded."));
        }

        // File size validation (Strict 5MB check)
        if (file.getSize() > MAX_FILE_SIZE) {
            return ResponseEntity.badRequest().body(Map.of("error", "File size must be less than 5 MB."));
        }

        // MIME type validation
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid file type. Only JPG, JPEG, PNG, and WEBP formats are allowed."));
        }

        // File extension validation
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid file name."));
        }

        String extension = "";
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex >= 0) {
            extension = originalFilename.substring(dotIndex).toLowerCase(Locale.ROOT);
        }

        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid file extension. Allowed extensions are: JPG, JPEG, PNG, WEBP."));
        }

        try {
            // Secure filename generation: UUID + sanitized extension
            String safeFilename = UUID.randomUUID().toString().replace("-", "") + extension;

            Path rootUploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            if (!Files.exists(rootUploadPath)) {
                Files.createDirectories(rootUploadPath);
            }

            Path destinationPath = rootUploadPath.resolve(safeFilename).normalize();

            // Guard against directory traversal
            if (!destinationPath.startsWith(rootUploadPath)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Invalid file storage path."));
            }

            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, destinationPath, StandardCopyOption.REPLACE_EXISTING);
            }

            String relativeUrl = "/uploads/" + safeFilename;

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "url", relativeUrl,
                    "imageUrl", relativeUrl,
                    "filename", safeFilename,
                    "originalFilename", originalFilename
            ));

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to store uploaded file: " + e.getMessage()));
        }
    }
}
