-- Store the units used by the profile form directly. Existing records, if any,
-- are converted once to whole pounds and total inches; other profile data stays.
CREATE TABLE profiles_imperial (
 user_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
 sex TEXT, weight_lb INTEGER, height_inches INTEGER, age INTEGER,
 language TEXT NOT NULL DEFAULT 'en', notifications INTEGER NOT NULL DEFAULT 0,
 CHECK(weight_lb IS NULL OR (weight_lb BETWEEN 1 AND 1500 AND weight_lb = CAST(weight_lb AS INTEGER))),
 CHECK(height_inches IS NULL OR (height_inches BETWEEN 12 AND 118 AND height_inches = CAST(height_inches AS INTEGER))),
 CHECK(age IS NULL OR age BETWEEN 0 AND 125)
);
INSERT INTO profiles_imperial (user_id,sex,weight_lb,height_inches,age,language,notifications)
SELECT user_id,sex,CAST(ROUND(weight_kg / 0.45359237) AS INTEGER),
 CAST(ROUND(height_cm / 2.54) AS INTEGER),age,language,notifications FROM profiles;
DROP TABLE profiles;
ALTER TABLE profiles_imperial RENAME TO profiles;
