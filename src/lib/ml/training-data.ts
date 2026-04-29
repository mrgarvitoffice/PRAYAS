/**
 * @fileoverview Prayas News Terminal - ML Training Seed Dataset
 * 
 * This dataset bootstraps the recommendation engine for new users (cold-start problem).
 * It contains 60 labeled news articles across 6 categories with simulated credibility
 * labels and baseline preference weights.
 * 
 * Data sources: Inspired by real UPSC-relevant Indian news categories.
 * Used for: Content-Based Filtering baseline + Few-shot credibility classification.
 */

export type TrainingArticle = {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  credibilityLabel: 'CREDIBLE' | 'UNVERIFIED' | 'MISLEADING';
  credibilityScore: number; // 0.97 | 0.75 | 0.61
  baselineRating: number;   // 1-5, average expected rating for UPSC audience
};

export const TRAINING_DATASET: TrainingArticle[] = [
  // ── POLITICS ──────────────────────────────────────────────────────────────
  {
    id: 'td-001',
    title: 'Parliament passes new Digital Personal Data Protection Bill 2023',
    category: 'politics',
    keywords: ['parliament', 'digital', 'data', 'protection', 'bill', 'legislation'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-002',
    title: 'Union Cabinet approves National Education Policy implementation roadmap',
    category: 'politics',
    keywords: ['cabinet', 'education', 'policy', 'implementation', 'government'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-003',
    title: 'India signs landmark Free Trade Agreement with UAE',
    category: 'politics',
    keywords: ['india', 'trade', 'agreement', 'uae', 'bilateral', 'export'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-004',
    title: 'Opposition boycotts winter session of Parliament over alleged irregularities',
    category: 'politics',
    keywords: ['opposition', 'parliament', 'boycott', 'session', 'protest'],
    credibilityLabel: 'UNVERIFIED',
    credibilityScore: 0.75,
    baselineRating: 3,
  },
  {
    id: 'td-005',
    title: 'SHOCKING: Government secretly planning to sell PSUs to foreign companies',
    category: 'politics',
    keywords: ['government', 'psu', 'foreign', 'secret', 'sell', 'conspiracy'],
    credibilityLabel: 'MISLEADING',
    credibilityScore: 0.61,
    baselineRating: 1,
  },
  {
    id: 'td-006',
    title: 'Election Commission announces schedule for 5-state assembly elections',
    category: 'politics',
    keywords: ['election', 'commission', 'assembly', 'schedule', 'voting', 'states'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-007',
    title: 'PM Modi meets G20 leaders to discuss global economic challenges',
    category: 'politics',
    keywords: ['modi', 'g20', 'global', 'economic', 'summit', 'diplomacy'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-008',
    title: 'Viral claim: India to become permanent UN Security Council member next month',
    category: 'politics',
    keywords: ['india', 'united', 'nations', 'security', 'council', 'permanent'],
    credibilityLabel: 'MISLEADING',
    credibilityScore: 0.61,
    baselineRating: 1,
  },

  // ── ECONOMY & BUSINESS ────────────────────────────────────────────────────
  {
    id: 'td-009',
    title: 'India GDP grows 7.2% in Q3, beats IMF projections',
    category: 'business',
    keywords: ['gdp', 'growth', 'economy', 'imf', 'quarter', 'india'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-010',
    title: 'RBI raises repo rate by 25 basis points to control inflation',
    category: 'business',
    keywords: ['rbi', 'repo', 'rate', 'inflation', 'monetary', 'policy'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-011',
    title: 'Sensex crosses 75,000 for the first time amid foreign investment surge',
    category: 'business',
    keywords: ['sensex', 'stock', 'market', 'investment', 'foreign', 'record'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 4,
  },
  {
    id: 'td-012',
    title: 'Government launches PM Vishwakarma Yojana for artisans and craftsmen',
    category: 'business',
    keywords: ['vishwakarma', 'scheme', 'artisans', 'craftsmen', 'government', 'yojana'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-013',
    title: 'India becomes world third largest startup ecosystem with 100+ unicorns',
    category: 'business',
    keywords: ['startup', 'unicorn', 'ecosystem', 'india', 'innovation', 'investment'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 4,
  },
  {
    id: 'td-014',
    title: 'CLAIM: New GST law will destroy small businesses overnight',
    category: 'business',
    keywords: ['gst', 'small', 'business', 'destroy', 'tax', 'claim'],
    credibilityLabel: 'MISLEADING',
    credibilityScore: 0.61,
    baselineRating: 1,
  },
  {
    id: 'td-015',
    title: 'Adani Group announces $10 billion green energy investment plan',
    category: 'business',
    keywords: ['adani', 'green', 'energy', 'investment', 'renewable', 'billion'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 3,
  },
  {
    id: 'td-016',
    title: 'Fuel prices may rise, sources say — government yet to confirm',
    category: 'business',
    keywords: ['fuel', 'petrol', 'diesel', 'price', 'rise', 'sources'],
    credibilityLabel: 'UNVERIFIED',
    credibilityScore: 0.75,
    baselineRating: 3,
  },

  // ── TECHNOLOGY ────────────────────────────────────────────────────────────
  {
    id: 'td-017',
    title: 'ISRO successfully launches INSAT-3DS weather satellite from Sriharikota',
    category: 'technology',
    keywords: ['isro', 'satellite', 'launch', 'weather', 'space', 'sriharikota'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-018',
    title: 'India launches AI Mission with ₹10,000 crore allocation for next 5 years',
    category: 'technology',
    keywords: ['artificial', 'intelligence', 'mission', 'crore', 'allocation', 'india'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-019',
    title: 'Chandrayaan-3 data reveals new insights about Moon south pole composition',
    category: 'technology',
    keywords: ['chandrayaan', 'moon', 'isro', 'data', 'south', 'pole', 'composition'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-020',
    title: '5G rollout reaches 700 cities across India ahead of schedule',
    category: 'technology',
    keywords: ['5g', 'rollout', 'cities', 'network', 'telecom', 'india'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 4,
  },
  {
    id: 'td-021',
    title: 'UPI crosses 10 billion transactions in a single month milestone',
    category: 'technology',
    keywords: ['upi', 'transactions', 'billion', 'digital', 'payment', 'milestone'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-022',
    title: 'WARNING: New WhatsApp hack can drain your bank account — share immediately',
    category: 'technology',
    keywords: ['whatsapp', 'hack', 'bank', 'scam', 'warning', 'share'],
    credibilityLabel: 'MISLEADING',
    credibilityScore: 0.61,
    baselineRating: 1,
  },
  {
    id: 'td-023',
    title: 'Government to launch Digital Rupee pilot across 15 more cities',
    category: 'technology',
    keywords: ['digital', 'rupee', 'cbdc', 'pilot', 'cities', 'rbi'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 4,
  },
  {
    id: 'td-024',
    title: 'Sources claim Apple to manufacture 25% of iPhones in India by 2025',
    category: 'technology',
    keywords: ['apple', 'iphone', 'manufacture', 'india', 'sources', 'production'],
    credibilityLabel: 'UNVERIFIED',
    credibilityScore: 0.75,
    baselineRating: 3,
  },

  // ── ENVIRONMENT ───────────────────────────────────────────────────────────
  {
    id: 'td-025',
    title: 'India commits to net-zero emissions by 2070 at COP28',
    category: 'environment',
    keywords: ['india', 'net', 'zero', 'emissions', 'climate', 'cop28', 'commitment'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-026',
    title: 'Project Tiger: India tiger population reaches 3,167, highest ever',
    category: 'environment',
    keywords: ['tiger', 'project', 'population', 'wildlife', 'conservation', 'india'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-027',
    title: 'Ganga rejuvenation: River water quality improves in 10 major cities',
    category: 'environment',
    keywords: ['ganga', 'river', 'water', 'quality', 'clean', 'namami'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-028',
    title: 'India installs record 15 GW solar capacity in single financial year',
    category: 'environment',
    keywords: ['solar', 'capacity', 'renewable', 'energy', 'record', 'india'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 4,
  },
  {
    id: 'td-029',
    title: 'CLAIM: Plastic ban has completely failed — oceans filling up faster than ever',
    category: 'environment',
    keywords: ['plastic', 'ban', 'ocean', 'pollution', 'claim', 'failed'],
    credibilityLabel: 'MISLEADING',
    credibilityScore: 0.61,
    baselineRating: 1,
  },
  {
    id: 'td-030',
    title: 'Monsoon may arrive 10 days early this year, IMD indicates',
    category: 'environment',
    keywords: ['monsoon', 'early', 'imd', 'rainfall', 'weather', 'forecast'],
    credibilityLabel: 'UNVERIFIED',
    credibilityScore: 0.75,
    baselineRating: 3,
  },
  {
    id: 'td-031',
    title: 'International Solar Alliance grows to 110 member countries under India leadership',
    category: 'environment',
    keywords: ['solar', 'alliance', 'international', 'india', 'member', 'leadership'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-032',
    title: 'Delhi AQI crosses 400 severe level for seventh consecutive day',
    category: 'environment',
    keywords: ['delhi', 'aqi', 'pollution', 'air', 'severe', 'smog'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 4,
  },

  // ── INTERNATIONAL ─────────────────────────────────────────────────────────
  {
    id: 'td-033',
    title: 'India elected to UN Human Rights Council for two-year term',
    category: 'world',
    keywords: ['india', 'united', 'nations', 'human', 'rights', 'council', 'elected'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-034',
    title: 'SCO summit: India hosts foreign ministers for regional connectivity talks',
    category: 'world',
    keywords: ['sco', 'summit', 'india', 'regional', 'connectivity', 'diplomacy'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-035',
    title: 'India-China border talks yield agreement on buffer zones in eastern Ladakh',
    category: 'world',
    keywords: ['india', 'china', 'border', 'ladakh', 'buffer', 'agreement'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-036',
    title: 'India sends humanitarian aid worth $1 million to Gaza conflict zone',
    category: 'world',
    keywords: ['india', 'humanitarian', 'aid', 'gaza', 'conflict', 'relief'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 4,
  },
  {
    id: 'td-037',
    title: 'BREAKING: War between India and Pakistan imminent, sources claim',
    category: 'world',
    keywords: ['india', 'pakistan', 'war', 'imminent', 'claim', 'breaking'],
    credibilityLabel: 'MISLEADING',
    credibilityScore: 0.61,
    baselineRating: 1,
  },
  {
    id: 'td-038',
    title: 'Global chip shortage may impact Indian electronics sector, analysts say',
    category: 'world',
    keywords: ['chip', 'shortage', 'electronics', 'global', 'india', 'impact'],
    credibilityLabel: 'UNVERIFIED',
    credibilityScore: 0.75,
    baselineRating: 3,
  },
  {
    id: 'td-039',
    title: 'India Quad partnership with US, Japan, Australia strengthens regional security',
    category: 'world',
    keywords: ['quad', 'india', 'usa', 'japan', 'australia', 'security', 'partnership'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-040',
    title: 'Indian diaspora contributes $125 billion in remittances, tops global chart',
    category: 'world',
    keywords: ['diaspora', 'remittances', 'india', 'billion', 'global', 'nri'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 4,
  },

  // ── SOCIAL ────────────────────────────────────────────────────────────────
  {
    id: 'td-041',
    title: 'National Health Mission expands Ayushman Bharat to cover 10 crore more families',
    category: 'health',
    keywords: ['ayushman', 'bharat', 'health', 'insurance', 'families', 'scheme'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-042',
    title: 'India polio-free for 13 consecutive years, WHO confirms',
    category: 'health',
    keywords: ['polio', 'india', 'free', 'who', 'vaccination', 'health'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-043',
    title: 'New IIT Campuses inaugurated in Jammu, Dharwad and Palakkad',
    category: 'education',
    keywords: ['iit', 'campus', 'education', 'jammu', 'inauguration', 'engineering'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-044',
    title: 'UPSC 2024 notification released: 1105 vacancies for civil services',
    category: 'education',
    keywords: ['upsc', 'civil', 'services', 'vacancies', 'notification', 'exam'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-045',
    title: 'WARNING: Drinking tap water causes cancer — viral post from unknown source',
    category: 'health',
    keywords: ['water', 'cancer', 'viral', 'claim', 'tap', 'fake'],
    credibilityLabel: 'MISLEADING',
    credibilityScore: 0.61,
    baselineRating: 1,
  },
  {
    id: 'td-046',
    title: 'India maternal mortality rate drops to 97 per lakh — best ever recorded',
    category: 'health',
    keywords: ['maternal', 'mortality', 'india', 'health', 'rate', 'improvement'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-047',
    title: 'Jal Jeevan Mission: 14 crore rural households get piped water connection',
    category: 'social',
    keywords: ['jal', 'jeevan', 'mission', 'water', 'rural', 'household', 'pipe'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-048',
    title: 'Unconfirmed report says new caste census data to be released next quarter',
    category: 'social',
    keywords: ['caste', 'census', 'data', 'unconfirmed', 'report', 'survey'],
    credibilityLabel: 'UNVERIFIED',
    credibilityScore: 0.75,
    baselineRating: 2,
  },

  // ── DEFENSE ───────────────────────────────────────────────────────────────
  {
    id: 'td-049',
    title: 'India successfully tests Agni-5 missile with MIRV capability',
    category: 'defense',
    keywords: ['agni', 'missile', 'drdo', 'mirv', 'defense', 'test', 'nuclear'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-050',
    title: 'Indian Navy commissions INS Vikrant, country first indigenous aircraft carrier',
    category: 'defense',
    keywords: ['navy', 'vikrant', 'aircraft', 'carrier', 'indigenous', 'commission'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-051',
    title: 'India defence exports cross $21,000 crore, highest ever in history',
    category: 'defense',
    keywords: ['defence', 'export', 'crore', 'record', 'india', 'arms'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-052',
    title: 'CLAIM: Indian Army lost 200 soldiers in secret operation — government hiding truth',
    category: 'defense',
    keywords: ['army', 'soldiers', 'secret', 'operation', 'government', 'hiding'],
    credibilityLabel: 'MISLEADING',
    credibilityScore: 0.61,
    baselineRating: 1,
  },
  {
    id: 'td-053',
    title: 'Tejas Mk2 fighter jet to begin maiden test flight by end of 2024',
    category: 'defense',
    keywords: ['tejas', 'fighter', 'jet', 'hal', 'test', 'flight', 'drdo'],
    credibilityLabel: 'UNVERIFIED',
    credibilityScore: 0.75,
    baselineRating: 4,
  },
  {
    id: 'td-054',
    title: 'Exercise Tasman Saber: India and Australia conduct joint naval drills',
    category: 'defense',
    keywords: ['india', 'australia', 'naval', 'exercise', 'joint', 'drill'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 4,
  },

  // ── SPORTS ────────────────────────────────────────────────────────────────
  {
    id: 'td-055',
    title: 'Neeraj Chopra wins gold at World Athletics Championship with 88.17m throw',
    category: 'sports',
    keywords: ['neeraj', 'chopra', 'javelin', 'gold', 'world', 'athletics', 'championship'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 4,
  },
  {
    id: 'td-056',
    title: 'India wins Cricket World Cup 2024 defeating South Africa in final',
    category: 'sports',
    keywords: ['india', 'cricket', 'world', 'cup', 'win', 'final', 'south africa'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 4,
  },
  {
    id: 'td-057',
    title: 'VIRAL: Star Indian cricketer to retire after secret injury, leaked documents show',
    category: 'sports',
    keywords: ['cricketer', 'retire', 'secret', 'injury', 'leaked', 'viral'],
    credibilityLabel: 'MISLEADING',
    credibilityScore: 0.61,
    baselineRating: 1,
  },
  {
    id: 'td-058',
    title: 'India to host 2036 Summer Olympics, bid submitted to IOC',
    category: 'sports',
    keywords: ['india', 'olympics', '2036', 'host', 'bid', 'ioc', 'summer'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 5,
  },
  {
    id: 'td-059',
    title: 'PV Sindhu eyes gold at Paris Olympics 2024 after intense training camp',
    category: 'sports',
    keywords: ['sindhu', 'badminton', 'paris', 'olympics', 'gold', 'training'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 3,
  },
  {
    id: 'td-060',
    title: 'India chess team wins Olympiad gold, Gukesh youngest world champion at 18',
    category: 'sports',
    keywords: ['chess', 'india', 'gukesh', 'olympiad', 'world', 'champion', 'youngest'],
    credibilityLabel: 'CREDIBLE',
    credibilityScore: 0.97,
    baselineRating: 4,
  },
];

/**
 * Gets baseline category weights from the training dataset.
 * Used for cold-start: gives new users sensible defaults based on UPSC relevance.
 */
export function getBaselineCategoryWeights(): Record<string, number> {
  const weights: Record<string, number> = {};
  
  TRAINING_DATASET.forEach(article => {
    if (article.credibilityLabel === 'CREDIBLE') {
      const boost = article.baselineRating - 3; // 5 stars → +2, 4 stars → +1
      weights[article.category] = (weights[article.category] || 0) + boost;
    }
  });

  return weights;
}

/**
 * Returns few-shot examples for the credibility detection prompt.
 * Provides the AI model with labeled examples to improve accuracy.
 */
export function getCredibilityFewShotExamples(): string {
  const examples = TRAINING_DATASET.slice(0, 12);
  return examples.map(e => 
    `Article: "${e.title}"\nResult: {"label": "${e.credibilityLabel}", "score": ${e.credibilityScore}}`
  ).join('\n\n');
}
