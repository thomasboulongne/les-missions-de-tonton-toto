-- Les missions de Tonton Toto - Database Schema
-- Run this in your Neon database console to set up the tables

-- missions table
CREATE TABLE IF NOT EXISTS missions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  story TEXT NOT NULL,
  objective TEXT NOT NULL,
  constraints TEXT[] NOT NULL DEFAULT '{}',
  success_criteria TEXT[] NOT NULL DEFAULT '{}',
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'tricky', 'expert')),
  banner_image_url TEXT,
  setup_image_url TEXT,
  hint1 TEXT,
  hint2 TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL PRIMARY KEY,
  mission_id INTEGER NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  what_happened TEXT NOT NULL,
  what_was_hard TEXT,
  link_url TEXT,
  media_url TEXT,
  media_url_2 TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed BOOLEAN DEFAULT FALSE,
  review_notes TEXT
);

-- Migration: Add media_url_2 column if it doesn't exist
-- ALTER TABLE submissions ADD COLUMN IF NOT EXISTS media_url_2 TEXT;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_submissions_mission_id ON submissions(mission_id);
CREATE INDEX IF NOT EXISTS idx_missions_created_at ON missions(created_at DESC);

-- Sample mission for testing (optional - you can remove this)
-- INSERT INTO missions (title, story, objective, constraints, success_criteria, difficulty, hint1, hint2)
-- VALUES (
--   'Le Robot Danseur',
--   'Tonton Toto a découvert que son mBot2 adore la musique ! Mais il ne sait pas encore danser. Peux-tu lui apprendre une petite chorégraphie ?',
--   'Programme le mBot2 pour qu''il fasse une danse de 10 secondes minimum.',
--   ARRAY['Utilise au moins 3 mouvements différents', 'Le robot doit tourner au moins une fois', 'La danse doit se répéter 2 fois'],
--   ARRAY['Le robot bouge pendant au moins 10 secondes', 'On voit au moins 3 mouvements distincts', 'La danse se répète correctement'],
--   'easy',
--   'Pense à utiliser les blocs "avancer", "reculer" et "tourner" !',
--   'Tu peux mettre tous tes mouvements dans une boucle "répéter 2 fois" pour que la danse se répète.'
-- );

