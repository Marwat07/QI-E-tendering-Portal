-- Create file_uploads table
-- This table stores metadata for all uploaded files in the system

CREATE TABLE IF NOT EXISTS file_uploads (
    id SERIAL PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    filepath TEXT,
    mimetype VARCHAR(100) NOT NULL,
    size INTEGER NOT NULL,
    uploaded_by INTEGER NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'bid', 'tender', 'user', etc.
    entity_id INTEGER NOT NULL,
    s3_key VARCHAR(500),  -- For S3 storage
    s3_url TEXT,          -- For S3 storage
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Add foreign key constraints
    CONSTRAINT fk_file_uploads_uploaded_by 
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_file_uploads_entity ON file_uploads (entity_type, entity_id);
CREATE INDEX idx_file_uploads_uploaded_by ON file_uploads (uploaded_by);
CREATE INDEX idx_file_uploads_created_at ON file_uploads (created_at);

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_file_uploads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_file_uploads_updated_at
    BEFORE UPDATE ON file_uploads
    FOR EACH ROW
    EXECUTE FUNCTION update_file_uploads_updated_at();

-- Add comments for documentation
COMMENT ON TABLE file_uploads IS 'Stores metadata for all uploaded files in the system';
COMMENT ON COLUMN file_uploads.original_name IS 'Original filename as uploaded by user';
COMMENT ON COLUMN file_uploads.filename IS 'Generated filename or S3 key';
COMMENT ON COLUMN file_uploads.filepath IS 'Local file path or S3 URL';
COMMENT ON COLUMN file_uploads.entity_type IS 'Type of entity the file belongs to (bid, tender, user, etc.)';
COMMENT ON COLUMN file_uploads.entity_id IS 'ID of the entity the file belongs to';
COMMENT ON COLUMN file_uploads.s3_key IS 'S3 object key if stored in S3';
COMMENT ON COLUMN file_uploads.s3_url IS 'S3 object URL if stored in S3';