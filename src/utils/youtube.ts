console.log('All env:', process.env);
const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY
const API_BASE_URL = 'https://www.googleapis.com/youtube/v3'

console.log('Loaded YouTube API KEY:', API_KEY);

export async function getVideoDetails(videoId: string) {
  const response = await fetch(
    `${API_BASE_URL}/videos?part=snippet,statistics&id=${videoId}&key=${API_KEY}`
  )
  
  const data = await response.json()
  if (!response.ok) {
    // Log the actual error from YouTube and the status
    console.error('YouTube API error (video details):', data, 'Status:', response.status)
    throw new Error(data.error?.message || JSON.stringify(data) || 'Failed to fetch video details')
  }

  return data.items[0]
}

export async function getVideoComments(videoId: string, maxResults = 10) {
  const response = await fetch(
    `${API_BASE_URL}/commentThreads?part=snippet&videoId=${videoId}&maxResults=${maxResults}&key=${API_KEY}`
  )

  const data = await response.json()
  if (!response.ok) {
    // Log the actual error from YouTube and the status
    console.error('YouTube API error (comments):', data, 'Status:', response.status)
    throw new Error(data.error?.message || JSON.stringify(data) || 'Failed to fetch comments')
  }

  return data.items.map((item: any) => ({
    id: item.id,
    text: item.snippet.topLevelComment.snippet.textDisplay,
    author: item.snippet.topLevelComment.snippet.authorDisplayName,
    likeCount: item.snippet.topLevelComment.snippet.likeCount,
    publishedAt: item.snippet.topLevelComment.snippet.publishedAt,
  }))
}

export function calculateDiversityScore(clusters: any[]) {
  // Simple diversity score based on number of clusters and their sizes
  const totalComments = clusters.reduce((sum, cluster) => sum + cluster.size, 0)
  const entropy = clusters.reduce((sum, cluster) => {
    const p = cluster.size / totalComments
    return sum - p * Math.log(p)
  }, 0)
  
  return (entropy * clusters.length) / totalComments
} 