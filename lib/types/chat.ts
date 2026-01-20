import { Post, AIAnalysis } from "./api"

// Chat message roles
export type ChatRole = "user" | "assistant"

// Chat status states
export type ChatStatus = "idle" | "streaming" | "error"

// Citation linking to a source post
export interface Citation {
  index: number        // Display index [1], [2], etc.
  postId: string       // Reference to Post.id
  text: string         // Snippet from the post
  platform: string     // x, tiktok, youtube, etc.
  author: string       // Author handle
}

// Individual chat message
export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  citations?: Citation[]
  timestamp: Date
}

// Context passed to Claude for generating responses
export interface ChatContext {
  reportId: string
  query: string
  posts: Post[]
  aiAnalysis: AIAnalysis | null
  metrics: {
    totalMentions: number
    totalEngagement: number
    sentimentBreakdown: {
      positive: number
      negative: number
      neutral: number
    }
  }
}

// Suggested prompt for welcome screen
export interface SuggestedPrompt {
  id: string
  label: string
  prompt: string
  icon?: string
}

// SSE event types for streaming
export type ChatSSEEventType = "start" | "delta" | "complete" | "error"

export interface ChatSSEEvent {
  type: ChatSSEEventType
  data: ChatSSEStartData | ChatSSEDeltaData | ChatSSECompleteData | ChatSSEErrorData
}

export interface ChatSSEStartData {
  messageId: string
}

export interface ChatSSEDeltaData {
  content: string
}

export interface ChatSSECompleteData {
  fullMessage: string
  citations: Citation[]
}

export interface ChatSSEErrorData {
  message: string
}

// Request body for chat API
export interface ChatRequest {
  message: string
  conversationHistory: {
    role: ChatRole
    content: string
  }[]
}

// MVP suggested prompts
export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    id: "pain-points",
    label: "Pain Points",
    prompt: "What are the main pain points people are expressing?",
  },
  {
    id: "sentiment",
    label: "Overall Sentiment",
    prompt: "What's the overall sentiment about this topic?",
  },
  {
    id: "topics",
    label: "Hot Topics",
    prompt: "What topics are people most passionate about?",
  },
  {
    id: "questions",
    label: "Questions",
    prompt: "What questions are people asking?",
  },
  {
    id: "concerns",
    label: "Concerns",
    prompt: "What are the biggest concerns or worries being expressed?",
  },
  {
    id: "praise",
    label: "Praise",
    prompt: "What do people praise or love about this?",
  },
]
