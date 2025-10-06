-- Migration: Remove compliance_statement and additional_notes fields from bids table
-- Created: 2024-12-19
-- Description: Removes the compliance_statement and additional_notes columns from the bids table
--              as these fields are being replaced with file uploads stored in the attachments column

-- Begin transaction
BEGIN;

-- Remove compliance_statement column if it exists
ALTER TABLE bids DROP COLUMN IF EXISTS compliance_statement;

-- Remove additional_notes column if it exists  
ALTER TABLE bids DROP COLUMN IF EXISTS additional_notes;

-- Commit the transaction
COMMIT;

-- Verify the changes
\d bids;
