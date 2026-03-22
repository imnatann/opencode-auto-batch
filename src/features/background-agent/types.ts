import type { FallbackEntry } from "../../shared/model-requirements"
import type { SessionPermissionRule } from "../../shared/question-denied-session-permission"

export type BackgroundTaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "error"
  | "cancelled"
  | "interrupt"

export interface ToolCallWindow {
  lastSignature: string
  consecutiveCount: number
  threshold: number
}

export interface TaskProgress {
  toolCalls: number
  lastTool?: string
  toolCallWindow?: ToolCallWindow
  countedToolPartIDs?: Set<string>
  lastUpdate: Date
  lastMessage?: string
  lastMessageAt?: Date
}

export interface BackgroundTask {
  id: string
  sessionID?: string
  rootSessionID?: string
  parentSessionID: string
  parentMessageID: string
  description: string
  prompt: string
  agent: string
  spawnDepth?: number
  status: BackgroundTaskStatus
  queuedAt?: Date
  startedAt?: Date
  completedAt?: Date
  result?: string
  error?: string
  progress?: TaskProgress
  parentModel?: { providerID: string; modelID: string }
  model?: { providerID: string; modelID: string; variant?: string }
  fallbackChain?: FallbackEntry[]
  attemptCount?: number
  concurrencyKey?: string
  concurrencyGroup?: string
  parentAgent?: string
  parentTools?: Record<string, boolean>
  isUnstableAgent?: boolean
  category?: string

  lastMsgCount?: number
  stablePolls?: number
  ownershipBundle?: string
  ownershipResources?: string[]
  writeCapable?: boolean
  serialWave?: number
  draftStart?: boolean
  ownershipKeys?: string[]
}

export interface LaunchInput {
  description: string
  prompt: string
  agent: string
  parentSessionID: string
  parentMessageID: string
  parentModel?: { providerID: string; modelID: string }
  parentAgent?: string
  parentTools?: Record<string, boolean>
  model?: { providerID: string; modelID: string; variant?: string }
  fallbackChain?: FallbackEntry[]
  isUnstableAgent?: boolean
  skills?: string[]
  skillContent?: string
  category?: string
  sessionPermission?: SessionPermissionRule[]
  ownershipBundle?: string
  ownershipResources?: string[]
  writeCapable?: boolean
  serialWave?: number
  draftStart?: boolean
}

export interface ResumeInput {
  sessionId: string
  prompt: string
  parentSessionID: string
  parentMessageID: string
  parentModel?: { providerID: string; modelID: string }
  parentAgent?: string
  parentTools?: Record<string, boolean>
}
