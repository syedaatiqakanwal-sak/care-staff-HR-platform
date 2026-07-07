-- Allow staff profiles without a surname (lastName). firstName remains required at creation.
ALTER TABLE staff_profiles ALTER COLUMN "lastName" DROP NOT NULL;
