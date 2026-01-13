export type Difficulty = 'easy' | 'tricky' | 'expert';

export type SubmissionStatus = 'pending' | 'approved' | 'needs_work';

export interface Mission {
  id: number;
  title: string;
  story: string;
  objective: string;
  constraints: string[];
  success_criteria: string[];
  difficulty: Difficulty;
  banner_image_url: string | null;
  setup_image_url: string | null;
  hint1: string | null;
  hint2: string | null;
  created_at: string;
}

export interface Submission {
  id: number;
  mission_id: number;
  what_happened: string;
  what_was_hard: string | null;
  media_url: string | null;
  media_url_2: string | null;
  submitted_at: string;
  reviewed: boolean;
  review_notes: string | null;
  status: SubmissionStatus;
  reviewed_at: string | null;
}

export interface SubmissionWithMission extends Submission {
  mission_title: string;
}

export interface MissionWithSubmissions extends Mission {
  submissions: Submission[];
}

export interface CreateMissionInput {
  title: string;
  story: string;
  objective: string;
  constraints: string[];
  success_criteria: string[];
  difficulty: Difficulty;
  banner_image_url?: string;
  setup_image_url?: string;
  hint1?: string;
  hint2?: string;
}

export interface CreateSubmissionInput {
  mission_id: number;
  what_happened: string;
  what_was_hard?: string;
  media_url?: string;
  media_url_2?: string;
}

export interface ReviewSubmissionInput {
  status: SubmissionStatus;
  review_notes?: string;
}
