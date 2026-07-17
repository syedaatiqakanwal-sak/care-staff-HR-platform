-- Add new columns to templates table
ALTER TABLE inhouse_training_templates 
  ADD COLUMN IF NOT EXISTS "filterGroup" varchar,
  ADD COLUMN IF NOT EXISTS "categoryHeader" varchar;

-- Add new columns to records table
ALTER TABLE inhouse_training_records 
  ADD COLUMN IF NOT EXISTS "filterGroup" varchar,
  ADD COLUMN IF NOT EXISTS "categoryHeader" varchar;

-- =============================================
-- INSERT NEW INDIVIDUAL TEMPLATE ITEMS
-- Only insert if title does not already exist
-- =============================================

-- === DAY 1 — Rapid Induction Training (11 items) ===
INSERT INTO inhouse_training_templates (title, "group", "filterGroup", "categoryHeader", "sortOrder")
SELECT * FROM (VALUES
  ('Moving and Assisting People Safely', 'Rapid Induction Training', 'day1', 'Rapid Induction Training', 10),
  ('Basic Life Support (BLS) and Emergency First Aid', 'Rapid Induction Training', 'day1', 'Rapid Induction Training', 11),
  ('Fire Safety and Emergency Procedures', 'Rapid Induction Training', 'day1', 'Rapid Induction Training', 12),
  ('Food Safety and Hygiene Awareness', 'Rapid Induction Training', 'day1', 'Rapid Induction Training', 13),
  ('Health and Safety in the Workplace', 'Rapid Induction Training', 'day1', 'Rapid Induction Training', 14),
  ('Infection Prevention and Control', 'Rapid Induction Training', 'day1', 'Rapid Induction Training', 15),
  ('Safe Medication Administration and Management', 'Rapid Induction Training', 'day1', 'Rapid Induction Training', 16),
  ('Safeguarding Adults at Risk', 'Rapid Induction Training', 'day1', 'Rapid Induction Training', 17),
  ('Supporting Individuals with Learning Disabilities and Autism', 'Rapid Induction Training', 'day1', 'Rapid Induction Training', 18),
  ('Choking Awareness and Emergency Response', 'Rapid Induction Training', 'day1', 'Rapid Induction Training', 19),
  ('Catheter Care: Bag Changing and Safe Management', 'Rapid Induction Training', 'day1', 'Rapid Induction Training', 20)
) AS v(title, "group", "filterGroup", "categoryHeader", "sortOrder")
WHERE NOT EXISTS (
  SELECT 1 FROM inhouse_training_templates WHERE title = v.title AND "filterGroup" = 'day1'
);

-- === DAY 7 ===
INSERT INTO inhouse_training_templates (title, "group", "filterGroup", "categoryHeader", "sortOrder")
SELECT 'IPC: Safe Use of Personal Protective Equipment (PPE) and Competency Assessment', 'Day 7', 'day7', NULL, 30
WHERE NOT EXISTS (
  SELECT 1 FROM inhouse_training_templates WHERE title = 'IPC: Safe Use of Personal Protective Equipment (PPE) and Competency Assessment'
);

-- === DAY 8 ===
INSERT INTO inhouse_training_templates (title, "group", "filterGroup", "categoryHeader", "sortOrder")
SELECT 'Skin Integrity and Pressure Care Awareness: Knowledge Assessment', 'Day 8', 'day8', NULL, 40
WHERE NOT EXISTS (
  SELECT 1 FROM inhouse_training_templates WHERE title = 'Skin Integrity and Pressure Care Awareness: Knowledge Assessment'
);

-- === DAY 9 ===
INSERT INTO inhouse_training_templates (title, "group", "filterGroup", "categoryHeader", "sortOrder")
SELECT 'Nutritional Support and Meal Preparation: Competency Assessment', 'Day 9', 'day9', NULL, 50
WHERE NOT EXISTS (
  SELECT 1 FROM inhouse_training_templates WHERE title = 'Nutritional Support and Meal Preparation: Competency Assessment'
);

-- === DAY 13 ===
INSERT INTO inhouse_training_templates (title, "group", "filterGroup", "categoryHeader", "sortOrder")
SELECT 'Safe Medication Administration: Competency Assessment', 'Day 13', 'day13', NULL, 60
WHERE NOT EXISTS (
  SELECT 1 FROM inhouse_training_templates WHERE title = 'Safe Medication Administration: Competency Assessment' AND "filterGroup" = 'day13'
);

-- === DAY 14 ===
INSERT INTO inhouse_training_templates (title, "group", "filterGroup", "categoryHeader", "sortOrder")
SELECT 'Moving and Handling: Safe Use of Equipment and Techniques', 'Day 14', 'day14', NULL, 70
WHERE NOT EXISTS (
  SELECT 1 FROM inhouse_training_templates WHERE title = 'Moving and Handling: Safe Use of Equipment and Techniques' AND "filterGroup" = 'day14'
);

-- === DAY 20 ===
INSERT INTO inhouse_training_templates (title, "group", "filterGroup", "categoryHeader", "sortOrder")
SELECT 'Personal Care Delivery: Competency Assessment', 'Day 20', 'day20', NULL, 80
WHERE NOT EXISTS (
  SELECT 1 FROM inhouse_training_templates WHERE title = 'Personal Care Delivery: Competency Assessment' AND "filterGroup" = 'day20'
);

-- === ADDITIONAL SPECIALIST TRAINING ===
INSERT INTO inhouse_training_templates (title, "group", "filterGroup", "categoryHeader", "sortOrder")
SELECT * FROM (VALUES
  ('Medication Administration: Competency Assessment and Practical Observation (4 Months)', 'Additional Specialist Training', 'additional', NULL, 100),
  ('Medication Competency Reassessment and Spot Checks', 'Additional Specialist Training', 'additional', NULL, 101),
  ('Addressing Medication Practice Concerns and Improvement Plans', 'Additional Specialist Training', 'additional', NULL, 102),
  ('Hoarding Awareness and Risk Management', 'Additional Specialist Training', 'additional', NULL, 103),
  ('Aphasia and Apraxia (ADS)', 'Additional Specialist Training', 'additional', NULL, 104),
  ('ECM Writing Notes and Logs Training', 'Additional Specialist Training', 'additional', NULL, 105)
) AS v(title, "group", "filterGroup", "categoryHeader", "sortOrder")
WHERE NOT EXISTS (
  SELECT 1 FROM inhouse_training_templates WHERE title = v.title AND "filterGroup" = 'additional'
);

-- === MANDATORY ===
INSERT INTO inhouse_training_templates (title, "group", "filterGroup", "categoryHeader", "sortOrder")
SELECT * FROM (VALUES
  ('Prevent Awareness Training', 'Mandatory', 'mandatory', NULL, 110),
  ('RQF Level 3 Award in Emergency First Aid at Work (EFAW)', 'Mandatory', 'mandatory', NULL, 111)
) AS v(title, "group", "filterGroup", "categoryHeader", "sortOrder")
WHERE NOT EXISTS (
  SELECT 1 FROM inhouse_training_templates WHERE title = v.title AND "filterGroup" = 'mandatory'
);

-- === OLIVER McGOWAN TRAINING ===
INSERT INTO inhouse_training_templates (title, "group", "filterGroup", "categoryHeader", "sortOrder")
SELECT * FROM (VALUES
  ('Tier 1 of the Oliver McGowan Training on Learning Disability and Autism', 'Oliver McGowan Training', 'oliver', NULL, 120),
  ('Tier 2 of the Oliver McGowan Training on Learning Disability and Autism', 'Oliver McGowan Training', 'oliver', NULL, 121)
) AS v(title, "group", "filterGroup", "categoryHeader", "sortOrder")
WHERE NOT EXISTS (
  SELECT 1 FROM inhouse_training_templates WHERE title = v.title AND "filterGroup" = 'oliver'
);

-- === AFTER 1 YEAR ===
INSERT INTO inhouse_training_templates (title, "group", "filterGroup", "categoryHeader", "sortOrder")
SELECT * FROM (VALUES
  ('Moving and Assisting People Safely', 'Refresher Rapid Induction Training', 'year1', 'Refresher Rapid Induction Training', 130),
  ('Basic Life Support (BLS) and Emergency First Aid', 'Refresher Rapid Induction Training', 'year1', 'Refresher Rapid Induction Training', 131),
  ('Fire Safety and Emergency Procedures', 'Refresher Rapid Induction Training', 'year1', 'Refresher Rapid Induction Training', 132),
  ('Food Safety and Hygiene Awareness', 'Refresher Rapid Induction Training', 'year1', 'Refresher Rapid Induction Training', 133),
  ('Health and Safety in the Workplace', 'Refresher Rapid Induction Training', 'year1', 'Refresher Rapid Induction Training', 134),
  ('Infection Prevention and Control', 'Refresher Rapid Induction Training', 'year1', 'Refresher Rapid Induction Training', 135),
  ('Safe Medication Administration and Management', 'Refresher Rapid Induction Training', 'year1', 'Refresher Rapid Induction Training', 136),
  ('Safeguarding Adults at Risk', 'Refresher Rapid Induction Training', 'year1', 'Refresher Rapid Induction Training', 137),
  ('Supporting Individuals with Learning Disabilities and Autism', 'Refresher Rapid Induction Training', 'year1', 'Refresher Rapid Induction Training', 138),
  ('Choking Awareness and Emergency Response', 'Refresher Rapid Induction Training', 'year1', 'Refresher Rapid Induction Training', 139),
  ('Catheter Care: Bag Changing and Safe Management', 'Refresher Rapid Induction Training', 'year1', 'Refresher Rapid Induction Training', 140),
  ('Moving and Handling: Safe Use of Equipment and Techniques (Year 1)', 'After 1 Year', 'year1', NULL, 141),
  ('Safe Medication Administration: Competency Assessment (Year 1)', 'After 1 Year', 'year1', NULL, 142),
  ('Personal Care Observation (Year 1)', 'After 1 Year', 'year1', NULL, 143)
) AS v(title, "group", "filterGroup", "categoryHeader", "sortOrder")
WHERE NOT EXISTS (
  SELECT 1 FROM inhouse_training_templates WHERE title = v.title AND "filterGroup" = 'year1'
);

-- === AFTER 2 YEARS ===
INSERT INTO inhouse_training_templates (title, "group", "filterGroup", "categoryHeader", "sortOrder")
SELECT * FROM (VALUES
  ('Assisting and Moving People', 'Refresher Rapid Induction Training Year 2', 'year2', 'Refresher Rapid Induction Training', 150),
  ('Basic Life Support and First Aid', 'Refresher Rapid Induction Training Year 2', 'year2', 'Refresher Rapid Induction Training', 151),
  ('Fire Safety', 'Refresher Rapid Induction Training Year 2', 'year2', 'Refresher Rapid Induction Training', 152),
  ('Food Safety', 'Refresher Rapid Induction Training Year 2', 'year2', 'Refresher Rapid Induction Training', 153),
  ('Health and Safety Awareness', 'Refresher Rapid Induction Training Year 2', 'year2', 'Refresher Rapid Induction Training', 154),
  ('Infection Prevention and Control (Year 2)', 'Refresher Rapid Induction Training Year 2', 'year2', 'Refresher Rapid Induction Training', 155),
  ('Medication Management', 'Refresher Rapid Induction Training Year 2', 'year2', 'Refresher Rapid Induction Training', 156),
  ('Safeguarding Adults (Year 2)', 'Refresher Rapid Induction Training Year 2', 'year2', 'Refresher Rapid Induction Training', 157),
  ('Learning Disabilities and Autism (Year 2)', 'Refresher Rapid Induction Training Year 2', 'year2', 'Refresher Rapid Induction Training', 158),
  ('Choking Response Training', 'Refresher Rapid Induction Training Year 2', 'year2', 'Refresher Rapid Induction Training', 159),
  ('Catheter Bag Change and Safety Management', 'Refresher Rapid Induction Training Year 2', 'year2', 'Refresher Rapid Induction Training', 160),
  ('Moving and Handling Equipment and/or Techniques (Year 2)', 'After 2 Years', 'year2', NULL, 161),
  ('Personal Care Observation (Year 2)', 'After 2 Years', 'year2', NULL, 162),
  ('Medication Administration Competency Assessment and Observation (After 9 Months)', 'After 2 Years', 'year2', NULL, 163)
) AS v(title, "group", "filterGroup", "categoryHeader", "sortOrder")
WHERE NOT EXISTS (
  SELECT 1 FROM inhouse_training_templates WHERE title = v.title AND "filterGroup" = 'year2'
);

-- Update filterGroup on EXISTING old merged rows so they don't appear 
-- under any filter (they will still show under "All")
UPDATE inhouse_training_templates 
SET "filterGroup" = 'legacy'
WHERE "filterGroup" IS NULL;
