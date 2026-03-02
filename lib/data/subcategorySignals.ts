/**
 * Mock signal data for subcategories and issue details.
 * Used by SubcategoryView and IssueDetailView until real data pipeline is live.
 */

import type { TaxonomyCategory, Subcategory } from "./taxonomy"

// Category-level signal scores (matches LegislativeSignalOverview MOCK_SIGNALS)
export const CATEGORY_SIGNALS: Record<string, number> = {
  "Public Safety & Justice": 91,
  "Health & Human Services": 84,
  "Housing & Development": 72,
  "Democracy & Governance": 62,
  "Education & Workforce": 58,
  "Economic Development": 51,
  "Infrastructure & Transit": 45,
  "Environment & Climate": 37,
  "Online Behavior": 55,
}

export function getCategoryScore(categoryName: string): number {
  return CATEGORY_SIGNALS[categoryName] ?? 50
}

export interface SubcategorySignal {
  subcategoryId: string
  score: number
  delta: number
  postCount: number
  sentiment: { negative: number; mixed: number; positive: number }
}

export interface IssueDetailData {
  summary: string
  demographic: string
  billAngles: string[]
  signal: number
  volume: number
  sentimentBreakdown: { negative: number; mixed: number; positive: number }
}

export interface MockConversation {
  platform: "Reddit" | "X" | "TikTok" | "YouTube"
  source: string
  text: string
  sentiment: "positive" | "negative" | "mixed"
  engagement: number
  time: string
  geo: "city" | "state" | "national"
}

// Subcategory signal scores by category (parent score → subcategory scores descending)
const SUBCATEGORY_SIGNALS: Record<string, Record<string, SubcategorySignal>> = {
  safety: {
    "policing-reform": { subcategoryId: "policing-reform", score: 92, delta: 38, postCount: 312, sentiment: { negative: 65, mixed: 20, positive: 15 } },
    "gun-violence": { subcategoryId: "gun-violence", score: 90, delta: 41, postCount: 287, sentiment: { negative: 72, mixed: 15, positive: 13 } },
    "immigration-enforcement": { subcategoryId: "immigration-enforcement", score: 75, delta: 44, postCount: 847, sentiment: { negative: 71, mixed: 18, positive: 11 } },
    "criminal-justice-reform": { subcategoryId: "criminal-justice-reform", score: 68, delta: 15, postCount: 156, sentiment: { negative: 48, mixed: 32, positive: 20 } },
    "domestic-sexual-violence": { subcategoryId: "domestic-sexual-violence", score: 60, delta: 8, postCount: 98, sentiment: { negative: 58, mixed: 25, positive: 17 } },
    "traffic-pedestrian-safety": { subcategoryId: "traffic-pedestrian-safety", score: 53, delta: 5, postCount: 203, sentiment: { negative: 45, mixed: 35, positive: 20 } },
    "juvenile-justice": { subcategoryId: "juvenile-justice", score: 43, delta: 3, postCount: 67, sentiment: { negative: 40, mixed: 38, positive: 22 } },
  },
  health: {
    "childcare": { subcategoryId: "childcare", score: 88, delta: 35, postCount: 423, sentiment: { negative: 62, mixed: 24, positive: 14 } },
    "healthcare-access": { subcategoryId: "healthcare-access", score: 82, delta: 28, postCount: 312, sentiment: { negative: 55, mixed: 28, positive: 17 } },
    "mental-health": { subcategoryId: "mental-health", score: 76, delta: 22, postCount: 198, sentiment: { negative: 58, mixed: 26, positive: 16 } },
    "substance-abuse": { subcategoryId: "substance-abuse", score: 70, delta: 18, postCount: 145, sentiment: { negative: 68, mixed: 20, positive: 12 } },
    "food-security": { subcategoryId: "food-security", score: 64, delta: 12, postCount: 187, sentiment: { negative: 52, mixed: 30, positive: 18 } },
    "elder-care": { subcategoryId: "elder-care", score: 52, delta: 6, postCount: 89, sentiment: { negative: 45, mixed: 35, positive: 20 } },
    "maternal-health": { subcategoryId: "maternal-health", score: 48, delta: 4, postCount: 76, sentiment: { negative: 42, mixed: 38, positive: 20 } },
  },
  housing: {
    "affordable-housing": { subcategoryId: "affordable-housing", score: 85, delta: 32, postCount: 534, sentiment: { negative: 68, mixed: 22, positive: 10 } },
    "homelessness": { subcategoryId: "homelessness", score: 78, delta: 26, postCount: 298, sentiment: { negative: 72, mixed: 18, positive: 10 } },
    "rental-protections": { subcategoryId: "rental-protections", score: 68, delta: 14, postCount: 167, sentiment: { negative: 55, mixed: 28, positive: 17 } },
    "zoning-land-use": { subcategoryId: "zoning-land-use", score: 58, delta: 8, postCount: 124, sentiment: { negative: 48, mixed: 35, positive: 17 } },
    "gentrification": { subcategoryId: "gentrification", score: 52, delta: 6, postCount: 93, sentiment: { negative: 62, mixed: 26, positive: 12 } },
    "public-housing": { subcategoryId: "public-housing", score: 45, delta: 3, postCount: 67, sentiment: { negative: 55, mixed: 30, positive: 15 } },
  },
  education: {
    "k12-education": { subcategoryId: "k12-education", score: 82, delta: 24, postCount: 345, sentiment: { negative: 52, mixed: 28, positive: 20 } },
    "teacher-compensation": { subcategoryId: "teacher-compensation", score: 72, delta: 18, postCount: 234, sentiment: { negative: 48, mixed: 32, positive: 20 } },
    "school-safety": { subcategoryId: "school-safety", score: 65, delta: 12, postCount: 156, sentiment: { negative: 62, mixed: 24, positive: 14 } },
    "higher-education": { subcategoryId: "higher-education", score: 54, delta: 6, postCount: 128, sentiment: { negative: 45, mixed: 35, positive: 20 } },
    "workforce-development": { subcategoryId: "workforce-development", score: 48, delta: 4, postCount: 89, sentiment: { negative: 40, mixed: 38, positive: 22 } },
    "youth-programs": { subcategoryId: "youth-programs", score: 42, delta: 2, postCount: 56, sentiment: { negative: 35, mixed: 40, positive: 25 } },
  },
  infrastructure: {
    "road-bridge": { subcategoryId: "road-bridge", score: 72, delta: 16, postCount: 412, sentiment: { negative: 58, mixed: 28, positive: 14 } },
    "public-transit": { subcategoryId: "public-transit", score: 68, delta: 14, postCount: 298, sentiment: { negative: 55, mixed: 30, positive: 15 } },
    "water-sewer": { subcategoryId: "water-sewer", score: 58, delta: 10, postCount: 145, sentiment: { negative: 62, mixed: 24, positive: 14 } },
    "energy-utilities": { subcategoryId: "energy-utilities", score: 52, delta: 6, postCount: 112, sentiment: { negative: 55, mixed: 30, positive: 15 } },
    "sidewalks": { subcategoryId: "sidewalks", score: 45, delta: 4, postCount: 78, sentiment: { negative: 48, mixed: 35, positive: 17 } },
    "broadband": { subcategoryId: "broadband", score: 38, delta: 2, postCount: 54, sentiment: { negative: 42, mixed: 38, positive: 20 } },
  },
  environment: {
    "climate-resilience": { subcategoryId: "climate-resilience", score: 52, delta: 8, postCount: 156, sentiment: { negative: 55, mixed: 28, positive: 17 } },
    "air-quality": { subcategoryId: "air-quality", score: 45, delta: 4, postCount: 98, sentiment: { negative: 58, mixed: 28, positive: 14 } },
    "water-quality-env": { subcategoryId: "water-quality-env", score: 42, delta: 3, postCount: 87, sentiment: { negative: 52, mixed: 32, positive: 16 } },
    "waste-recycling": { subcategoryId: "waste-recycling", score: 38, delta: 2, postCount: 76, sentiment: { negative: 45, mixed: 35, positive: 20 } },
    "green-space-parks": { subcategoryId: "green-space-parks", score: 32, delta: -1, postCount: 64, sentiment: { negative: 35, mixed: 40, positive: 25 } },
    "environmental-justice": { subcategoryId: "environmental-justice", score: 28, delta: -2, postCount: 45, sentiment: { negative: 62, mixed: 26, positive: 12 } },
  },
  democracy: {
    "voting-rights": { subcategoryId: "voting-rights", score: 76, delta: 20, postCount: 234, sentiment: { negative: 55, mixed: 28, positive: 17 } },
    "civil-rights": { subcategoryId: "civil-rights", score: 68, delta: 14, postCount: 198, sentiment: { negative: 52, mixed: 30, positive: 18 } },
    "redistricting": { subcategoryId: "redistricting", score: 58, delta: 8, postCount: 112, sentiment: { negative: 58, mixed: 28, positive: 14 } },
    "government-transparency": { subcategoryId: "government-transparency", score: 48, delta: 4, postCount: 89, sentiment: { negative: 45, mixed: 35, positive: 20 } },
    "campaign-finance": { subcategoryId: "campaign-finance", score: 42, delta: 2, postCount: 67, sentiment: { negative: 52, mixed: 32, positive: 16 } },
  },
  economy: {
    "cost-of-living": { subcategoryId: "cost-of-living", score: 78, delta: 22, postCount: 456, sentiment: { negative: 68, mixed: 22, positive: 10 } },
    "minimum-wage-labor": { subcategoryId: "minimum-wage-labor", score: 68, delta: 16, postCount: 234, sentiment: { negative: 55, mixed: 28, positive: 17 } },
    "tax-policy": { subcategoryId: "tax-policy", score: 58, delta: 8, postCount: 145, sentiment: { negative: 52, mixed: 30, positive: 18 } },
    "small-business": { subcategoryId: "small-business", score: 48, delta: 4, postCount: 98, sentiment: { negative: 42, mixed: 38, positive: 20 } },
    "rural-development": { subcategoryId: "rural-development", score: 38, delta: 0, postCount: 56, sentiment: { negative: 45, mixed: 35, positive: 20 } },
  },
  "online-behavior": {
    "child-safety-youth-usage": { subcategoryId: "child-safety-youth-usage", score: 82, delta: 24, postCount: 312, sentiment: { negative: 65, mixed: 22, positive: 13 } },
    "content-moderation-censorship": { subcategoryId: "content-moderation-censorship", score: 78, delta: 20, postCount: 267, sentiment: { negative: 58, mixed: 25, positive: 17 } },
    "platform-governance-accountability": { subcategoryId: "platform-governance-accountability", score: 74, delta: 18, postCount: 198, sentiment: { negative: 52, mixed: 30, positive: 18 } },
    "misinformation-manipulation": { subcategoryId: "misinformation-manipulation", score: 70, delta: 16, postCount: 245, sentiment: { negative: 62, mixed: 24, positive: 14 } },
    "algorithmic-influence-recommendation-systems": { subcategoryId: "algorithmic-influence-recommendation-systems", score: 66, delta: 14, postCount: 156, sentiment: { negative: 48, mixed: 32, positive: 20 } },
    "online-harassment-abuse": { subcategoryId: "online-harassment-abuse", score: 62, delta: 12, postCount: 178, sentiment: { negative: 68, mixed: 20, positive: 12 } },
    "digital-addiction-screen-time": { subcategoryId: "digital-addiction-screen-time", score: 58, delta: 10, postCount: 134, sentiment: { negative: 45, mixed: 35, positive: 20 } },
    "digital-accessibility-inclusion": { subcategoryId: "digital-accessibility-inclusion", score: 54, delta: 8, postCount: 112, sentiment: { negative: 52, mixed: 30, positive: 18 } },
    "digital-identity-anonymity": { subcategoryId: "digital-identity-anonymity", score: 48, delta: 4, postCount: 89, sentiment: { negative: 42, mixed: 36, positive: 22 } },
    "online-radicalization-extremism": { subcategoryId: "online-radicalization-extremism", score: 42, delta: 2, postCount: 67, sentiment: { negative: 58, mixed: 28, positive: 14 } },
  },
}

export function getSubcategorySignal(categoryId: string, subcategoryId: string): SubcategorySignal | undefined {
  return SUBCATEGORY_SIGNALS[categoryId]?.[subcategoryId]
}

export function getSubcategorySignalsForCategory(
  category: TaxonomyCategory,
  subcategories: Subcategory[]
): Array<Subcategory & { signal: SubcategorySignal }> {
  const categorySignals = SUBCATEGORY_SIGNALS[category.id] ?? {}
  return subcategories
    .map((sub) => {
      const signal = categorySignals[sub.id] ?? {
        subcategoryId: sub.id,
        score: Math.max(20, Math.min(95, 50 + Math.floor(Math.random() * 30))),
        delta: Math.floor(Math.random() * 20) - 5,
        postCount: Math.floor(Math.random() * 200) + 30,
        sentiment: { negative: 50, mixed: 30, positive: 20 },
      }
      return { ...sub, signal }
    })
    .sort((a, b) => b.signal.score - a.signal.score)
}

// Issue detail mock data for trending subcategories
const ISSUE_DETAIL_MOCK: Record<string, IssueDetailData & { conversations: MockConversation[] }> = {
  "immigration-enforcement": {
    summary:
      "Immigration enforcement is the highest-signal issue in Charlotte right now. Two flashpoints: proposed ICE access to NC DMV records, and rumors of a detention facility in rural NC. Constituent calls to legislative offices are surging — one office reports 10+ calls/day on this alone.",
    demographic:
      "Broad coalition: Latino community (primary), civil liberties advocates, faith communities, and suburban moderates concerned about government overreach.",
    billAngles: [
      "Ban state agency data-sharing with federal immigration authorities",
      "Prohibit use of state funds/facilities for immigration detention",
    ],
    signal: 75,
    volume: 847,
    sentimentBreakdown: { negative: 71, mixed: 18, positive: 11 },
    conversations: [
      {
        platform: "Reddit",
        source: "r/Charlotte",
        text: "Does anyone know if charlotte has any kind of sanctuary policy? Asking for a friend who's worried about their family.",
        sentiment: "negative",
        engagement: 567,
        time: "3h ago",
        geo: "city",
      },
      {
        platform: "Reddit",
        source: "r/Charlotte",
        text: "So ICE is apparently trying to get access to NC DMV records now? This is exactly what people were afraid of. My neighbors are terrified to renew their licenses.",
        sentiment: "negative",
        engagement: 1247,
        time: "5h ago",
        geo: "city",
      },
      {
        platform: "X",
        source: "@NCJustice",
        text: "Rumors of a new detention facility in rural NC — community meetings happening this week. This affects us all.",
        sentiment: "negative",
        engagement: 892,
        time: "1d ago",
        geo: "state",
      },
      {
        platform: "X",
        source: "@FaithNC",
        text: "Our congregation has been supporting families affected by enforcement. The fear is real. We need our legislators to act.",
        sentiment: "mixed",
        engagement: 234,
        time: "2d ago",
        geo: "state",
      },
    ],
  },
  childcare: {
    summary:
      "Childcare costs and availability dominate parent discussions. Waitlists at quality centers are 6-12 months. Many families report spending 25%+ of income on care. State subsidy expansion is a top legislative ask.",
    demographic: "Parents (especially mothers), early childhood educators, small business owners struggling with employee retention.",
    billAngles: [
      "Expand childcare subsidy eligibility and raise reimbursement rates",
      "Create tax credits for employers offering on-site care",
    ],
    signal: 88,
    volume: 423,
    sentimentBreakdown: { negative: 62, mixed: 24, positive: 14 },
    conversations: [
      {
        platform: "Reddit",
        source: "r/parenting",
        text: "$1800/month for ONE toddler. How is this sustainable? I make decent money and it still hurts.",
        sentiment: "negative",
        engagement: 456,
        time: "4h ago",
        geo: "national",
      },
      {
        platform: "TikTok",
        source: "@momlife",
        text: "Waitlisted at 4 daycares. Baby is 8 months old. What are working parents supposed to do?",
        sentiment: "negative",
        engagement: 12000,
        time: "1d ago",
        geo: "city",
      },
    ],
  },
  "affordable-housing": {
    summary:
      "Rent increases of 15-25% year-over-year are pushing families out. Affordable housing development is slow; NIMBY opposition and zoning delays are common. Housing trust fund proposals gaining traction.",
    demographic: "Renters, housing advocates, young professionals, seniors on fixed income.",
    billAngles: [
      "Fund state housing trust fund at $50M annually",
      "Streamline permitting for affordable housing developments",
    ],
    signal: 85,
    volume: 534,
    sentimentBreakdown: { negative: 68, mixed: 22, positive: 10 },
    conversations: [
      {
        platform: "Reddit",
        source: "r/NorthCarolina",
        text: "Our rent went from $1200 to $1550. Same unit. No upgrades. Landlord said 'market rate.' Where do we go?",
        sentiment: "negative",
        engagement: 789,
        time: "6h ago",
        geo: "state",
      },
    ],
  },
  "policing-reform": {
    summary:
      "Body camera footage releases and use-of-force policies remain contentious. Community calls for independent oversight; some jurisdictions have made progress, others have stalled.",
    demographic: "Civil rights groups, affected families, police unions, community organizers.",
    billAngles: [
      "Require independent civilian oversight boards",
      "Mandate release of body camera footage within 30 days",
    ],
    signal: 92,
    volume: 312,
    sentimentBreakdown: { negative: 65, mixed: 20, positive: 15 },
    conversations: [
      {
        platform: "Reddit",
        source: "r/Charlotte",
        text: "Finally saw the body cam from the incident. Changes everything. Transparency matters.",
        sentiment: "mixed",
        engagement: 234,
        time: "2h ago",
        geo: "city",
      },
    ],
  },
  "gun-violence": {
    summary:
      "Community responses to recent incidents have amplified calls for red flag laws and safe storage requirements. Debate remains polarized along familiar lines.",
    demographic: "Gun violence survivors, Moms Demand Action, 2A advocates, trauma surgeons.",
    billAngles: [
      "Enact extreme risk protection order (red flag) law",
      "Require secure storage when minors present",
    ],
    signal: 90,
    volume: 287,
    sentimentBreakdown: { negative: 72, mixed: 15, positive: 13 },
    conversations: [
      {
        platform: "X",
        source: "@SafeNC",
        text: "Another weekend, another shooting. When will our leaders act? Thoughts and prayers aren't enough.",
        sentiment: "negative",
        engagement: 456,
        time: "1d ago",
        geo: "state",
      },
    ],
  },
  "voting-rights": {
    summary:
      "Voter ID implementation and early voting changes continue to generate discussion. Advocacy groups are organizing registration drives and poll watcher training.",
    demographic: "League of Women Voters, NAACP, youth vote orgs, election administrators.",
    billAngles: [
      "Extend early voting period to 3 weeks",
      "Allow same-day registration during early vote",
    ],
    signal: 76,
    volume: 234,
    sentimentBreakdown: { negative: 55, mixed: 28, positive: 17 },
    conversations: [
      {
        platform: "Reddit",
        source: "r/NorthCarolina",
        text: "Just helped 20 people register at the library. Every vote matters. Get your ID ready.",
        sentiment: "positive",
        engagement: 123,
        time: "3d ago",
        geo: "state",
      },
    ],
  },
  "k12-education": {
    summary:
      "School funding formula and teacher pay remain top concerns. Class size debates continue; charter expansion is contentious in some districts.",
    demographic: "Teachers, parents, school board members, PTAs.",
    billAngles: [
      "Increase per-pupil funding to meet national average",
      "Raise teacher starting salary to $50K",
    ],
    signal: 82,
    volume: 345,
    sentimentBreakdown: { negative: 52, mixed: 28, positive: 20 },
    conversations: [
      {
        platform: "Reddit",
        source: "r/Teachers",
        text: "Our district cut 3 positions. Class sizes going to 32. How is this good for kids?",
        sentiment: "negative",
        engagement: 567,
        time: "1d ago",
        geo: "national",
      },
    ],
  },
  "cost-of-living": {
    summary:
      "Groceries, rent, and utilities are squeezing families. Inflation discussions have shifted to local affordability — wage stagnation vs. cost increases.",
    demographic: "Working families, seniors, small business owners.",
    billAngles: [
      "Expand earned income tax credit",
      "Cap rent increase percentage year-over-year",
    ],
    signal: 78,
    volume: 456,
    sentimentBreakdown: { negative: 68, mixed: 22, positive: 10 },
    conversations: [
      {
        platform: "X",
        source: "@NCWorker",
        text: "Making $18/hr and still can't afford groceries and rent. Something has to give.",
        sentiment: "negative",
        engagement: 345,
        time: "2d ago",
        geo: "state",
      },
    ],
  },
  "public-transit": {
    summary:
      "Bus route cuts and reliability complaints are driving discussion. Light rail expansion proposals have support but face funding questions.",
    demographic: "Transit-dependent workers, environmental advocates, urban planners.",
    billAngles: [
      "Restore cut bus routes and extend evening service",
      "Fund feasibility study for rail extension",
    ],
    signal: 68,
    volume: 298,
    sentimentBreakdown: { negative: 55, mixed: 30, positive: 15 },
    conversations: [
      {
        platform: "Reddit",
        source: "r/Charlotte",
        text: "Bus was 45 min late yesterday. Third time this week. How do people get to work?",
        sentiment: "negative",
        engagement: 234,
        time: "5h ago",
        geo: "city",
      },
    ],
  },
}

export function getIssueDetail(subcategoryId: string): (IssueDetailData & { conversations: MockConversation[] }) | null {
  return ISSUE_DETAIL_MOCK[subcategoryId] ?? null
}

// 311 signal mock for categories that have threeElevenSignals
export const MOCK_311_SIGNALS: Record<string, Array<{ label: string; count: number }>> = {
  safety: [
    { label: "police complaints", count: 47 },
    { label: "use of force", count: 12 },
    { label: "traffic complaints", count: 89 },
    { label: "shots fired", count: 31 },
  ],
  housing: [
    { label: "code enforcement", count: 34 },
    { label: "housing complaints", count: 28 },
    { label: "eviction notices", count: 15 },
  ],
  infrastructure: [
    { label: "pothole", count: 156 },
    { label: "road repair", count: 89 },
    { label: "transit complaints", count: 42 },
  ],
  education: [
    { label: "school facility complaints", count: 23 },
  ],
  "online-behavior": [
    { label: "broadband service complaint", count: 18 },
    { label: "internet service complaint", count: 12 },
    { label: "ADA complaint", count: 8 },
  ],
}
