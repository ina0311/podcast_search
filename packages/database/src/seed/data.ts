/**
 * シード用サンプルデータ
 */

export const podcasts = [
  {
    title: 'Tech Talk Daily',
    rssUrl: 'https://example.com/tech-talk-daily/rss',
    author: 'John Smith',
    language: 'en',
    imageUrl: 'https://example.com/images/tech-talk-daily.jpg'
  },
  {
    title: 'プログラミング入門ラジオ',
    rssUrl: 'https://example.com/programming-radio/rss',
    author: '山田太郎',
    language: 'ja',
    imageUrl: 'https://example.com/images/programming-radio.jpg'
  },
  {
    title: 'AI Future Cast',
    rssUrl: 'https://example.com/ai-future/rss',
    author: 'Sarah Johnson',
    language: 'en',
    imageUrl: 'https://example.com/images/ai-future.jpg'
  },
  {
    title: 'DevOps Weekly',
    rssUrl: 'https://example.com/devops-weekly/rss',
    author: 'Mike Chen',
    language: 'en',
    imageUrl: 'https://example.com/images/devops-weekly.jpg'
  },
  {
    title: 'スタートアップ経営塾',
    rssUrl: 'https://example.com/startup-keiei/rss',
    author: '佐藤花子',
    language: 'ja',
    imageUrl: 'https://example.com/images/startup-keiei.jpg'
  },
  {
    title: 'Data Science Digest',
    rssUrl: 'https://example.com/data-science-digest/rss',
    author: 'Emily Davis',
    language: 'en',
    imageUrl: 'https://example.com/images/data-science-digest.jpg'
  },
  {
    title: 'クラウドアーキテクチャ最前線',
    rssUrl: 'https://example.com/cloud-arch/rss',
    author: '田中一郎',
    language: 'ja',
    imageUrl: 'https://example.com/images/cloud-arch.jpg'
  },
  {
    title: 'Security Now',
    rssUrl: 'https://example.com/security-now/rss',
    author: 'Alex Thompson',
    language: 'en',
    imageUrl: 'https://example.com/images/security-now.jpg'
  },
  {
    title: 'モバイル開発最新情報',
    rssUrl: 'https://example.com/mobile-dev/rss',
    author: '鈴木次郎',
    language: 'ja',
    imageUrl: 'https://example.com/images/mobile-dev.jpg'
  },
  {
    title: 'Open Source Stories',
    rssUrl: 'https://example.com/oss-stories/rss',
    author: 'Lisa Wang',
    language: 'en',
    imageUrl: 'https://example.com/images/oss-stories.jpg'
  }
] as const

export const episodes = [
  // Tech Talk Daily のエピソード
  {
    podcastIndex: 0,
    title: 'Introduction to TypeScript',
    enclosureUrl: 'https://example.com/tech-talk-daily/ep1.mp3',
    status: 'PUBLISHED' as const,
    publishedAt: new Date('2025-01-01T10:00:00Z'),
    durationSec: 1800,
    description: 'Learn the basics of TypeScript and why you should use it.',
    source: 'rss'
  },
  {
    podcastIndex: 0,
    title: 'React Best Practices',
    enclosureUrl: 'https://example.com/tech-talk-daily/ep2.mp3',
    status: 'PUBLISHED' as const,
    publishedAt: new Date('2025-01-08T10:00:00Z'),
    durationSec: 2400,
    description: 'Discover the best practices for building React applications.',
    source: 'rss'
  },
  // プログラミング入門ラジオ のエピソード
  {
    podcastIndex: 1,
    title: 'JavaScriptの基礎',
    enclosureUrl: 'https://example.com/programming-radio/ep1.mp3',
    status: 'PUBLISHED' as const,
    publishedAt: new Date('2025-02-01T09:00:00Z'),
    durationSec: 2100,
    description: 'JavaScriptの基本文法を学びます。',
    source: 'rss'
  },
  {
    podcastIndex: 1,
    title: '非同期処理を理解する',
    enclosureUrl: 'https://example.com/programming-radio/ep2.mp3',
    status: 'PUBLISHED' as const,
    publishedAt: new Date('2025-02-08T09:00:00Z'),
    durationSec: 2700,
    description: 'Promise、async/awaitについて詳しく解説します。',
    source: 'rss'
  },
  // AI Future Cast のエピソード
  {
    podcastIndex: 2,
    title: 'ChatGPT and the Future of Work',
    enclosureUrl: 'https://example.com/ai-future/ep1.mp3',
    status: 'PUBLISHED' as const,
    publishedAt: new Date('2025-03-01T14:00:00Z'),
    durationSec: 3600,
    description: 'How AI is transforming the workplace.',
    source: 'rss'
  }
]

export const transcripts = [
  // Introduction to TypeScript のトランスクリプト
  {
    episodeIndex: 0,
    segments: [
      {
        text: 'Welcome to Tech Talk Daily.',
        startMs: 0,
        endMs: 2000,
        speakerLabel: 'Host',
        confidence: 0.95
      },
      {
        text: 'Today we are talking about TypeScript.',
        startMs: 2000,
        endMs: 5000,
        speakerLabel: 'Host',
        confidence: 0.92
      },
      {
        text: 'TypeScript is a superset of JavaScript.',
        startMs: 5000,
        endMs: 8000,
        speakerLabel: 'Host',
        confidence: 0.98
      },
      {
        text: 'It adds static typing to the language.',
        startMs: 8000,
        endMs: 11000,
        speakerLabel: 'Host',
        confidence: 0.94
      }
    ]
  },
  // JavaScriptの基礎 のトランスクリプト
  {
    episodeIndex: 2,
    segments: [
      {
        text: 'プログラミング入門ラジオへようこそ。',
        startMs: 0,
        endMs: 3000,
        speakerLabel: 'ホスト',
        confidence: 0.96
      },
      {
        text: '今日はJavaScriptの基礎を学びます。',
        startMs: 3000,
        endMs: 6000,
        speakerLabel: 'ホスト',
        confidence: 0.93
      },
      {
        text: '変数の宣言にはletとconstを使います。',
        startMs: 6000,
        endMs: 10000,
        speakerLabel: 'ホスト',
        confidence: 0.97
      }
    ]
  }
]
