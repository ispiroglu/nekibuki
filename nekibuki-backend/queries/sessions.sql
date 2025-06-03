-- name: CreateRecognitionSession :one
INSERT INTO recognition_sessions (image_path, image_hash)
VALUES ($1, $2)
RETURNING *;

-- name: GetRecognitionSession :one
SELECT * FROM recognition_sessions WHERE id = $1;

-- name: UpdateSessionWithResults :exec
UPDATE recognition_sessions 
SET gemini_response = $2,
    primary_attraction = $3,
    confidence_score = $4,
    attraction_info = $5,
    status = $6,
    processing_completed_at = NOW()
WHERE id = $1;

-- name: UpdateSessionError :exec
UPDATE recognition_sessions 
SET status = 'failed',
    error_message = $2,
    processing_completed_at = NOW()
WHERE id = $1;

-- name: GetRecentSessions :many
SELECT * FROM recognition_sessions 
ORDER BY created_at DESC 
LIMIT $1;

-- name: GetSessionsByStatus :many
SELECT * FROM recognition_sessions 
WHERE status = $1
ORDER BY created_at DESC 
LIMIT $2;

-- name: DeleteOldSessions :exec
DELETE FROM recognition_sessions 
WHERE created_at < $1; 