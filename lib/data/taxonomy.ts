/**
 * Civic Voices taxonomy — 9 categories, 56 subcategories.
 * Source: docs/civic-voices-taxonomy.xlsx - Taxonomy.csv
 * Design: docs/MASTER_PROMPT.md
 */

export interface Subcategory {
  id: string
  name: string
  socialKeywords: string[]
  searchQuery: string // Primary query for on-demand search (subcategory name + top keywords)
  threeElevenSignals: string[]
  billLanguage: string[]
}

export interface TaxonomyCategory {
  id: string
  name: string
  icon: string
  color: string // MASTER_PROMPT category color
  sortOrder: number
  subcategories: Subcategory[]
}

// MASTER_PROMPT category colors (optimized for light background)
const CATEGORY_COLORS: Record<string, string> = {
  "Housing & Development": "#D4654A",
  "Health & Human Services": "#4A90D9",
  "Public Safety & Justice": "#2E7D32",
  "Education & Workforce": "#D4A24A",
  "Infrastructure & Transit": "#8B6DB0",
  "Environment & Climate": "#3D8B6E",
  "Democracy & Governance": "#B06080",
  "Economic Development": "#C07A3E",
  "Online Behavior": "#5B8DEF",
}

function toSearchQuery(name: string, keywords: string[]): string {
  // Use subcategory name; add top 4 keywords for broader recall (MASTER_PROMPT: Social Keyword Search)
  const top = keywords.slice(0, 4).filter((k) => k.length > 2)
  if (top.length === 0) return name
  return [name, ...top].join(" ")
}

export const TAXONOMY: TaxonomyCategory[] = [
  {
    id: "housing",
    name: "Housing & Development",
    icon: "⌂",
    color: CATEGORY_COLORS["Housing & Development"] ?? "#D4654A",
    sortOrder: 1,
    subcategories: [
      {
        id: "affordable-housing",
        name: "Affordable Housing",
        socialKeywords: ["rent prices", "can't afford", "housing costs", "priced out", "section 8", "voucher", "rent too high", "housing crisis", "paycheck to paycheck", "rent is crazy", "barely making rent", "housing shortage", "where am I supposed to live"],
        searchQuery: toSearchQuery("Affordable Housing", ["rent prices", "housing costs", "section 8", "housing crisis"]),
        threeElevenSignals: ["code enforcement", "housing complaints", "eviction notices"],
        billLanguage: ["affordable housing fund", "inclusionary zoning", "housing trust"],
      },
      { id: "homelessness", name: "Homelessness", socialKeywords: ["unhoused", "tent city", "shelters full", "sleeping outside", "homeless camp", "living in car", "encampment", "nowhere to go", "street people", "couch surfing"], searchQuery: toSearchQuery("Homelessness", ["unhoused", "homeless camp", "tent city", "shelters full"]), threeElevenSignals: ["homeless encampment", "shelter capacity"], billLanguage: ["homeless services", "continuum of care", "emergency shelter"] },
      { id: "zoning-land-use", name: "Zoning & Land Use", socialKeywords: ["developers", "rezoning", "density", "NIMBY", "building in my neighborhood", "zoning fight", "apartment complex", "traffic nightmare", "character of neighborhood", "over-development"], searchQuery: toSearchQuery("Zoning Land Use", ["rezoning", "density", "NIMBY"]), threeElevenSignals: ["zoning variance", "permit complaint"], billLanguage: ["land use regulation", "zoning overlay", "comprehensive plan"] },
      { id: "gentrification", name: "Gentrification & Displacement", socialKeywords: ["gentrification", "neighborhood changing", "pushed out", "long-time residents", "used to be affordable", "whole foods moving in", "not my neighborhood anymore", "priced out of my own neighborhood", "hipsters everywhere"], searchQuery: toSearchQuery("Gentrification", ["gentrification", "displacement", "pushed out", "neighborhood changing"]), threeElevenSignals: ["neighborhood change complaints"], billLanguage: ["anti-displacement", "community land trust", "right to return"] },
      { id: "rental-protections", name: "Rental Protections", socialKeywords: ["landlord", "eviction", "lease", "security deposit", "rent increase", "slumlord", "landlord won't fix", "eviction notice", "shady landlord", "renters rights", "lease breaking"], searchQuery: toSearchQuery("Rental Protections", ["eviction", "rent increase", "landlord"]), threeElevenSignals: ["landlord-tenant disputes"], billLanguage: ["tenant protection", "eviction moratorium", "rent stabilization"] },
      { id: "public-housing", name: "Public Housing", socialKeywords: ["housing authority", "project", "maintenance", "public housing falling apart", "section 8 waitlist", "PHA", "waiting years", "project buildings", "housing authority not responding", "public housing conditions"], searchQuery: toSearchQuery("Public Housing", ["housing authority", "section 8", "maintenance", "project"]), threeElevenSignals: ["public housing maintenance"], billLanguage: ["public housing capital", "housing authority reform"] },
    ],
  },
  {
    id: "health",
    name: "Health & Human Services",
    icon: "✚",
    color: CATEGORY_COLORS["Health & Human Services"] ?? "#4A90D9",
    sortOrder: 2,
    subcategories: [
      { id: "healthcare-access", name: "Healthcare Access", socialKeywords: ["insurance", "ER wait", "can't see a doctor", "uninsured", "healthcare too expensive", "Medicaid", "ACA", "months for appointment", "urgent care", "no doctor taking patients", "insurance denied", "out of network"], searchQuery: toSearchQuery("Healthcare Access", ["insurance", "uninsured", "Medicaid"]), threeElevenSignals: [], billLanguage: ["Medicaid expansion", "healthcare access", "insurance mandate"] },
      { id: "childcare", name: "Childcare", socialKeywords: ["daycare costs", "childcare desert", "can't afford daycare", "preschool", "$1800 a month", "childcare closing", "second mortgage for daycare", "waitlist for daycare", "childcare more than rent", "no spots available", "stay home because daycare"], searchQuery: toSearchQuery("Childcare", ["daycare costs", "childcare desert", "preschool", "childcare closing"]), threeElevenSignals: ["childcare facility complaints"], billLanguage: ["childcare subsidy", "provider licensing", "early childhood education"] },
      { id: "mental-health", name: "Mental Health", socialKeywords: ["therapy", "depression", "anxiety", "mental health services", "can't get an appointment", "mental health crisis", "therapist waitlist", "struggling", "burned out", "therapist not taking new patients", "insurance won't cover therapy"], searchQuery: toSearchQuery("Mental Health", ["therapy", "mental health services", "anxiety"]), threeElevenSignals: ["mental health crisis calls"], billLanguage: ["behavioral health", "mental health parity", "crisis intervention"] },
      { id: "elder-care", name: "Elder Care", socialKeywords: ["nursing home", "assisted living", "aging parent", "medicare", "elderly abuse", "senior care costs", "can't afford nursing home", "taking care of parents", "senior housing", "long term care insurance", "memory care"], searchQuery: toSearchQuery("Elder Care", ["nursing home", "assisted living", "medicare"]), threeElevenSignals: ["elder abuse reports"], billLanguage: ["aging services", "long-term care", "elder abuse prevention"] },
      { id: "food-security", name: "Food Security", socialKeywords: ["food stamps", "SNAP", "food desert", "hungry", "EBT", "groceries expensive", "food bank", "skipping meals", "kids going hungry", "no grocery store nearby", "food pantry", "WIC"], searchQuery: toSearchQuery("Food Security", ["SNAP", "food desert", "food bank"]), threeElevenSignals: ["food bank capacity"], billLanguage: ["food assistance", "SNAP benefits", "food access"] },
      { id: "substance-abuse", name: "Substance Abuse", socialKeywords: ["opioid", "fentanyl", "overdose", "rehab", "naloxone", "addiction", "meth", "drug crisis", "narcan", "lost someone to overdose", "sober living", "recovery", "can't get into treatment"], searchQuery: toSearchQuery("Substance Abuse", ["opioid", "overdose", "fentanyl", "addiction"]), threeElevenSignals: ["overdose reports", "needle disposal"], billLanguage: ["substance abuse treatment", "opioid prevention", "recovery services"] },
      { id: "maternal-health", name: "Maternal Health", socialKeywords: ["pregnancy", "maternal mortality", "postpartum", "OB-GYN", "Black maternal health", "doula", "midwife", "birth trauma", "postpartum depression", "childbirth costs", "pregnancy discrimination", "lactation support"], searchQuery: toSearchQuery("Maternal Health", ["maternal mortality", "postpartum", "Black maternal health"]), threeElevenSignals: [], billLanguage: ["maternal health", "perinatal care", "midwifery", "birth equity"] },
    ],
  },
  {
    id: "safety",
    name: "Public Safety & Justice",
    icon: "◈",
    color: CATEGORY_COLORS["Public Safety & Justice"] ?? "#2E7D32",
    sortOrder: 3,
    subcategories: [
      { id: "policing-reform", name: "Policing & Reform", socialKeywords: ["police", "cops", "body cameras", "defund", "reform", "excessive force", "police brutality", "accountability", "qualified immunity", "police violence", "ACAB", "reform the police"], searchQuery: toSearchQuery("Policing Reform", ["police", "body cameras", "police brutality"]), threeElevenSignals: ["police complaints", "use of force"], billLanguage: ["police oversight", "use of force policy", "body-worn camera"] },
      { id: "gun-violence", name: "Gun Violence", socialKeywords: ["gun violence", "shooting", "mass shooting", "gun control", "second amendment", "shots fired", "red flag", "school shooting", "active shooter", "gun safety", "firearm laws", "background checks"], searchQuery: toSearchQuery("Gun Violence", ["gun violence", "shooting", "gun control"]), threeElevenSignals: ["shots fired reports"], billLanguage: ["firearm regulation", "gun violence prevention", "concealed carry"] },
      { id: "immigration-enforcement", name: "Immigration Enforcement", socialKeywords: ["ICE", "deportation", "undocumented", "DACA", "migrants", "sanctuary city", "border", "asylum", "immigration raid", "detained", "dreamers", "immigrant rights", "family separation"], searchQuery: toSearchQuery("Immigration Enforcement", ["ICE", "deportation", "DACA", "sanctuary city"]), threeElevenSignals: [], billLanguage: ["immigration enforcement", "sanctuary", "cooperation with federal agents"] },
      { id: "criminal-justice-reform", name: "Criminal Justice Reform", socialKeywords: ["incarceration", "prison", "bail", "sentencing", "reentry", "mass incarceration", "cash bail", "locked up", "prison reform", "wrongful conviction", "mandatory minimums", "criminal record"], searchQuery: toSearchQuery("Criminal Justice Reform", ["incarceration", "bail", "sentencing"]), threeElevenSignals: [], billLanguage: ["sentencing reform", "bail reform", "reentry services"] },
      { id: "domestic-sexual-violence", name: "Domestic & Sexual Violence", socialKeywords: ["domestic violence", "restraining order", "sexual assault", "survivors", "DV", "protective order", "intimate partner violence", "me too", "abuse", "safe house", "assault survivor"], searchQuery: toSearchQuery("Domestic Violence", ["domestic violence", "sexual assault", "restraining order"]), threeElevenSignals: ["DV reports"], billLanguage: ["domestic violence prevention", "protective order", "victim services"] },
      { id: "traffic-pedestrian-safety", name: "Traffic & Pedestrian Safety", socialKeywords: ["hit and run", "speeding", "dangerous intersection", "pedestrian", "crosswalk", "road rage", "bike lane", "cars going too fast", "unsafe to cross", "need a stoplight", "sidewalk missing", "bike safety"], searchQuery: toSearchQuery("Traffic Safety", ["speeding", "pedestrian", "crosswalk"]), threeElevenSignals: ["traffic complaints", "speeding", "signal requests"], billLanguage: ["traffic calming", "Vision Zero", "pedestrian safety"] },
      { id: "juvenile-justice", name: "Juvenile Justice", socialKeywords: ["youth crime", "juvenile detention", "school-to-prison", "troubled teen", "youth violence", "kids in jail", "juvenile hall", "youth offender", "juvie", "youth incarceration"], searchQuery: toSearchQuery("Juvenile Justice", ["youth crime", "juvenile detention", "school-to-prison"]), threeElevenSignals: [], billLanguage: ["juvenile justice reform", "diversion program", "youth rehabilitation"] },
    ],
  },
  {
    id: "education",
    name: "Education & Workforce",
    icon: "▦",
    color: CATEGORY_COLORS["Education & Workforce"] ?? "#D4A24A",
    sortOrder: 4,
    subcategories: [
      { id: "k12-education", name: "K-12 Education", socialKeywords: ["school funding", "teachers", "class size", "school choice", "charter", "public school", "school board", "overcrowded classroom", "schools need funding", "public education", "vouchers", "school quality"], searchQuery: toSearchQuery("K-12 Education", ["school funding", "school choice", "charter"]), threeElevenSignals: ["school facility complaints"], billLanguage: ["education funding formula", "per-pupil expenditure"] },
      { id: "teacher-compensation", name: "Teacher Compensation", socialKeywords: ["teacher pay", "teacher shortage", "burned out", "teachers deserve more", "teacher salary", "underpaid teachers", "leaving teaching", "teacher strike", "educators deserve better", "pay teachers more"], searchQuery: toSearchQuery("Teacher Pay", ["teacher pay", "teacher shortage", "teacher salary"]), threeElevenSignals: [], billLanguage: ["teacher salary", "educator recruitment", "compensation study"] },
      { id: "higher-education", name: "Higher Education", socialKeywords: ["student loans", "tuition", "community college", "HBCU", "college costs", "financial aid", "student debt", "loan forgiveness", "can't afford college", "drowning in student debt", "college unaffordable", "tuition increases"], searchQuery: toSearchQuery("Higher Education", ["student loans", "tuition", "college costs"]), threeElevenSignals: [], billLanguage: ["tuition assistance", "student debt", "higher education access"] },
      { id: "workforce-development", name: "Workforce Development", socialKeywords: ["job training", "skills gap", "apprenticeship", "unemployment", "trade school", "jobs program", "need work", "can't find job", "career change", "upskilling", "job placement"], searchQuery: toSearchQuery("Workforce Development", ["job training", "apprenticeship", "unemployment"]), threeElevenSignals: ["job training inquiries"], billLanguage: ["workforce development", "job training", "apprenticeship program"] },
      { id: "youth-programs", name: "Youth Programs", socialKeywords: ["after school", "summer program", "youth center", "recreation", "teens", "community center", "mentoring", "kids need activities", "nothing for kids to do", "youth activities", "rec center", "summer camp"], searchQuery: toSearchQuery("Youth Programs", ["after school", "summer program", "youth center"]), threeElevenSignals: ["recreation program complaints"], billLanguage: ["youth services", "after-school program", "recreation funding"] },
      { id: "school-safety", name: "School Safety", socialKeywords: ["school shooting", "school resource officer", "lockdown", "bullying", "school threat", "metal detectors", "lockdown drill", "school violence", "kids safety at school", "secure schools", "threat assessment"], searchQuery: toSearchQuery("School Safety", ["school shooting", "bullying", "school resource officer"]), threeElevenSignals: [], billLanguage: ["school safety", "threat assessment", "school resource officer"] },
    ],
  },
  {
    id: "infrastructure",
    name: "Infrastructure & Transit",
    icon: "⬡",
    color: CATEGORY_COLORS["Infrastructure & Transit"] ?? "#8B6DB0",
    sortOrder: 5,
    subcategories: [
      { id: "road-bridge", name: "Road & Bridge Conditions", socialKeywords: ["pothole", "road conditions", "bridge unsafe", "road falling apart", "construction", "pavement", "crumbling infrastructure", "fix the roads", "roads terrible", "potholes everywhere", "bridge repair"], searchQuery: toSearchQuery("Road Conditions", ["pothole", "road conditions", "construction"]), threeElevenSignals: ["pothole", "road repair", "road debris"], billLanguage: ["highway maintenance", "road improvement", "infrastructure fund"] },
      { id: "public-transit", name: "Public Transit", socialKeywords: ["bus late", "light rail", "transit cuts", "no service", "bus doesn't come", "transit funding", "bus route cancelled", "waited 2 hours for bus", "unreliable transit", "metro", "subway", "need better transit"], searchQuery: toSearchQuery("Public Transit", ["bus late", "light rail", "transit funding"]), threeElevenSignals: ["transit complaints", "bus stop"], billLanguage: ["public transit funding", "transit authority", "bus rapid transit"] },
      { id: "water-sewer", name: "Water & Sewer", socialKeywords: ["water quality", "lead pipes", "boil advisory", "sewage", "flooding", "water main break", "pipe burst", "brown water", "sewer backup", "water not safe", "water contamination", "old pipes"], searchQuery: toSearchQuery("Water Sewer", ["water quality", "lead pipes", "water main break"]), threeElevenSignals: ["water main break", "sewer backup", "water quality"], billLanguage: ["water infrastructure", "lead service line", "sewer modernization"] },
      { id: "broadband", name: "Broadband & Digital Access", socialKeywords: ["internet access", "no wifi", "broadband", "digital divide", "rural internet", "slow internet", "can't work from home no internet", "internet too expensive", "no fiber", "internet service", "connectivity"], searchQuery: toSearchQuery("Broadband", ["internet access", "broadband", "digital divide"]), threeElevenSignals: [], billLanguage: ["broadband expansion", "digital equity", "internet access"] },
      { id: "energy-utilities", name: "Energy & Utilities", socialKeywords: ["power outage", "electric bill", "utility costs", "solar", "Duke Energy", "electricity expensive", "can't afford utilities", "power keeps going out", "utility bill too high", "grid failure", "blackout"], searchQuery: toSearchQuery("Energy Utilities", ["power outage", "electric bill", "utility costs"]), threeElevenSignals: ["power outage", "utility complaints"], billLanguage: ["energy assistance", "utility regulation", "renewable energy"] },
      { id: "sidewalks", name: "Sidewalks & Pedestrian Infra", socialKeywords: ["sidewalk broken", "wheelchair access", "ADA", "walkability", "no sidewalk", "bike path", "sidewalk repair", "cracked sidewalk", "can't use wheelchair", "pedestrian infrastructure", "need sidewalks"], searchQuery: toSearchQuery("Sidewalks Pedestrian", ["sidewalk broken", "ADA", "walkability"]), threeElevenSignals: ["sidewalk repair", "ADA complaint"], billLanguage: ["pedestrian infrastructure", "ADA compliance", "sidewalk improvement"] },
    ],
  },
  {
    id: "environment",
    name: "Environment & Climate",
    icon: "◉",
    color: CATEGORY_COLORS["Environment & Climate"] ?? "#3D8B6E",
    sortOrder: 6,
    subcategories: [
      { id: "air-quality", name: "Air Quality", socialKeywords: ["air pollution", "smog", "emissions", "asthma", "can't breathe", "industrial pollution", "air quality bad", "wildfire smoke", "pollution alert", "toxic fumes", "air quality index"], searchQuery: toSearchQuery("Air Quality", ["air pollution", "smog", "emissions"]), threeElevenSignals: ["air quality complaints", "odor"], billLanguage: ["air quality standard", "emissions reduction"] },
      { id: "water-quality-env", name: "Water Quality", socialKeywords: ["contaminated water", "PFAS", "runoff", "drinking water", "polluted", "forever chemicals", "water pollution", "clean water", "water testing", "toxic water", "chemical spill"], searchQuery: toSearchQuery("Water Quality", ["PFAS", "contaminated water", "drinking water"]), threeElevenSignals: ["water contamination reports"], billLanguage: ["water quality monitoring", "PFAS regulation", "clean water"] },
      { id: "waste-recycling", name: "Waste & Recycling", socialKeywords: ["landfill", "recycling", "trash", "composting", "illegal dump", "trash everywhere", "garbage collection", "trash pickup", "littering", "dumping", "waste management", "garbage service"], searchQuery: toSearchQuery("Waste Recycling", ["recycling", "trash", "garbage collection"]), threeElevenSignals: ["trash", "recycling", "illegal dumping"], billLanguage: ["solid waste management", "recycling program"] },
      { id: "climate-resilience", name: "Climate Resilience", socialKeywords: ["flooding", "hurricane", "extreme heat", "climate change", "resilience", "heat dome", "storm damage", "climate crisis", "sea level rise", "extreme weather", "flash flood", "heat wave"], searchQuery: toSearchQuery("Climate Resilience", ["flooding", "climate change", "extreme heat"]), threeElevenSignals: ["flood reports", "storm damage"], billLanguage: ["climate adaptation", "flood mitigation", "resilience planning"] },
      { id: "green-space-parks", name: "Green Space & Parks", socialKeywords: ["parks", "green space", "urban tree", "community garden", "trail", "greenway", "park maintenance", "need more parks", "playground", "nature", "walking trails", "park access"], searchQuery: toSearchQuery("Green Space Parks", ["parks", "green space", "greenway"]), threeElevenSignals: ["park maintenance", "tree removal"], billLanguage: ["parks funding", "urban forestry", "greenway"] },
      { id: "environmental-justice", name: "Environmental Justice", socialKeywords: ["environmental racism", "toxic", "polluter", "fence-line community", "cancer alley", "sacrifice zone", "environmental inequality", "pollution in our neighborhood", "industrial zone", "health impacts", "environmental hazards"], searchQuery: toSearchQuery("Environmental Justice", ["environmental racism", "pollution", "toxic"]), threeElevenSignals: [], billLanguage: ["environmental justice", "cumulative impact", "disproportionate burden"] },
    ],
  },
  {
    id: "democracy",
    name: "Democracy & Governance",
    icon: "⬢",
    color: CATEGORY_COLORS["Democracy & Governance"] ?? "#B06080",
    sortOrder: 7,
    subcategories: [
      { id: "voting-rights", name: "Voting Rights", socialKeywords: ["voter suppression", "voter ID", "registration", "polling place", "ballot", "early voting", "mail-in ballot", "voting access", "long lines to vote", "right to vote", "voter registration", "absentee ballot"], searchQuery: toSearchQuery("Voting Rights", ["voter suppression", "voter ID", "early voting"]), threeElevenSignals: [], billLanguage: ["voting rights", "election access", "voter registration"] },
      { id: "redistricting", name: "Redistricting", socialKeywords: ["gerrymandering", "district lines", "redistricting", "map", "rigged districts", "census", "representation", "fair maps", "district boundaries", "partisan gerrymandering", "voting districts", "map manipulation"], searchQuery: toSearchQuery("Redistricting", ["gerrymandering", "redistricting", "district lines"]), threeElevenSignals: [], billLanguage: ["redistricting commission", "electoral district", "census"] },
      { id: "government-transparency", name: "Government Transparency", socialKeywords: ["transparency", "open records", "FOIA", "accountability", "corrupt", "backroom deal", "public records", "government secrecy", "corruption", "behind closed doors", "open government"], searchQuery: toSearchQuery("Government Transparency", ["FOIA", "transparency", "accountability"]), threeElevenSignals: ["FOIA requests"], billLanguage: ["public records", "government transparency", "open meetings"] },
      { id: "campaign-finance", name: "Campaign Finance", socialKeywords: ["dark money", "PAC", "donors", "campaign spending", "corporate money", "lobbyist", "special interest", "money in politics", "campaign contributions", "super PAC", "political donations", "bought and paid for"], searchQuery: toSearchQuery("Campaign Finance", ["dark money", "PAC", "campaign spending"]), threeElevenSignals: [], billLanguage: ["campaign finance", "disclosure requirement", "contribution limit"] },
      { id: "civil-rights", name: "Civil Rights", socialKeywords: ["discrimination", "equality", "civil rights", "DEI", "affirmative action", "racism", "LGBTQ rights", "equal rights", "systemic racism", "racial justice", "gender equality", "human rights"], searchQuery: toSearchQuery("Civil Rights", ["discrimination", "civil rights", "LGBTQ rights"]), threeElevenSignals: [], billLanguage: ["civil rights protection", "anti-discrimination", "equal protection"] },
    ],
  },
  {
    id: "economy",
    name: "Economic Development",
    icon: "◆",
    color: CATEGORY_COLORS["Economic Development"] ?? "#C07A3E",
    sortOrder: 8,
    subcategories: [
      { id: "cost-of-living", name: "Cost of Living", socialKeywords: ["cost of living", "prices", "inflation", "groceries", "everything expensive", "can't afford to live here", "gas prices", "prices are insane", "afford anything", "living paycheck to paycheck", "shrinkflation", "economic stress"], searchQuery: toSearchQuery("Cost of Living", ["inflation", "cost of living", "groceries"]), threeElevenSignals: [], billLanguage: ["consumer protection", "price gouging", "cost-of-living adjustment"] },
      { id: "small-business", name: "Small Business", socialKeywords: ["small business", "starting a business", "regulations", "permits", "shop local", "business closing", "Main Street", "local business", "small business struggling", "support local", "entrepreneur", "business owner"], searchQuery: toSearchQuery("Small Business", ["small business", "permits", "shop local"]), threeElevenSignals: ["business license complaints"], billLanguage: ["small business assistance", "licensing reform", "economic development"] },
      { id: "tax-policy", name: "Tax Policy", socialKeywords: ["property tax", "taxes too high", "tax break", "corporate tax", "tax hike", "assessment", "property value", "can't afford property tax", "tax burden", "unfair taxes", "property assessment", "tax relief"], searchQuery: toSearchQuery("Tax Policy", ["property tax", "taxes too high", "tax relief"]), threeElevenSignals: ["tax assessment complaints"], billLanguage: ["tax reform", "property tax relief", "tax credit"] },
      { id: "minimum-wage-labor", name: "Minimum Wage & Labor", socialKeywords: ["minimum wage", "living wage", "can't survive on", "wage theft", "$7.25", "workers rights", "union", "not enough to live on", "labor rights", "fair pay", "organize", "working poor"], searchQuery: toSearchQuery("Minimum Wage", ["minimum wage", "living wage", "wage theft"]), threeElevenSignals: ["wage theft complaints"], billLanguage: ["minimum wage increase", "wage theft prevention", "labor standard"] },
      { id: "rural-development", name: "Rural & Regional Development", socialKeywords: ["rural", "small town", "nothing here", "no jobs", "left behind", "dying town", "brain drain", "rural economy", "small town struggling", "rural poverty", "economic decline", "forgotten communities"], searchQuery: toSearchQuery("Rural Development", ["rural", "small town", "no jobs"]), threeElevenSignals: [], billLanguage: ["rural development", "economic opportunity", "broadband rural"] },
    ],
  },
  {
    id: "online-behavior",
    name: "Online Behavior",
    icon: "🌐",
    color: CATEGORY_COLORS["Online Behavior"] ?? "#5B8DEF",
    sortOrder: 9,
    subcategories: [
      {
        id: "child-safety-youth-usage",
        name: "Child Safety & Youth Usage",
        socialKeywords: ["kids online", "children social media", "screen time kids", "COPPA", "age verification", "child predators online", "kids on TikTok", "parental controls", "youth mental health social media", "Kids Online Safety Act", "KOSA", "minors online", "child exploitation", "grooming online", "underage accounts", "digital age of consent", "kid influencers", "protect kids online", "children data privacy", "teen social media ban", "kids iPad", "child phone addiction", "Surgeon General social media"],
        searchQuery: toSearchQuery("Child Safety Youth Usage", ["kids online", "children social media", "COPPA", "KOSA"]),
        threeElevenSignals: [],
        billLanguage: ["age verification requirement", "child online protection", "minor data collection", "parental consent mechanism", "youth digital wellness", "child safety by design", "duty of care minor", "age-appropriate design code", "child impact assessment"],
      },
      {
        id: "content-moderation-censorship",
        name: "Content Moderation & Censorship",
        socialKeywords: ["content moderation", "banned account", "shadowban", "deplatformed", "free speech online", "Section 230", "hate speech policy", "misinformation removal", "fact check", "appeal suspended", "community guidelines", "trust and safety", "content policy", "takedown", "overmoderation", "undermoderation", "censorship big tech", "got banned for", "removed my post", "platform bias", "viewpoint discrimination", "content review", "appeals process", "community notes"],
        searchQuery: toSearchQuery("Content Moderation Censorship", ["content moderation", "shadowban", "Section 230", "deplatformed"]),
        threeElevenSignals: [],
        billLanguage: ["platform liability", "content removal obligation", "transparency reporting", "editorial discretion", "lawful but awful", "intermediary liability", "safe harbor provision", "good faith moderation", "notice and takedown"],
      },
      {
        id: "algorithmic-influence-recommendation-systems",
        name: "Algorithmic Influence & Recommendation Systems",
        socialKeywords: ["algorithm bias", "recommended content", "filter bubble", "echo chamber", "radicalization pipeline", "rabbit hole", "algorithmic accountability", "dopamine loop", "engagement farming", "rage bait", "algorithm transparency", "black box algorithm", "recommendation engine", "FYP manipulation", "why is this on my feed", "algorithm pushed", "autoplay", "suggested content", "trending manipulation", "amplification", "algorithmic curation", "personalization creepy"],
        searchQuery: toSearchQuery("Algorithmic Influence", ["algorithm bias", "filter bubble", "echo chamber", "recommendation engine"]),
        threeElevenSignals: [],
        billLanguage: ["algorithmic accountability", "recommendation transparency", "algorithm audit", "automated decision system", "algorithmic impact assessment", "user agency", "chronological feed option", "algorithmic amplification"],
      },
      {
        id: "online-harassment-abuse",
        name: "Online Harassment & Abuse",
        socialKeywords: ["cyberbullying", "doxxing", "swatting", "online harassment", "hate raid", "trolling", "brigading", "death threats online", "revenge porn", "nonconsensual intimate images", "pile on", "targeted harassment", "block evasion", "report abuse", "toxic community", "online stalking", "mass reporting", "coordinated harassment", "sextortion", "image-based abuse", "NCII", "cyber abuse", "restraining order online"],
        searchQuery: toSearchQuery("Online Harassment Abuse", ["cyberbullying", "doxxing", "online harassment", "hate raid"]),
        threeElevenSignals: [],
        billLanguage: ["cyber harassment statute", "nonconsensual pornography", "digital abuse protection", "online stalking", "cyberstalking", "intimate image removal", "platform duty to act", "cyber civil rights"],
      },
      {
        id: "digital-addiction-screen-time",
        name: "Digital Addiction & Screen Time",
        socialKeywords: ["phone addiction", "doomscrolling", "screen time", "digital detox", "infinite scroll", "notification overload", "dopamine hit", "social media break", "time well spent", "dark patterns", "addictive design", "digital wellness", "brain rot", "chronically online", "touch grass", "screen time report", "always on my phone", "can't stop scrolling", "attention span", "digital minimalism", "phone free", "no phone challenge"],
        searchQuery: toSearchQuery("Digital Addiction Screen Time", ["phone addiction", "doomscrolling", "screen time", "dark patterns"]),
        threeElevenSignals: [],
        billLanguage: ["addictive design feature", "dark pattern prohibition", "digital wellness", "compulsive usage", "attention manipulation", "deceptive design", "manipulative interface", "screen time disclosure"],
      },
      {
        id: "misinformation-manipulation",
        name: "Misinformation & Manipulation",
        socialKeywords: ["deepfake", "disinformation", "fake news", "bot accounts", "astroturfing", "propaganda", "election misinformation", "AI generated content", "synthetic media", "coordinated inauthentic behavior", "troll farm", "media literacy", "fact check", "information warfare", "cheap fakes", "AI fake", "is this real", "manipulated media", "foreign interference", "state-sponsored", "influence operation", "prebunking", "labeled misleading"],
        searchQuery: toSearchQuery("Misinformation Manipulation", ["deepfake", "disinformation", "fake news", "bot accounts"]),
        threeElevenSignals: [],
        billLanguage: ["deepfake disclosure", "synthetic media labeling", "election integrity", "foreign influence operation", "bot disclosure requirement", "AI-generated content labeling", "computational propaganda", "platform transparency report"],
      },
      {
        id: "digital-identity-anonymity",
        name: "Digital Identity & Anonymity",
        socialKeywords: ["anonymous accounts", "real name policy", "burner account", "catfishing", "identity verification", "pseudonymous", "right to anonymity", "digital identity", "sock puppet", "impersonation", "verified accounts", "blue check", "bot detection", "fake profile", "anon account", "throwaway account", "digital ID", "online identity", "KYC social media", "identity fraud online"],
        searchQuery: toSearchQuery("Digital Identity Anonymity", ["anonymous accounts", "identity verification", "catfishing", "impersonation"]),
        threeElevenSignals: [],
        billLanguage: ["digital identity verification", "anonymous speech protection", "identity authentication", "bot labeling", "pseudonymous right", "online impersonation", "digital credential", "identity proofing"],
      },
      {
        id: "platform-governance-accountability",
        name: "Platform Governance & Accountability",
        socialKeywords: ["big tech regulation", "tech antitrust", "platform accountability", "tech hearing", "congressional testimony tech", "digital markets act", "DSA", "platform monopoly", "tech lobbying", "self-regulation tech", "oversight board", "transparency report", "terms of service change", "break up big tech", "tech regulation", "FTC tech", "EU digital", "platform power", "tech oligopoly", "app store rules", "interoperability"],
        searchQuery: toSearchQuery("Platform Governance Accountability", ["big tech regulation", "tech antitrust", "platform accountability", "DSA"]),
        threeElevenSignals: [],
        billLanguage: ["platform accountability act", "digital market regulation", "tech antitrust", "transparency mandate", "interoperability requirement", "platform competition", "digital services regulation", "algorithmic audit requirement", "platform governance framework"],
      },
      {
        id: "online-radicalization-extremism",
        name: "Online Radicalization & Extremism",
        socialKeywords: ["online radicalization", "extremist content", "alt-pipeline", "red pill", "incel forums", "domestic terrorism online", "recruitment online", "extremist recruitment", "deradicalization", "hate groups online", "stochastic terrorism", "lone wolf", "manifesto posted", "radicalized online", "pipeline to extremism", "forum radicalization", "went down the rabbit hole", "echo chamber extremism"],
        searchQuery: toSearchQuery("Online Radicalization Extremism", ["online radicalization", "extremist content", "domestic terrorism online", "deradicalization"]),
        threeElevenSignals: [],
        billLanguage: ["domestic terrorism prevention", "online radicalization", "extremist content removal", "terrorist content regulation", "deradicalization program", "online recruitment prevention", "platform referral program"],
      },
      {
        id: "digital-accessibility-inclusion",
        name: "Digital Accessibility & Inclusion",
        socialKeywords: ["digital divide", "internet access", "web accessibility", "ADA compliance web", "alt text", "assistive technology", "broadband equity", "digital literacy", "inclusive design", "screen reader", "WCAG", "caption requirements", "no internet", "can't afford wifi", "rural broadband", "digital equity", "accessibility standards", "tech for disabled", "low income internet", "affordable connectivity"],
        searchQuery: toSearchQuery("Digital Accessibility Inclusion", ["digital divide", "internet access", "web accessibility", "broadband equity"]),
        threeElevenSignals: ["broadband service complaint", "internet service complaint", "ADA complaint"],
        billLanguage: ["digital equity act", "broadband deployment", "web accessibility standard", "universal service", "affordable connectivity program", "digital inclusion", "assistive technology funding", "accessible design mandate"],
      },
    ],
  },
]

export function getSubcategoryById(id: string): Subcategory | undefined {
  for (const cat of TAXONOMY) {
    const sub = cat.subcategories.find((s) => s.id === id)
    if (sub) return sub
  }
  return undefined
}

export function searchTaxonomy(query: string): { category: TaxonomyCategory; subcategory: Subcategory }[] {
  const q = query.toLowerCase().trim()
  if (!q) return []
  const results: { category: TaxonomyCategory; subcategory: Subcategory }[] = []
  for (const cat of TAXONOMY) {
    for (const sub of cat.subcategories) {
      if (sub.name.toLowerCase().includes(q) || sub.socialKeywords.some((k) => k.toLowerCase().includes(q))) {
        results.push({ category: cat, subcategory: sub })
      }
    }
  }
  return results
}

/**
 * Generate query variants for multi-query parallel search.
 * Increases post volume by running multiple related searches simultaneously.
 * 
 * Strategy:
 * 1. Base query (subcategory name)
 * 2. Top keywords from socialKeywords (distributed across queries)
 * 3. Keyword combinations (2-3 keywords per query for specificity)
 * 
 * @param subcategoryId - The subcategory to generate variants for
 * @param maxVariants - Maximum number of query variants (default: 4)
 * @returns Array of query strings to run in parallel
 */
export function getQueryVariants(subcategoryId: string, maxVariants: number = 4): string[] {
  const subcategory = getSubcategoryById(subcategoryId)
  if (!subcategory) return []
  
  const variants: string[] = []
  const keywords = subcategory.socialKeywords
  
  // Variant 1: Base query (subcategory name + top 2 keywords)
  const baseKeywords = keywords.slice(0, 2)
  variants.push([subcategory.name, ...baseKeywords].join(" "))
  
  if (maxVariants === 1) return variants
  
  // Variant 2: Top 3-5 colloquial keywords (more conversational)
  if (keywords.length >= 3) {
    const colloquialKeywords = keywords.slice(2, 5)
    variants.push(colloquialKeywords.join(" "))
  }
  
  if (maxVariants === 2) return variants
  
  // Variant 3: Alternative keyword combo (keywords 5-8 for diversity)
  if (keywords.length >= 6) {
    const altKeywords = keywords.slice(5, 8)
    variants.push(altKeywords.join(" "))
  }
  
  if (maxVariants === 3) return variants
  
  // Variant 4: Problem-focused keywords (last keywords, often more specific)
  if (keywords.length >= 9) {
    const problemKeywords = keywords.slice(-3)
    variants.push(problemKeywords.join(" "))
  }
  
  // Remove duplicates and empty strings
  return Array.from(new Set(variants.filter(v => v.trim().length > 0)))
}

/**
 * Get query variants with geographic context.
 * Appends location info to queries for geo-specific searches.
 * 
 * @param subcategoryId - The subcategory to generate variants for
 * @param state - Optional state name (e.g., "North Carolina")
 * @param city - Optional city name (e.g., "Charlotte")
 * @param maxVariants - Maximum number of query variants
 * @returns Array of query strings with geographic context
 */
/**
 * Get individual social keywords as separate query strings for sequential search.
 * Each keyword is a single clean term that works across all social APIs
 * (TikTok, Truth Social, YouTube, Bluesky) without Boolean syntax issues.
 * Geo context is applied per-platform downstream in geoQueryBuilder.
 *
 * @param subcategoryId - The subcategory to get keywords for
 * @param maxVariants - Max number of keywords to return (default: 4)
 */
export function getKeywordVariants(
  subcategoryId: string,
  maxVariants = 4
): string[] {
  const sub = getSubcategoryById(subcategoryId)
  if (!sub) return []
  return sub.socialKeywords.slice(0, maxVariants)
}

export function getGeoQueryVariants(
  subcategoryId: string,
  state?: string,
  city?: string,
  maxVariants: number = 4
): string[] {
  const baseVariants = getQueryVariants(subcategoryId, maxVariants)
  
  // No geo context? Return base variants
  if (!state && !city) return baseVariants
  
  // Add geo suffix to each variant
  const geoSuffix = city ? city : state
  return baseVariants.map(query => `${query} ${geoSuffix}`)
}
