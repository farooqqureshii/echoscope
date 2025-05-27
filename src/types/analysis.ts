export interface Comment {
  id: string
  text: string
  author: string
  likeCount: number
  publishedAt: string
}

export interface Cluster {
  id: string
  theme: string
  headline: string
  comments: Comment[]
  sentiment: number
  size: number
}

export interface AnalysisResults {
  videoId: string
  title: string
  channelTitle: string
  clusters: Cluster[]
  diversityScore: number
  biasMetrics: {
    political: number
    emotional: number
    moral: number
  }
  summary: string
} 