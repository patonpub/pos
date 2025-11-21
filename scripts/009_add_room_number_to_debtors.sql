-- Add room_number field to debtors table
ALTER TABLE debtors 
ADD COLUMN room_number text;

-- Add index for room_number for potential filtering/searching
CREATE INDEX idx_debtors_room_number ON debtors(room_number) WHERE room_number IS NOT NULL;