import type { AnswerResult, Patch, PatchSummary } from "@/lib/types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

function getApiUrl() {
  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  return apiUrl;
}

export async function fetchPatches(): Promise<PatchSummary[]> {
  const response = await fetch(`${getApiUrl()}/api/patches`);

  if (!response.ok) {
    throw new Error(`Failed to fetch patches: ${response.status}`);
  }

  return response.json();
}

export async function fetchPatch(id: string): Promise<Patch> {
  const response = await fetch(`${getApiUrl()}/api/patches/${id}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch patch ${id}: ${response.status}`);
  }

  return response.json();
}

export async function submitAnswer(
  id: string,
  answer: boolean,
): Promise<AnswerResult> {
  const response = await fetch(`${getApiUrl()}/api/patches/${id}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answer }),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit answer for ${id}: ${response.status}`);
  }

  return response.json();
}
