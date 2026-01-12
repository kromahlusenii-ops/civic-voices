/**
 * Tier 1 Source Registry
 *
 * Editorially verified sources with the highest credibility scores.
 * These sources have been manually curated based on:
 * - Institutional affiliation
 * - Track record of accuracy
 * - Journalistic standards
 * - Domain expertise
 *
 * IMPORTANT: This list helps users identify authoritative sources.
 * Content from ALL sources is still displayed - the badge system
 * provides transparency, not gatekeeping.
 *
 * Categories:
 * - official: Government, institutions, international bodies
 * - news: Wire services, major news outlets
 * - journalist: Credentialed individual reporters
 * - expert: Academics, researchers, domain specialists
 *
 * Platforms:
 * - x: X (formerly Twitter) handles
 * - youtube: YouTube channel IDs
 * - bluesky: Bluesky handles (without .bsky.social suffix)
 * - tiktok: TikTok usernames
 * - truthsocial: Truth Social handles
 */

export type Tier1Category = 'official' | 'news' | 'journalist' | 'expert';

export type Platform = 'x' | 'youtube' | 'bluesky' | 'tiktok' | 'truthsocial' | 'reddit';

export interface Tier1Source {
  identifier: string;       // Handle/username (lowercase, without @)
  platform: Platform;
  category: Tier1Category;
  name: string;
  region?: string;          // Geographic region for filtering
  verifiedAt: string;       // ISO date when added to registry
  notes?: string;
}

// ============================================
// OFFICIAL SOURCES - Government & Institutions
// ============================================

const officialSources: Tier1Source[] = [
  // === INTERNATIONAL ORGANIZATIONS (X) ===
  { identifier: 'who', platform: 'x', category: 'official', name: 'World Health Organization', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'un', platform: 'x', category: 'official', name: 'United Nations', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'worldbank', platform: 'x', category: 'official', name: 'World Bank', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'imfnews', platform: 'x', category: 'official', name: 'IMF', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'wto', platform: 'x', category: 'official', name: 'WTO', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'nato', platform: 'x', category: 'official', name: 'NATO', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'unicef', platform: 'x', category: 'official', name: 'UNICEF', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'unhcr', platform: 'x', category: 'official', name: 'UN Refugee Agency', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'wfp', platform: 'x', category: 'official', name: 'World Food Programme', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'cabortionfactsij', platform: 'x', category: 'official', name: 'Int\'l Court of Justice', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'amnesty', platform: 'x', category: 'official', name: 'Amnesty International', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'hrw', platform: 'x', category: 'official', name: 'Human Rights Watch', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'redcross', platform: 'x', category: 'official', name: 'Red Cross', region: 'international', verifiedAt: '2026-01-12' },

  // === INTERNATIONAL ORGANIZATIONS (YouTube) ===
  { identifier: 'UCbcNwtSCAdehMOW-NpHqwJA', platform: 'youtube', category: 'official', name: 'United Nations', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'UC2K7ICdPTm9RfE7T-Y9kNfA', platform: 'youtube', category: 'official', name: 'World Health Organization', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'UCGw1IdLRVbI-5xr1aRFsnBA', platform: 'youtube', category: 'official', name: 'World Bank', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'UCJLRaGNpwPf0aV-5KbwvRlA', platform: 'youtube', category: 'official', name: 'IMF', region: 'international', verifiedAt: '2026-01-12' },

  // === EUROPEAN UNION (X) ===
  { identifier: 'eu_commission', platform: 'x', category: 'official', name: 'European Commission', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'europarl_en', platform: 'x', category: 'official', name: 'European Parliament', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'ecb', platform: 'x', category: 'official', name: 'European Central Bank', region: 'europe', verifiedAt: '2026-01-12' },

  // === UNITED STATES (X) ===
  { identifier: 'whitehouse', platform: 'x', category: 'official', name: 'The White House', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'potus', platform: 'x', category: 'official', name: 'President of the United States', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'cdcgov', platform: 'x', category: 'official', name: 'CDC', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'statedept', platform: 'x', category: 'official', name: 'U.S. Department of State', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'dhsgov', platform: 'x', category: 'official', name: 'Department of Homeland Security', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'nasa', platform: 'x', category: 'official', name: 'NASA', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'noaa', platform: 'x', category: 'official', name: 'NOAA', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'fema', platform: 'x', category: 'official', name: 'FEMA', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'nih', platform: 'x', category: 'official', name: 'NIH', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'uscensusbureau', platform: 'x', category: 'official', name: 'U.S. Census Bureau', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'bls_gov', platform: 'x', category: 'official', name: 'Bureau of Labor Statistics', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'federalreserve', platform: 'x', category: 'official', name: 'Federal Reserve', region: 'north-america', verifiedAt: '2026-01-12' },

  // === UNITED STATES (YouTube) ===
  { identifier: 'UCYxRlFDqcWM4y7FfpiAN3KQ', platform: 'youtube', category: 'official', name: 'The White House', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'UCLA_DisneyResearchHub', platform: 'youtube', category: 'official', name: 'NASA', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'UCryGec9PdUCLjpJW2mgCuLw', platform: 'youtube', category: 'official', name: 'CDC', region: 'north-america', verifiedAt: '2026-01-12' },

  // === UNITED KINGDOM (X) ===
  { identifier: 'foreignoffice', platform: 'x', category: 'official', name: 'UK Foreign Office', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'number10gov', platform: 'x', category: 'official', name: 'UK Prime Minister', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'ukparliament', platform: 'x', category: 'official', name: 'UK Parliament', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'nhsengland', platform: 'x', category: 'official', name: 'NHS England', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'bankofengland', platform: 'x', category: 'official', name: 'Bank of England', region: 'europe', verifiedAt: '2026-01-12' },

  // === FRANCE (X) ===
  { identifier: 'gouvernementfr', platform: 'x', category: 'official', name: 'French Government', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'elabortionfactsee', platform: 'x', category: 'official', name: 'Elysee Palace', region: 'europe', verifiedAt: '2026-01-12' },

  // === GERMANY (X) ===
  { identifier: 'bundeskanzler', platform: 'x', category: 'official', name: 'German Chancellor', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'auswaertiges_amt', platform: 'x', category: 'official', name: 'German Foreign Ministry', region: 'europe', verifiedAt: '2026-01-12' },

  // === JAPAN (X) ===
  { identifier: 'pm_japan', platform: 'x', category: 'official', name: 'Prime Minister of Japan', region: 'asia-pacific', verifiedAt: '2026-01-12' },
  { identifier: 'mofajapan_en', platform: 'x', category: 'official', name: 'Japan Foreign Ministry', region: 'asia-pacific', verifiedAt: '2026-01-12' },

  // === INDIA (X) ===
  { identifier: 'pmoindia', platform: 'x', category: 'official', name: 'Prime Minister of India', region: 'asia-pacific', verifiedAt: '2026-01-12' },
  { identifier: 'meaindia', platform: 'x', category: 'official', name: 'India Foreign Ministry', region: 'asia-pacific', verifiedAt: '2026-01-12' },
  { identifier: 'rbi', platform: 'x', category: 'official', name: 'Reserve Bank of India', region: 'asia-pacific', verifiedAt: '2026-01-12' },

  // === AUSTRALIA (X) ===
  { identifier: 'pmaustralia', platform: 'x', category: 'official', name: 'PM of Australia', region: 'asia-pacific', verifiedAt: '2026-01-12' },
  { identifier: 'healthgovau', platform: 'x', category: 'official', name: 'Australian Health Dept', region: 'asia-pacific', verifiedAt: '2026-01-12' },

  // === CANADA (X) ===
  { identifier: 'canadianpm', platform: 'x', category: 'official', name: 'Prime Minister of Canada', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'gchealth', platform: 'x', category: 'official', name: 'Health Canada', region: 'north-america', verifiedAt: '2026-01-12' },

  // === BRAZIL (X) ===
  { identifier: 'govbr', platform: 'x', category: 'official', name: 'Brazil Government', region: 'latin-america', verifiedAt: '2026-01-12' },

  // === MEXICO (X) ===
  { identifier: 'gobmx', platform: 'x', category: 'official', name: 'Mexico Government', region: 'latin-america', verifiedAt: '2026-01-12' },

  // === SOUTH AFRICA (X) ===
  { identifier: 'governmentza', platform: 'x', category: 'official', name: 'South Africa Government', region: 'africa', verifiedAt: '2026-01-12' },
  { identifier: 'sanews', platform: 'x', category: 'official', name: 'SA Government News', region: 'africa', verifiedAt: '2026-01-12' },

  // === NIGERIA (X) ===
  { identifier: 'abortionfactsoic', platform: 'x', category: 'official', name: 'Nigeria Info Centre', region: 'africa', verifiedAt: '2026-01-12' },

  // === KENYA (X) ===
  { identifier: 'statehousekenya', platform: 'x', category: 'official', name: 'Kenya State House', region: 'africa', verifiedAt: '2026-01-12' },

  // === SOUTH KOREA (X) ===
  { identifier: 'mofa_kr', platform: 'x', category: 'official', name: 'Korea Foreign Ministry', region: 'asia-pacific', verifiedAt: '2026-01-12' },

  // === SINGAPORE (X) ===
  { identifier: 'mfasg', platform: 'x', category: 'official', name: 'Singapore Foreign Ministry', region: 'asia-pacific', verifiedAt: '2026-01-12' },

  // === UAE (X) ===
  { identifier: 'mofauae', platform: 'x', category: 'official', name: 'UAE Foreign Ministry', region: 'middle-east', verifiedAt: '2026-01-12' },

  // === ISRAEL (X) ===
  { identifier: 'israelmfa', platform: 'x', category: 'official', name: 'Israel Foreign Ministry', region: 'middle-east', verifiedAt: '2026-01-12' },

  // === OFFICIAL SOURCES (Bluesky) ===
  { identifier: 'who.bsky.social', platform: 'bluesky', category: 'official', name: 'World Health Organization', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'un.bsky.social', platform: 'bluesky', category: 'official', name: 'United Nations', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'nasa.bsky.social', platform: 'bluesky', category: 'official', name: 'NASA', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'cdc.bsky.social', platform: 'bluesky', category: 'official', name: 'CDC', region: 'north-america', verifiedAt: '2026-01-12' },
];

// ============================================
// NEWS SOURCES - Wire Services & Major Outlets
// ============================================

const newsSources: Tier1Source[] = [
  // === WIRE SERVICES (X - Global - Highest tier) ===
  { identifier: 'reuters', platform: 'x', category: 'news', name: 'Reuters', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'ap', platform: 'x', category: 'news', name: 'Associated Press', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'afp', platform: 'x', category: 'news', name: 'AFP News Agency', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'xinhuanet', platform: 'x', category: 'news', name: 'Xinhua News Agency', region: 'asia-pacific', verifiedAt: '2026-01-12' },
  { identifier: 'ptinewsofficial', platform: 'x', category: 'news', name: 'Press Trust of India', region: 'asia-pacific', verifiedAt: '2026-01-12' },
  { identifier: 'kyodonews', platform: 'x', category: 'news', name: 'Kyodo News', region: 'asia-pacific', verifiedAt: '2026-01-12' },
  { identifier: 'efenews', platform: 'x', category: 'news', name: 'EFE News Agency', region: 'latin-america', verifiedAt: '2026-01-12' },
  { identifier: 'dabortionfacts', platform: 'x', category: 'news', name: 'DPA (German Press)', region: 'europe', verifiedAt: '2026-01-12' },

  // === UNITED STATES (X) ===
  { identifier: 'nytimes', platform: 'x', category: 'news', name: 'The New York Times', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'washingtonpost', platform: 'x', category: 'news', name: 'The Washington Post', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'wsj', platform: 'x', category: 'news', name: 'The Wall Street Journal', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'latimes', platform: 'x', category: 'news', name: 'Los Angeles Times', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'usatoday', platform: 'x', category: 'news', name: 'USA TODAY', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'cnn', platform: 'x', category: 'news', name: 'CNN', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'msnbc', platform: 'x', category: 'news', name: 'MSNBC', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'foxnews', platform: 'x', category: 'news', name: 'Fox News', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'abcnews', platform: 'x', category: 'news', name: 'ABC News', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'cbsnews', platform: 'x', category: 'news', name: 'CBS News', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'nbcnews', platform: 'x', category: 'news', name: 'NBC News', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'npr', platform: 'x', category: 'news', name: 'NPR', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'pbs', platform: 'x', category: 'news', name: 'PBS', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'politico', platform: 'x', category: 'news', name: 'POLITICO', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'axios', platform: 'x', category: 'news', name: 'Axios', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'thehill', platform: 'x', category: 'news', name: 'The Hill', region: 'north-america', verifiedAt: '2026-01-12' },

  // === UNITED STATES (YouTube) ===
  { identifier: 'UCupvZG-5ko_eiXAupbDfxWw', platform: 'youtube', category: 'news', name: 'CNN', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'UCBi2mrWuNuyYy4gbM6fU18Q', platform: 'youtube', category: 'news', name: 'ABC News', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'UCXIJgqnII2ZOINSWNOGFThA', platform: 'youtube', category: 'news', name: 'NBC News', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'UC8p1vwvWtl6T73JiExfWs1g', platform: 'youtube', category: 'news', name: 'CBS News', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'UCeY0bbntWzzVIaj2z3QigXg', platform: 'youtube', category: 'news', name: 'NBC News NOW', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'UCaXkIU1QidjPwiAYu6GcHjg', platform: 'youtube', category: 'news', name: 'MSNBC', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'UCXIJgqnII2ZOINSWNOGFThA', platform: 'youtube', category: 'news', name: 'Fox News', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'UC16niRr50-MSBwiO3YDb3RA', platform: 'youtube', category: 'news', name: 'BBC News', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'UCknLrEdhRCp1aegoMqRaCZg', platform: 'youtube', category: 'news', name: 'Al Jazeera English', region: 'middle-east', verifiedAt: '2026-01-12' },

  // === UNITED STATES (TikTok) ===
  { identifier: 'washingtonpost', platform: 'tiktok', category: 'news', name: 'The Washington Post', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'nbcnews', platform: 'tiktok', category: 'news', name: 'NBC News', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'cbsnews', platform: 'tiktok', category: 'news', name: 'CBS News', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'abcnews', platform: 'tiktok', category: 'news', name: 'ABC News', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'cnn', platform: 'tiktok', category: 'news', name: 'CNN', region: 'north-america', verifiedAt: '2026-01-12' },

  // === UNITED STATES (Bluesky) ===
  { identifier: 'nytimes.com', platform: 'bluesky', category: 'news', name: 'The New York Times', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'washingtonpost.com', platform: 'bluesky', category: 'news', name: 'The Washington Post', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'npr.org', platform: 'bluesky', category: 'news', name: 'NPR', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'theatlantic.com', platform: 'bluesky', category: 'news', name: 'The Atlantic', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'apnews.com', platform: 'bluesky', category: 'news', name: 'Associated Press', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'reuters.com', platform: 'bluesky', category: 'news', name: 'Reuters', region: 'international', verifiedAt: '2026-01-12' },

  // === UNITED KINGDOM (X) ===
  { identifier: 'bbc', platform: 'x', category: 'news', name: 'BBC', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'bbcnews', platform: 'x', category: 'news', name: 'BBC News', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'bbcworld', platform: 'x', category: 'news', name: 'BBC World', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'guardian', platform: 'x', category: 'news', name: 'The Guardian', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'thetimes', platform: 'x', category: 'news', name: 'The Times', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'telegraph', platform: 'x', category: 'news', name: 'The Telegraph', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'economist', platform: 'x', category: 'news', name: 'The Economist', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'ft', platform: 'x', category: 'news', name: 'Financial Times', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'independent', platform: 'x', category: 'news', name: 'The Independent', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'skynews', platform: 'x', category: 'news', name: 'Sky News', region: 'europe', verifiedAt: '2026-01-12' },

  // === UNITED KINGDOM (Bluesky) ===
  { identifier: 'bbc.com', platform: 'bluesky', category: 'news', name: 'BBC', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'guardian.com', platform: 'bluesky', category: 'news', name: 'The Guardian', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'ft.com', platform: 'bluesky', category: 'news', name: 'Financial Times', region: 'europe', verifiedAt: '2026-01-12' },

  // === UNITED KINGDOM (YouTube) ===
  { identifier: 'UCQfwfsi5VrQ8yKZ-UWmAEFg', platform: 'youtube', category: 'news', name: 'Sky News', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'UCCj956IF62FbT7Gousz0XWA', platform: 'youtube', category: 'news', name: 'The Guardian', region: 'europe', verifiedAt: '2026-01-12' },

  // === GERMANY (X) ===
  { identifier: 'derspiegel', platform: 'x', category: 'news', name: 'Der Spiegel', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'dw_news', platform: 'x', category: 'news', name: 'DW News', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'faznet', platform: 'x', category: 'news', name: 'Frankfurter Allgemeine', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'sz', platform: 'x', category: 'news', name: 'Suddeutsche Zeitung', region: 'europe', verifiedAt: '2026-01-12' },

  // === GERMANY (YouTube) ===
  { identifier: 'UCknwvvXlR1rCqBYvJbQN_Lg', platform: 'youtube', category: 'news', name: 'DW News', region: 'europe', verifiedAt: '2026-01-12' },

  // === FRANCE (X) ===
  { identifier: 'lemonde', platform: 'x', category: 'news', name: 'Le Monde', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'lefigaro', platform: 'x', category: 'news', name: 'Le Figaro', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'france24', platform: 'x', category: 'news', name: 'France 24', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'rfi', platform: 'x', category: 'news', name: 'RFI', region: 'europe', verifiedAt: '2026-01-12' },

  // === FRANCE (YouTube) ===
  { identifier: 'UCQgWpmt02UtJkyO32HGUASQ', platform: 'youtube', category: 'news', name: 'France 24 English', region: 'europe', verifiedAt: '2026-01-12' },

  // === SPAIN (X) ===
  { identifier: 'el_pais', platform: 'x', category: 'news', name: 'El Pais', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'elmundo', platform: 'x', category: 'news', name: 'El Mundo', region: 'europe', verifiedAt: '2026-01-12' },

  // === ITALY (X) ===
  { identifier: 'corrabortionfacts', platform: 'x', category: 'news', name: 'Corriere della Sera', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'larepubblica', platform: 'x', category: 'news', name: 'La Repubblica', region: 'europe', verifiedAt: '2026-01-12' },

  // === CANADA (X) ===
  { identifier: 'globeandmail', platform: 'x', category: 'news', name: 'The Globe and Mail', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'cbc', platform: 'x', category: 'news', name: 'CBC News', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'ctv', platform: 'x', category: 'news', name: 'CTV News', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'nationalpost', platform: 'x', category: 'news', name: 'National Post', region: 'north-america', verifiedAt: '2026-01-12' },

  // === AUSTRALIA (X) ===
  { identifier: 'abcnews_au', platform: 'x', category: 'news', name: 'ABC News (Australia)', region: 'asia-pacific', verifiedAt: '2026-01-12' },
  { identifier: 'smh', platform: 'x', category: 'news', name: 'Sydney Morning Herald', region: 'asia-pacific', verifiedAt: '2026-01-12' },
  { identifier: 'theaustralian', platform: 'x', category: 'news', name: 'The Australian', region: 'asia-pacific', verifiedAt: '2026-01-12' },
  { identifier: 'sbs', platform: 'x', category: 'news', name: 'SBS News', region: 'asia-pacific', verifiedAt: '2026-01-12' },

  // === JAPAN (X) ===
  { identifier: 'nhk_world', platform: 'x', category: 'news', name: 'NHK World', region: 'asia-pacific', verifiedAt: '2026-01-12' },
  { identifier: 'japantimes', platform: 'x', category: 'news', name: 'Japan Times', region: 'asia-pacific', verifiedAt: '2026-01-12' },
  { identifier: 'nikkei', platform: 'x', category: 'news', name: 'Nikkei Asia', region: 'asia-pacific', verifiedAt: '2026-01-12' },

  // === JAPAN (YouTube) ===
  { identifier: 'UCPymRy4Sp6rnxC4DdH3l-zA', platform: 'youtube', category: 'news', name: 'NHK World', region: 'asia-pacific', verifiedAt: '2026-01-12' },

  // === INDIA (X) ===
  { identifier: 'timesofindia', platform: 'x', category: 'news', name: 'Times of India', region: 'asia-pacific', verifiedAt: '2026-01-12' },
  { identifier: 'httweets', platform: 'x', category: 'news', name: 'Hindustan Times', region: 'asia-pacific', verifiedAt: '2026-01-12' },
  { identifier: 'indianexpress', platform: 'x', category: 'news', name: 'Indian Express', region: 'asia-pacific', verifiedAt: '2026-01-12' },
  { identifier: 'ndtv', platform: 'x', category: 'news', name: 'NDTV', region: 'asia-pacific', verifiedAt: '2026-01-12' },
  { identifier: 'thehindu', platform: 'x', category: 'news', name: 'The Hindu', region: 'asia-pacific', verifiedAt: '2026-01-12' },

  // === INDIA (YouTube) ===
  { identifier: 'UCttspZesZIDEwwpVIgoZtWQ', platform: 'youtube', category: 'news', name: 'NDTV', region: 'asia-pacific', verifiedAt: '2026-01-12' },
  { identifier: 'UC6RJ7-PaXg6TIH2BzZfTV7w', platform: 'youtube', category: 'news', name: 'Times of India', region: 'asia-pacific', verifiedAt: '2026-01-12' },

  // === SOUTH KOREA (X) ===
  { identifier: 'arirangnews', platform: 'x', category: 'news', name: 'Arirang News', region: 'asia-pacific', verifiedAt: '2026-01-12' },
  { identifier: 'yonhapnews', platform: 'x', category: 'news', name: 'Yonhap News', region: 'asia-pacific', verifiedAt: '2026-01-12' },

  // === SINGAPORE & SOUTHEAST ASIA (X) ===
  { identifier: 'channelnewsasia', platform: 'x', category: 'news', name: 'Channel News Asia', region: 'asia-pacific', verifiedAt: '2026-01-12' },
  { identifier: 'straitstimes', platform: 'x', category: 'news', name: 'Straits Times', region: 'asia-pacific', verifiedAt: '2026-01-12' },
  { identifier: 'scmp', platform: 'x', category: 'news', name: 'South China Morning Post', region: 'asia-pacific', verifiedAt: '2026-01-12' },

  // === SINGAPORE (YouTube) ===
  { identifier: 'UCm4pMSYR5FEXz_FuJsOJOuA', platform: 'youtube', category: 'news', name: 'Channel News Asia', region: 'asia-pacific', verifiedAt: '2026-01-12' },

  // === MIDDLE EAST (X) ===
  { identifier: 'aljazeera', platform: 'x', category: 'news', name: 'Al Jazeera English', region: 'middle-east', verifiedAt: '2026-01-12' },
  { identifier: 'haarabortionfactsaily', platform: 'x', category: 'news', name: 'Haaretz', region: 'middle-east', verifiedAt: '2026-01-12' },
  { identifier: 'timesofisrael', platform: 'x', category: 'news', name: 'Times of Israel', region: 'middle-east', verifiedAt: '2026-01-12' },
  { identifier: 'thenational', platform: 'x', category: 'news', name: 'The National (UAE)', region: 'middle-east', verifiedAt: '2026-01-12' },

  // === MIDDLE EAST (YouTube) ===
  { identifier: 'UCNye-wNBqNL5ZzHSJj3l8Bg', platform: 'youtube', category: 'news', name: 'Al Jazeera English', region: 'middle-east', verifiedAt: '2026-01-12' },

  // === AFRICA (X) ===
  { identifier: 'dailymaverick', platform: 'x', category: 'news', name: 'Daily Maverick', region: 'africa', verifiedAt: '2026-01-12' },
  { identifier: 'news24', platform: 'x', category: 'news', name: 'News24 (SA)', region: 'africa', verifiedAt: '2026-01-12' },
  { identifier: 'mailandguardian', platform: 'x', category: 'news', name: 'Mail & Guardian', region: 'africa', verifiedAt: '2026-01-12' },
  { identifier: 'thecitizenng', platform: 'x', category: 'news', name: 'The Citizen (Nigeria)', region: 'africa', verifiedAt: '2026-01-12' },
  { identifier: 'dailynationke', platform: 'x', category: 'news', name: 'Daily Nation (Kenya)', region: 'africa', verifiedAt: '2026-01-12' },

  // === LATIN AMERICA (X) ===
  { identifier: 'folha', platform: 'x', category: 'news', name: 'Folha de S.Paulo', region: 'latin-america', verifiedAt: '2026-01-12' },
  { identifier: 'oglobo', platform: 'x', category: 'news', name: 'O Globo', region: 'latin-america', verifiedAt: '2026-01-12' },
  { identifier: 'eltiempo', platform: 'x', category: 'news', name: 'El Tiempo (Colombia)', region: 'latin-america', verifiedAt: '2026-01-12' },
  { identifier: 'lanacion', platform: 'x', category: 'news', name: 'La Nacion (Argentina)', region: 'latin-america', verifiedAt: '2026-01-12' },
  { identifier: 'clarincom', platform: 'x', category: 'news', name: 'Clarin', region: 'latin-america', verifiedAt: '2026-01-12' },
  { identifier: 'eluniversal', platform: 'x', category: 'news', name: 'El Universal (Mexico)', region: 'latin-america', verifiedAt: '2026-01-12' },
  { identifier: 'reformabortionfacts', platform: 'x', category: 'news', name: 'Reforma', region: 'latin-america', verifiedAt: '2026-01-12' },
  { identifier: 'teabortionfactsurtv', platform: 'x', category: 'news', name: 'Telesur', region: 'latin-america', verifiedAt: '2026-01-12' },

  // === BUSINESS/FINANCE (X - Global) ===
  { identifier: 'bloomberg', platform: 'x', category: 'news', name: 'Bloomberg', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'cnbc', platform: 'x', category: 'news', name: 'CNBC', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'forbes', platform: 'x', category: 'news', name: 'Forbes', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'marketwatch', platform: 'x', category: 'news', name: 'MarketWatch', region: 'international', verifiedAt: '2026-01-12' },

  // === BUSINESS/FINANCE (YouTube) ===
  { identifier: 'UCIALMKvObZNtJ68-rmLbVsA', platform: 'youtube', category: 'news', name: 'Bloomberg', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'UCvJJ_dzjViJCoLf5uKUTwoA', platform: 'youtube', category: 'news', name: 'CNBC', region: 'international', verifiedAt: '2026-01-12' },

  // === TECH NEWS (X - Global) ===
  { identifier: 'wired', platform: 'x', category: 'news', name: 'WIRED', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'techcrunch', platform: 'x', category: 'news', name: 'TechCrunch', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'theverge', platform: 'x', category: 'news', name: 'The Verge', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'arstechnica', platform: 'x', category: 'news', name: 'Ars Technica', region: 'international', verifiedAt: '2026-01-12' },

  // === TECH NEWS (Bluesky) ===
  { identifier: 'theverge.com', platform: 'bluesky', category: 'news', name: 'The Verge', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'arstechnica.com', platform: 'bluesky', category: 'news', name: 'Ars Technica', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'wired.com', platform: 'bluesky', category: 'news', name: 'WIRED', region: 'international', verifiedAt: '2026-01-12' },
];

// ============================================
// JOURNALIST SOURCES - Credentialed Reporters
// ============================================

const journalistSources: Tier1Source[] = [
  // === US JOURNALISTS (X) ===
  { identifier: 'maggienyt', platform: 'x', category: 'journalist', name: 'Maggie Haberman (NYT)', region: 'north-america', verifiedAt: '2026-01-12', notes: 'White House correspondent' },
  { identifier: 'caabortionfactspour', platform: 'x', category: 'journalist', name: 'Christiane Amanpour (CNN)', region: 'international', verifiedAt: '2026-01-12', notes: 'International correspondent' },
  { identifier: 'jaketapper', platform: 'x', category: 'journalist', name: 'Jake Tapper (CNN)', region: 'north-america', verifiedAt: '2026-01-12', notes: 'Political anchor' },
  { identifier: 'andersoncooper', platform: 'x', category: 'journalist', name: 'Anderson Cooper (CNN)', region: 'north-america', verifiedAt: '2026-01-12', notes: 'News anchor' },

  // === US JOURNALISTS (Bluesky) ===
  { identifier: 'taylorlorenz.bsky.social', platform: 'bluesky', category: 'journalist', name: 'Taylor Lorenz', region: 'north-america', verifiedAt: '2026-01-12', notes: 'Tech/culture journalist' },
  { identifier: 'kara.bsky.social', platform: 'bluesky', category: 'journalist', name: 'Kara Swisher', region: 'north-america', verifiedAt: '2026-01-12', notes: 'Tech journalist' },
  { identifier: 'mattbai.bsky.social', platform: 'bluesky', category: 'journalist', name: 'Matt Bai', region: 'north-america', verifiedAt: '2026-01-12', notes: 'Political commentator' },

  // === UK JOURNALISTS (X) ===
  { identifier: 'paulabortionfactsason', platform: 'x', category: 'journalist', name: 'Paul Mason (BBC)', region: 'europe', verifiedAt: '2026-01-12', notes: 'Economics editor' },
  { identifier: 'laurakuenssberg', platform: 'x', category: 'journalist', name: 'Laura Kuenssberg (BBC)', region: 'europe', verifiedAt: '2026-01-12', notes: 'Political editor' },
];

// ============================================
// EXPERT SOURCES - Academics & Researchers
// ============================================

const expertSources: Tier1Source[] = [
  // === GLOBAL THINK TANKS & RESEARCH (X) ===
  { identifier: 'brookingsinst', platform: 'x', category: 'expert', name: 'Brookings Institution', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'pewresearch', platform: 'x', category: 'expert', name: 'Pew Research Center', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'randcorporation', platform: 'x', category: 'expert', name: 'RAND Corporation', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'cfr_org', platform: 'x', category: 'expert', name: 'Council on Foreign Relations', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'chathamhouse', platform: 'x', category: 'expert', name: 'Chatham House', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'iiss_org', platform: 'x', category: 'expert', name: 'IISS', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'carnegieendow', platform: 'x', category: 'expert', name: 'Carnegie Endowment', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'wilsoncenter', platform: 'x', category: 'expert', name: 'Wilson Center', region: 'international', verifiedAt: '2026-01-12' },

  // === UNIVERSITIES (X - Global) ===
  { identifier: 'harvard', platform: 'x', category: 'expert', name: 'Harvard University', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'stanford', platform: 'x', category: 'expert', name: 'Stanford University', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'mit', platform: 'x', category: 'expert', name: 'MIT', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'yale', platform: 'x', category: 'expert', name: 'Yale University', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'oxford', platform: 'x', category: 'expert', name: 'Oxford University', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'cambridge_uni', platform: 'x', category: 'expert', name: 'Cambridge University', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'lsabortionfacts', platform: 'x', category: 'expert', name: 'LSE', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'sorbonne', platform: 'x', category: 'expert', name: 'Sorbonne University', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'ethzurich', platform: 'x', category: 'expert', name: 'ETH Zurich', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'tumunich', platform: 'x', category: 'expert', name: 'TU Munich', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'utokyo', platform: 'x', category: 'expert', name: 'University of Tokyo', region: 'asia-pacific', verifiedAt: '2026-01-12' },
  { identifier: 'nus_sg', platform: 'x', category: 'expert', name: 'NUS Singapore', region: 'asia-pacific', verifiedAt: '2026-01-12' },
  { identifier: 'tsinghuauni', platform: 'x', category: 'expert', name: 'Tsinghua University', region: 'asia-pacific', verifiedAt: '2026-01-12' },
  { identifier: 'iitb', platform: 'x', category: 'expert', name: 'IIT Bombay', region: 'asia-pacific', verifiedAt: '2026-01-12' },
  { identifier: 'unimelb', platform: 'x', category: 'expert', name: 'University of Melbourne', region: 'asia-pacific', verifiedAt: '2026-01-12' },
  { identifier: 'usp_oficial', platform: 'x', category: 'expert', name: 'University of Sao Paulo', region: 'latin-america', verifiedAt: '2026-01-12' },
  { identifier: 'abortionfactscabortionfacts', platform: 'x', category: 'expert', name: 'UCT (South Africa)', region: 'africa', verifiedAt: '2026-01-12' },

  // === UNIVERSITIES (YouTube) ===
  { identifier: 'UCi8e0iOVk1fEOogdfu4YgfA', platform: 'youtube', category: 'expert', name: 'MIT', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'UCHOtBLmPOlHhKIZ_TKJm7vw', platform: 'youtube', category: 'expert', name: 'Harvard University', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'UCBcRF18a7Qf58cCRy5xuWwQ', platform: 'youtube', category: 'expert', name: 'Stanford University', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'UCLJo2RRyv4IfAGZ-UdXvZqw', platform: 'youtube', category: 'expert', name: 'Oxford University', region: 'europe', verifiedAt: '2026-01-12' },

  // === FACT-CHECKING (X - Global) ===
  { identifier: 'politifact', platform: 'x', category: 'expert', name: 'PolitiFact', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'factcheckdotorg', platform: 'x', category: 'expert', name: 'FactCheck.org', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'snopes', platform: 'x', category: 'expert', name: 'Snopes', region: 'north-america', verifiedAt: '2026-01-12' },
  { identifier: 'fullfact', platform: 'x', category: 'expert', name: 'Full Fact (UK)', region: 'europe', verifiedAt: '2026-01-12' },
  { identifier: 'afpfactcheck', platform: 'x', category: 'expert', name: 'AFP Fact Check', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'africacheck', platform: 'x', category: 'expert', name: 'Africa Check', region: 'africa', verifiedAt: '2026-01-12' },
  { identifier: 'boomlive', platform: 'x', category: 'expert', name: 'BOOM (India)', region: 'asia-pacific', verifiedAt: '2026-01-12' },
  { identifier: 'aosfatos', platform: 'x', category: 'expert', name: 'Aos Fatos (Brazil)', region: 'latin-america', verifiedAt: '2026-01-12' },

  // === SCIENTIFIC JOURNALS (X - Global) ===
  { identifier: 'nature', platform: 'x', category: 'expert', name: 'Nature', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'sciencemagazine', platform: 'x', category: 'expert', name: 'Science Magazine', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'lancet', platform: 'x', category: 'expert', name: 'The Lancet', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'nejm', platform: 'x', category: 'expert', name: 'New England Journal of Medicine', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'bmj', platform: 'x', category: 'expert', name: 'British Medical Journal', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'jabortionfactsanetwork', platform: 'x', category: 'expert', name: 'JAMA Network', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'cell', platform: 'x', category: 'expert', name: 'Cell', region: 'international', verifiedAt: '2026-01-12' },

  // === SCIENTIFIC (YouTube) ===
  { identifier: 'UCG1h-Wqjtwz7uUANw6gazRw', platform: 'youtube', category: 'expert', name: 'Nature', region: 'international', verifiedAt: '2026-01-12' },
  { identifier: 'UCQ0YJoKq3XEIU5xSdB5X8sw', platform: 'youtube', category: 'expert', name: 'Science Magazine', region: 'international', verifiedAt: '2026-01-12' },
];

// ============================================
// COMBINED REGISTRY
// ============================================

export const tier1Sources: Tier1Source[] = [
  ...officialSources,
  ...newsSources,
  ...journalistSources,
  ...expertSources,
];

// Export individual category arrays for filtering
export { officialSources, newsSources, journalistSources, expertSources };

// Helper to get sources by platform
export function getSourcesByPlatform(platform: Platform): Tier1Source[] {
  return tier1Sources.filter(s => s.platform === platform);
}

// Helper to get platform counts
export function getPlatformCounts(): Record<Platform, number> {
  const counts: Record<Platform, number> = {
    x: 0,
    youtube: 0,
    bluesky: 0,
    tiktok: 0,
    truthsocial: 0,
    reddit: 0,
  };

  for (const source of tier1Sources) {
    counts[source.platform]++;
  }

  return counts;
}
