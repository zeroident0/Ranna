export interface SocialMediaInfo {
  platform: string;
  icon: string;
  color: string;
  url: string;
}

export const SOCIAL_PLATFORMS = {
  instagram: {
    icon: 'logo-instagram',
    color: '#E4405F',
    patterns: ['instagram.com', 'instagr.am']
  },
  facebook: {
    icon: 'logo-facebook',
    color: '#1877F2',
    patterns: ['facebook.com', 'fb.com', 'fb.me']
  },
  linkedin: {
    icon: 'logo-linkedin',
    color: '#0A66C2',
    patterns: ['linkedin.com', 'lnkd.in']
  },
  twitter: {
    icon: 'logo-twitter',
    color: '#1DA1F2',
    patterns: ['twitter.com', 't.co', 'x.com']
  },
  youtube: {
    icon: 'logo-youtube',
    color: '#FF0000',
    patterns: ['youtube.com', 'youtu.be']
  },
  tiktok: {
    icon: 'logo-tiktok',
    color: '#000000',
    patterns: ['tiktok.com']
  },
  github: {
    icon: 'logo-github',
    color: '#333333',
    patterns: ['github.com']
  },
  discord: {
    icon: 'logo-discord',
    color: '#5865F2',
    patterns: ['discord.gg', 'discord.com']
  },
  telegram: {
    icon: 'logo-telegram',
    color: '#0088CC',
    patterns: ['t.me', 'telegram.me']
  },
  whatsapp: {
    icon: 'logo-whatsapp',
    color: '#25D366',
    patterns: ['wa.me', 'whatsapp.com']
  },
  snapchat: {
    icon: 'logo-snapchat',
    color: '#FFFC00',
    patterns: ['snapchat.com']
  },
  pinterest: {
    icon: 'logo-pinterest',
    color: '#BD081C',
    patterns: ['pinterest.com', 'pin.it']
  }
};

export function detectSocialMedia(url: string): SocialMediaInfo | null {
  if (!url || typeof url !== 'string') return null;
  
  // Clean and normalize the URL
  let cleanUrl = url.trim().toLowerCase();
  
  // Add protocol if missing
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = 'https://' + cleanUrl;
  }
  
  try {
    const urlObj = new URL(cleanUrl);
    const hostname = urlObj.hostname.replace('www.', '');
    
    // Check each platform
    for (const [platform, config] of Object.entries(SOCIAL_PLATFORMS)) {
      for (const pattern of config.patterns) {
        if (hostname.includes(pattern)) {
          return {
            platform,
            icon: config.icon,
            color: config.color,
            url: cleanUrl
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    // If URL parsing fails, try simple string matching
    for (const [platform, config] of Object.entries(SOCIAL_PLATFORMS)) {
      for (const pattern of config.patterns) {
        if (cleanUrl.includes(pattern)) {
          return {
            platform,
            icon: config.icon,
            color: config.color,
            url: cleanUrl
          };
        }
      }
    }
    
    return null;
  }
}

export function extractAllSocialMediaLinks(text: string): SocialMediaInfo[] {
  if (!text || typeof text !== 'string') return [];
  
  const links: SocialMediaInfo[] = [];
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s]*)/g;
  const matches = text.match(urlRegex) || [];
  
  for (const match of matches) {
    const socialInfo = detectSocialMedia(match);
    if (socialInfo) {
      links.push(socialInfo);
    }
  }
  
  return links;
}
