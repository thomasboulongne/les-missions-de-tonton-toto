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

// Media Upload API (images and videos)
export interface UploadResponse {
  success: boolean;
  url: string;
  key: string;
}

export async function uploadImage(file: File): Promise<string> {
  return uploadMedia(file);
}

export async function uploadMedia(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to upload file');
  }

  const data: UploadResponse = await res.json();
  return data.url;
}

// Image optimization helper
export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

/**
 * Generate an optimized image URL with transformation parameters.
 *
 * @param url - Original image URL (must be a /images/ path)
 * @param options - Transformation options
 * @returns URL with query parameters for on-demand optimization
 *
 * @example
 * // Resize to 800px width with WebP format
 * getOptimizedImageUrl('/images/uploads/photo.jpg', { width: 800, format: 'webp' })
 * // => '/images/uploads/photo.jpg?w=800&f=webp'
 *
 * @example
 * // Thumbnail with custom quality
 * getOptimizedImageUrl(imageUrl, { width: 200, height: 200, quality: 70, fit: 'cover' })
 */
export function getOptimizedImageUrl(
  url: string,
  options?: ImageOptimizationOptions
): string {
  // Return as-is if no options or not an image path
  if (!options || !url || !url.startsWith('/images/')) {
    return url;
  }

  const params = new URLSearchParams();

  if (options.width) {
    params.set('w', String(Math.min(options.width, 2000)));
  }

  if (options.height) {
    params.set('h', String(Math.min(options.height, 2000)));
  }

  if (options.quality) {
    params.set('q', String(Math.min(Math.max(options.quality, 1), 100)));
  }

  if (options.format) {
    params.set('f', options.format);
  }

  if (options.fit) {
    params.set('fit', options.fit);
  }

  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
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

