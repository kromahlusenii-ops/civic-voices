export interface SessionSummaryRecord {
  id: string
  sessionId: string
  repoId: string
  engineerId: string | null
  agent: string | null
  model: string
  tokensInput: number
  tokensOutput: number
  cost: number
  duration: number
  messageCount: number
  hamActive: boolean
  energyWh: number | null
  emissionsGco2e: number | null
  createdAt: Date
}

export interface BenchmarkTaskRecord {
  id: string
  sessionSummaryId: string
  taskType: string
  agent: string | null
  tokens: number
  duration: number
  cost: number
  hamActive: boolean
  cacheImprovement: number | null
  energyWh: number | null
  emissionsGco2e: number | null
  createdAt: Date
}

export interface SyncSessionPayload {
  agent: string
  engineer_email?: string
  sessions: SyncSessionEntry[]
}

export interface SyncSessionEntry {
  session_id: string
  model: string
  tokens_input: number
  tokens_output: number
  cost: number
  duration: number
  message_count: number
  ham_active: boolean
}
