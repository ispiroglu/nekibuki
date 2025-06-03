package storage

import (
	"crypto/sha256"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"time"
)

// ImageStorage handles image file operations
type ImageStorage struct {
	baseDir string
}

// NewImageStorage creates a new image storage instance
func NewImageStorage(baseDir string) (*ImageStorage, error) {
	// Create base directory if it doesn't exist
	if err := os.MkdirAll(baseDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create storage directory: %w", err)
	}

	return &ImageStorage{
		baseDir: baseDir,
	}, nil
}

// SaveImage saves an uploaded image file and returns the path and hash
func (s *ImageStorage) SaveImage(file *multipart.FileHeader) (string, string, []byte, error) {
	// Open the uploaded file
	src, err := file.Open()
	if err != nil {
		return "", "", nil, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	// Read file content for hashing and storage
	fileContent, err := io.ReadAll(src)
	if err != nil {
		return "", "", nil, fmt.Errorf("failed to read file content: %w", err)
	}

	// Generate hash for duplicate detection
	hash := sha256.Sum256(fileContent)
	hashString := fmt.Sprintf("%x", hash)

	// Create filename with timestamp and hash prefix
	timestamp := time.Now().Format("20060102_150405")
	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("%s_%s%s", timestamp, hashString[:8], ext)

	// Create daily directory structure
	dailyDir := filepath.Join(s.baseDir, time.Now().Format("2006-01-02"))
	if err := os.MkdirAll(dailyDir, 0755); err != nil {
		return "", "", nil, fmt.Errorf("failed to create daily directory: %w", err)
	}

	// Full file path
	filePath := filepath.Join(dailyDir, filename)

	// Save the file
	dst, err := os.Create(filePath)
	if err != nil {
		return "", "", nil, fmt.Errorf("failed to create destination file: %w", err)
	}
	defer dst.Close()

	if _, err := dst.Write(fileContent); err != nil {
		return "", "", nil, fmt.Errorf("failed to write file content: %w", err)
	}

	return filePath, hashString, fileContent, nil
}

// ValidateImageFile validates that the uploaded file is a valid image
func (s *ImageStorage) ValidateImageFile(file *multipart.FileHeader) error {
	// Check file size (max 10MB)
	const maxSize = 10 * 1024 * 1024 // 10MB
	if file.Size > maxSize {
		return fmt.Errorf("file size %d bytes exceeds maximum allowed size of %d bytes", file.Size, maxSize)
	}

	// Check file extension
	ext := filepath.Ext(file.Filename)
	validExts := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".webp": true,
	}

	if !validExts[ext] {
		return fmt.Errorf("unsupported file extension %s. Allowed: .jpg, .jpeg, .png, .webp", ext)
	}

	// Check MIME type
	src, err := file.Open()
	if err != nil {
		return fmt.Errorf("failed to open file for validation: %w", err)
	}
	defer src.Close()

	// Read first 512 bytes to detect MIME type
	buffer := make([]byte, 512)
	n, err := src.Read(buffer)
	if err != nil && err != io.EOF {
		return fmt.Errorf("failed to read file for MIME type detection: %w", err)
	}

	// Check magic bytes for common image types
	if n >= 4 {
		// JPEG magic bytes
		if buffer[0] == 0xFF && buffer[1] == 0xD8 && buffer[2] == 0xFF {
			return nil
		}
		// PNG magic bytes
		if buffer[0] == 0x89 && buffer[1] == 0x50 && buffer[2] == 0x4E && buffer[3] == 0x47 {
			return nil
		}
		// WebP magic bytes
		if n >= 12 && buffer[0] == 0x52 && buffer[1] == 0x49 && buffer[2] == 0x46 && buffer[3] == 0x46 &&
			buffer[8] == 0x57 && buffer[9] == 0x45 && buffer[10] == 0x42 && buffer[11] == 0x50 {
			return nil
		}
	}

	return fmt.Errorf("invalid image file format")
}

// DeleteFile removes a file from storage
func (s *ImageStorage) DeleteFile(filePath string) error {
	// Ensure the path is within our base directory for security
	absPath, err := filepath.Abs(filePath)
	if err != nil {
		return fmt.Errorf("failed to get absolute path: %w", err)
	}

	absBaseDir, err := filepath.Abs(s.baseDir)
	if err != nil {
		return fmt.Errorf("failed to get absolute base directory: %w", err)
	}

	if !filepath.HasPrefix(absPath, absBaseDir) {
		return fmt.Errorf("path %s is outside storage directory", filePath)
	}

	if err := os.Remove(filePath); err != nil {
		return fmt.Errorf("failed to delete file: %w", err)
	}

	return nil
}

// GetStorageStats returns storage statistics
func (s *ImageStorage) GetStorageStats() (map[string]interface{}, error) {
	var totalSize int64
	var fileCount int

	err := filepath.Walk(s.baseDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Skip errors
		}
		if !info.IsDir() {
			totalSize += info.Size()
			fileCount++
		}
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to calculate storage stats: %w", err)
	}

	return map[string]interface{}{
		"total_size_bytes": totalSize,
		"file_count":       fileCount,
		"base_directory":   s.baseDir,
	}, nil
}
