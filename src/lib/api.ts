import type {
  Mission,
  MissionWithSubmissions,
  Submission,
  CreateMissionInput,
  CreateSubmissionInput,
  ReviewSubmissionInput,
} from '../types';

const API_BASE = '/.netlify/functions';

// Missions API
export async function getCurrentMission(): Promise<Mission | null> {
  const res = await fetch(`${API_BASE}/missions?current=true`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Failed to fetch current mission');
  }
  return res.json();
}

export async function getAllMissions(): Promise<MissionWithSubmissions[]> {
  const res = await fetch(`${API_BASE}/missions`);
  if (!res.ok) throw new Error('Failed to fetch missions');
  return res.json();
}

export async function getMission(id: number): Promise<MissionWithSubmissions> {
  const res = await fetch(`${API_BASE}/missions?id=${id}`);
  if (!res.ok) throw new Error('Failed to fetch mission');
  return res.json();
}

export async function createMission(data: CreateMissionInput): Promise<Mission> {
  const res = await fetch(`${API_BASE}/missions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create mission');
  return res.json();
}

export async function updateMission(id: number, data: Partial<CreateMissionInput>): Promise<Mission> {
  const res = await fetch(`${API_BASE}/missions`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  if (!res.ok) throw new Error('Failed to update mission');
  return res.json();
}

export async function deleteMission(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/missions`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error('Failed to delete mission');
}

// Submissions API
export async function getSubmissions(missionId?: number): Promise<Submission[]> {
  const url = missionId
    ? `${API_BASE}/submissions?mission_id=${missionId}`
    : `${API_BASE}/submissions`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch submissions');
  return res.json();
}

export async function createSubmission(data: CreateSubmissionInput): Promise<Submission> {
  const res = await fetch(`${API_BASE}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create submission');
  return res.json();
}

export async function reviewSubmission(id: number, data: ReviewSubmissionInput): Promise<Submission> {
  const res = await fetch(`${API_BASE}/submissions`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  if (!res.ok) throw new Error('Failed to review submission');
  return res.json();
}

// Local storage for hints
export function getRevealedHints(missionId: number): { hint1: boolean; hint2: boolean } {
  const stored = localStorage.getItem(`mission-hints-${missionId}`);
  if (stored) {
    return JSON.parse(stored);
  }
  return { hint1: false, hint2: false };
}

export function revealHint(missionId: number, hintNumber: 1 | 2): void {
  const current = getRevealedHints(missionId);
  if (hintNumber === 1) {
    current.hint1 = true;
  } else {
    current.hint2 = true;
  }
  localStorage.setItem(`mission-hints-${missionId}`, JSON.stringify(current));
}

