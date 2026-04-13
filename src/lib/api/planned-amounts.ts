// Type declaration (local, avoids circular dependency)
export interface PlannedAmountsResponse {
  month: string
  debt: number
  cost_of_living: number
  pleasure: number
  application: number
}

export interface PlannedAmountsPayload {
  debt?: number
  cost_of_living?: number
  pleasure?: number
  application?: number
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"

export async function apiFetchPlannedAmounts(month: string): Promise<PlannedAmountsResponse> {
  const response = await fetch(`${BASE}/planned-amounts?month=${encodeURIComponent(month)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch planned amounts: ${response.status} ${response.statusText}`)
  }

  const json = await response.json()
  return json.data
}

export async function apiUpsertPlannedAmounts(
  month: string,
  payload: PlannedAmountsPayload
): Promise<PlannedAmountsResponse> {
  const response = await fetch(`${BASE}/planned-amounts/${encodeURIComponent(month)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Failed to upsert planned amounts: ${response.status} ${response.statusText}`)
  }

  const json = await response.json()
  return json.data
}
