-- Add credential_expires_at column to users table
-- This column tracks when user credentials expire (1 year from creation/update)

-- Add the column
ALTER TABLE users ADD COLUMN credential_expires_at TIMESTAMP;

-- Set default expiry for existing users (1 year from their created_at date)
UPDATE users 
SET credential_expires_at = created_at + INTERVAL '1 year' 
WHERE credential_expires_at IS NULL;

-- Add comment to column
COMMENT ON COLUMN users.credential_expires_at IS 'Timestamp when user credentials expire (1 year from creation/last credential update)';

-- Create index for efficient queries on credential expiry
CREATE INDEX idx_users_credential_expires_at ON users(credential_expires_at);

-- Create a view to easily identify users with expiring credentials (within 30 days)
CREATE OR REPLACE VIEW users_expiring_credentials AS
SELECT 
    id,
    username,
    email,
    company_name,
    role,
    credential_expires_at,
    EXTRACT(DAYS FROM (credential_expires_at - CURRENT_TIMESTAMP)) AS days_until_expiry,
    CASE 
        WHEN credential_expires_at <= CURRENT_TIMESTAMP THEN 'expired'
        WHEN credential_expires_at <= CURRENT_TIMESTAMP + INTERVAL '7 days' THEN 'critical'
        WHEN credential_expires_at <= CURRENT_TIMESTAMP + INTERVAL '30 days' THEN 'warning'
        ELSE 'valid'
    END AS expiry_status
FROM users
WHERE credential_expires_at IS NOT NULL
ORDER BY credential_expires_at ASC;

-- Create function to extend user credentials by 1 year
CREATE OR REPLACE FUNCTION extend_user_credentials(user_id INTEGER)
RETURNS TIMESTAMP AS $$
DECLARE
    new_expiry_date TIMESTAMP;
BEGIN
    new_expiry_date := CURRENT_TIMESTAMP + INTERVAL '1 year';
    
    UPDATE users 
    SET credential_expires_at = new_expiry_date,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = user_id;
    
    RETURN new_expiry_date;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if user credentials are expired
CREATE OR REPLACE FUNCTION is_user_credentials_expired(user_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    expiry_date TIMESTAMP;
BEGIN
    SELECT credential_expires_at INTO expiry_date 
    FROM users 
    WHERE id = user_id;
    
    IF expiry_date IS NULL THEN
        RETURN FALSE; -- If no expiry date set, consider as not expired
    END IF;
    
    RETURN expiry_date <= CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;