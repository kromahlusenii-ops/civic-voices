/**
 * Smart Topic Recommendations
 * Pre-populate topic selections based on user's use case to reduce overwhelm
 */

// Map use cases to recommended topic IDs
export const TOPIC_RECOMMENDATIONS: Record<string, string[]> = {
  // Government Communications - focus on public messaging topics
  'govt-comms': [
    'government-transparency',
    'voting-rights',
    'election-integrity',
    'campaign-finance',
    'misinformation-manipulation',
    'online-radicalization',
    'public-transit',
    'infrastructure-maintenance',
  ],

  // City Official - operational and policy focus
  'city-official': [
    'affordable-housing',
    'homelessness',
    'zoning-land-use',
    'public-transit',
    'infrastructure-maintenance',
    'policing-reform',
    'traffic-pedestrian-safety',
    'parks-recreation',
    'waste-recycling',
    'utilities-services',
  ],

  // Elected Official / Staff - comprehensive civic issues
  'elected-official': [
    'affordable-housing',
    'healthcare-access',
    'k-12-education',
    'policing-reform',
    'voting-rights',
    'government-transparency',
    'climate-change',
    'public-transit',
    'small-business',
    'campaign-finance',
  ],

  // Tech Policy Professional - digital governance
  'tech-policy': [
    'data-privacy',
    'algorithmic-influence',
    'digital-identity-anonymity',
    'misinformation-manipulation',
    'child-safety-youth-usage',
    'platform-governance',
    'cybersecurity',
    'broadband-digital-access',
  ],

  // Political Content Creator - trending civic topics
  'political-creator': [
    'election-integrity',
    'voting-rights',
    'misinformation-manipulation',
    'online-radicalization',
    'campaign-finance',
    'policing-reform',
    'gun-violence',
    'immigration-enforcement',
  ],

  // Journalist / Reporter - breaking news topics
  'journalist': [
    'policing-reform',
    'gun-violence',
    'homelessness',
    'affordable-housing',
    'healthcare-access',
    'climate-change',
    'election-integrity',
    'government-transparency',
    'criminal-justice-reform',
    'environmental-justice',
  ],

  // Nonprofit / Civic Organization - advocacy focus
  'nonprofit': [
    'affordable-housing',
    'homelessness',
    'healthcare-access',
    'childcare',
    'food-security',
    'policing-reform',
    'criminal-justice-reform',
    'voting-rights',
    'environmental-justice',
    'immigrant-rights',
  ],

  // Brand Marketer / Agency - consumer sentiment
  'brand-marketer': [
    'misinformation-manipulation',
    'digital-identity-anonymity',
    'algorithmic-influence',
    'consumer-protection',
    'data-privacy',
    'online-radicalization',
    'child-safety-youth-usage',
  ],

  // Researcher / Academic - comprehensive analysis
  'researcher': [
    'k-12-education',
    'higher-education',
    'healthcare-access',
    'climate-change',
    'environmental-justice',
    'voting-rights',
    'policing-reform',
    'criminal-justice-reform',
    'housing-affordability',
    'public-transit',
    'misinformation-manipulation',
    'workforce-labor',
  ],

  // Community Organizer / Activist - grassroots issues
  'organizer': [
    'affordable-housing',
    'homelessness',
    'policing-reform',
    'environmental-justice',
    'voting-rights',
    'immigrant-rights',
    'criminal-justice-reform',
    'community-development',
    'parks-recreation',
  ],

  // Real Estate / Development - housing and zoning
  'real-estate': [
    'affordable-housing',
    'zoning-land-use',
    'gentrification',
    'homelessness',
    'public-housing',
    'infrastructure-maintenance',
    'public-transit',
    'parks-recreation',
  ],

  // Just Exploring - balanced mix
  'exploring': [
    'affordable-housing',
    'healthcare-access',
    'climate-change',
    'k-12-education',
    'policing-reform',
    'voting-rights',
    'public-transit',
  ],

  // Legacy roles (backward compatibility)
  civic: [
    'affordable-housing',
    'homelessness',
    'zoning-land-use',
    'healthcare-access',
    'mental-health',
    'childcare',
    'policing-reform',
    'criminal-justice-reform',
    'gun-violence',
    'voting-rights',
    'election-integrity',
    'government-transparency',
  ],
  brand: [
    'misinformation-manipulation',
    'digital-identity-anonymity',
    'algorithmic-influence',
    'consumer-protection',
    'data-privacy',
    'workforce-labor',
    'small-business',
  ],
  policy: [
    'k-12-education',
    'higher-education',
    'workforce-labor',
    'climate-change',
    'environmental-justice',
    'voting-rights',
    'campaign-finance',
    'government-transparency',
    'public-transit',
    'infrastructure-maintenance',
  ],
  general: [
    'affordable-housing',
    'healthcare-access',
    'climate-change',
    'k-12-education',
    'policing-reform',
    'misinformation-manipulation',
    'voting-rights',
    'public-transit',
  ],
}

/**
 * Get recommended topics for a use case
 * @param useCase - User's selected use case
 * @returns Array of recommended topic IDs
 */
export function getRecommendedTopics(useCase?: string | null): string[] {
  if (!useCase || !(useCase in TOPIC_RECOMMENDATIONS)) {
    return TOPIC_RECOMMENDATIONS.general
  }
  
  return TOPIC_RECOMMENDATIONS[useCase]
}

/**
 * Get display name for use case
 */
export function getUseCaseDisplayName(useCase?: string | null): string {
  const names: Record<string, string> = {
    'govt-comms': 'Government Communications',
    'city-official': 'City Official',
    'elected-official': 'Elected Official / Staff',
    'tech-policy': 'Tech Policy Professional',
    'political-creator': 'Political Content Creator',
    'journalist': 'Journalist / Reporter',
    'nonprofit': 'Nonprofit / Civic Organization',
    'brand-marketer': 'Brand Marketer / Agency',
    'researcher': 'Researcher / Academic',
    'organizer': 'Community Organizer / Activist',
    'real-estate': 'Real Estate / Development',
    'exploring': 'Just Exploring',
    // Legacy
    civic: 'Policy Research & Advocacy',
    brand: 'Brand & Marketing',
    policy: 'Academic/Policy Research',
    general: 'General Interest',
  }
  
  return names[useCase || 'exploring'] || 'Just Exploring'
}
