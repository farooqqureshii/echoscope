import { NextResponse } from 'next/server'
import { getVideoDetails, getVideoComments, calculateDiversityScore } from '@/utils/youtube'
import { clusterComments, analyzeBias } from '@/utils/analysis'
import type { AnalysisResults } from '@/types/analysis'

export async function POST(request: Request) {
  try {
    const { url, maxResults = 100 } = await request.json()
    
    // Extract video ID from URL
    const videoId = extractVideoId(url)
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      )
    }

    // Get video details and comments
    const [videoDetails, comments] = await Promise.all([
      getVideoDetails(videoId),
      getVideoComments(videoId, maxResults)
    ])

    // Perform analysis
    const [clusters, biasMetrics] = await Promise.all([
      clusterComments(comments),
      analyzeBias(comments)
    ])

    // Calculate diversity score
    const diversityScore = calculateDiversityScore(clusters)

    // Generate summary
    const summary = generateSummary(clusters, biasMetrics, diversityScore)

    const results: AnalysisResults = {
      videoId,
      title: videoDetails.snippet.title,
      channelTitle: videoDetails.snippet.channelTitle,
      clusters,
      diversityScore,
      biasMetrics,
      summary
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze video' },
      { status: 500 }
    )
  }
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

function generateSummary(
  clusters: any[],
  biasMetrics: { political: number; emotional: number; moral: number },
  diversityScore: number
): string {
  const clusterCount = clusters.length
  const totalComments = clusters.reduce((sum, cluster) => sum + cluster.size, 0)
  
  let summary = `This video has ${totalComments} comments organized into ${clusterCount} distinct viewpoints. `
  
  if (diversityScore > 0.7) {
    summary += 'The comment section shows high diversity of opinions. '
  } else if (diversityScore > 0.4) {
    summary += 'The comment section shows moderate diversity of opinions. '
  } else {
    summary += 'The comment section shows low diversity of opinions, suggesting an echo chamber effect. '
  }

  if (biasMetrics.political > 0.5) {
    summary += 'The discussion is politically charged. '
  }
  if (biasMetrics.emotional > 0.5) {
    summary += 'The comments show strong emotional engagement. '
  }
  if (biasMetrics.moral > 0.5) {
    summary += 'The discussion includes significant moral framing. '
  }

  return summary
} 