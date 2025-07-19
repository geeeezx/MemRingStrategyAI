export interface PresetCard {
  id: string;
  title: string;
  date: string;
  tags: string[];
  query: string;
  images: string[];
  color: string;
}

export interface DynamicCardData {
  title: string;
  tags?: string[];
  query: string;
  images?: string[];
  color?: string;
  timestamp?: Date;
  source?: 'chat' | 'search' | 'preset';
  metadata?: {
    conversationId?: string;
    messageCount?: number;
    relatedTopics?: string[];
  };
}

export const createCardFromChatHistory = (
  title: string,
  query: string,
  options?: Partial<DynamicCardData>
): PresetCard => {
  const timestamp = options?.timestamp || new Date();
  const formattedDate = `Last updated ${timestamp.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })} at ${timestamp.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })}`;

  return {
    id: `dynamic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title,
    date: formattedDate,
    tags: options?.tags || ['Chat', 'Dynamic'],
    query,
    images: options?.images || [
      'https://images.unsplash.com/photo-1516110833967-0b5656ca2673?w=300&h=200&fit=crop',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop'
    ],
    color: options?.color || 'from-indigo-500/20 to-blue-500/20'
  };
};

export const generateTagsFromQuery = (query: string): string[] => {
  const keywords = query.toLowerCase();
  const tags: string[] = [];

  // AI/Technology related
  if (keywords.includes('ai') || keywords.includes('artificial intelligence') || keywords.includes('machine learning')) {
    tags.push('AI');
  }
  if (keywords.includes('technology') || keywords.includes('tech') || keywords.includes('digital')) {
    tags.push('Technology');
  }

  // Science related
  if (keywords.includes('quantum') || keywords.includes('physics') || keywords.includes('science')) {
    tags.push('Science');
  }
  if (keywords.includes('biology') || keywords.includes('evolution') || keywords.includes('genetics')) {
    tags.push('Biology');
  }

  // Philosophy/Wisdom related
  if (keywords.includes('philosophy') || keywords.includes('wisdom') || keywords.includes('ethics')) {
    tags.push('Philosophy');
  }
  if (keywords.includes('consciousness') || keywords.includes('mind') || keywords.includes('awareness')) {
    tags.push('Consciousness');
  }

  // History/Culture related
  if (keywords.includes('history') || keywords.includes('ancient') || keywords.includes('civilization')) {
    tags.push('History');
  }
  if (keywords.includes('culture') || keywords.includes('society') || keywords.includes('human')) {
    tags.push('Culture');
  }

  // Default tags if none found
  if (tags.length === 0) {
    tags.push('General', 'Inquiry');
  }

  return tags.slice(0, 3); // Limit to 3 tags max
}; 