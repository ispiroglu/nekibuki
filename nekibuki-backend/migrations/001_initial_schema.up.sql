-- Initial schema for Nekibuki MVP
-- Recognition sessions for photo processing workflow (simplified for MVP)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE recognition_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Image metadata
    image_path VARCHAR(500),
    image_hash VARCHAR(64), -- For duplicate detection
    
    -- Recognition and content results (both from Gemini Flash 2.0-lite)
    gemini_response JSONB, -- Raw Gemini response with image analysis
    primary_attraction VARCHAR(500), -- Main identified attraction
    confidence_score DECIMAL(3,2), -- Gemini confidence
    attraction_info JSONB, -- Structured attraction information
    
    -- Processing metadata
    status VARCHAR(50) DEFAULT 'processing', -- processing, completed, failed, timeout
    error_message TEXT,
    processing_started_at TIMESTAMP DEFAULT NOW(),
    processing_completed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_recognition_sessions_status ON recognition_sessions(status);
CREATE INDEX idx_recognition_sessions_image_hash ON recognition_sessions(image_hash);
CREATE INDEX idx_recognition_sessions_created_at ON recognition_sessions(created_at);

-- Add constraints
ALTER TABLE recognition_sessions ADD CONSTRAINT chk_status 
    CHECK (status IN ('processing', 'completed', 'failed', 'timeout'));
ALTER TABLE recognition_sessions ADD CONSTRAINT chk_confidence_score 
    CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0); 