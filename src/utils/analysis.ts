import { pipeline } from '@xenova/transformers'
import type { Comment, Cluster } from '@/types/analysis'

// Initialize the models
let embeddingModel: any = null
let sentimentModel: any = null

async function getEmbeddingModel() {
  if (!embeddingModel) {
    embeddingModel = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
  }
  return embeddingModel
}

async function getSentimentModel() {
  if (!sentimentModel) {
    sentimentModel = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english')
  }
  return sentimentModel
}

export async function getCommentEmbedding(text: string): Promise<number[]> {
  const model = await getEmbeddingModel()
  const result = await model(text, { pooling: 'mean', normalize: true })
  return Array.from(result.data)
}

export async function analyzeSentiment(text: string): Promise<number> {
  const model = await getSentimentModel()
  const result = await model(text)
  // Convert sentiment to a number between -1 and 1
  return result[0].label === 'POSITIVE' ? result[0].score : -result[0].score
}

export async function clusterComments(comments: Comment[]): Promise<Cluster[]> {
  // Get embeddings for all comments
  const embeddings = await Promise.all(
    comments.map(comment => getCommentEmbedding(comment.text))
  )

  // Dynamic cluster count: prefer 3-5 clusters if enough comments
  let numClusters = 2
  if (comments.length >= 15) {
    numClusters = Math.min(5, Math.max(3, Math.floor(comments.length / 10)))
  } else {
    numClusters = Math.min(3, Math.max(2, Math.floor(comments.length / 7)))
  }
  // Clamp to at least 2, at most 5
  numClusters = Math.max(2, Math.min(numClusters, 5))

  const clusters = kMeansClustering(embeddings, numClusters)

  // Create cluster objects with sentiment analysis
  const clusterResults: Cluster[] = await Promise.all(
    clusters.map(async (cluster, index) => {
      const clusterComments = cluster.map(i => comments[i])
      const clusterEmbeddings = cluster.map(i => embeddings[i])
      const sentiments = await Promise.all(
        clusterComments.map(comment => analyzeSentiment(comment.text))
      )
      const avgSentiment = sentiments.reduce((a, b) => a + b, 0) / sentiments.length

      // Get theme info
      const themeInfo = await generateClusterTheme(clusterComments, clusterEmbeddings)

      return {
        id: `cluster-${index}`,
        theme: themeInfo.keyPhrase,
        headline: themeInfo.headline,
        comments: clusterComments,
        sentiment: avgSentiment,
        size: cluster.length
      }
    })
  )

  return clusterResults
}

function kMeansClustering(embeddings: number[][], k: number): number[][] {
  // Initialize centroids randomly
  const centroids = embeddings.slice(0, k)
  const clusters: number[][] = Array(k).fill(null).map(() => [])
  let oldClusters: number[][] = []

  // Iterate until convergence
  while (!areClustersEqual(clusters, oldClusters)) {
    oldClusters = JSON.parse(JSON.stringify(clusters))
    clusters.forEach(c => c.length = 0)

    // Assign points to nearest centroid
    embeddings.forEach((embedding, i) => {
      const nearestCentroid = centroids.reduce((nearest, centroid, j) => {
        const distance = cosineDistance(embedding, centroid)
        return distance < nearest.distance ? { index: j, distance } : nearest
      }, { index: 0, distance: Infinity }).index
      clusters[nearestCentroid].push(i)
    })

    // Update centroids
    centroids.forEach((_, i) => {
      if (clusters[i].length > 0) {
        const newCentroid = clusters[i].reduce(
          (sum, j) => sum.map((val, k) => val + embeddings[j][k]),
          Array(embeddings[0].length).fill(0)
        ).map(val => val / clusters[i].length)
        centroids[i] = newCentroid
      }
    })
  }

  return clusters
}

function cosineDistance(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
  return 1 - dotProduct / (normA * normB)
}

function areClustersEqual(a: number[][], b: number[][]): boolean {
  if (a.length !== b.length) return false
  return a.every((cluster, i) => 
    cluster.length === b[i].length &&
    cluster.every((val, j) => val === b[i][j])
  )
}

export async function generateClusterTheme(comments: Comment[], embeddings?: number[][]): Promise<{ keyPhrase: string, headline: string }> {
  // --- Key Phrase: Most frequent bigram/trigram ---
  const stopwords = new Set([
    'the','and','for','are','but','not','with','you','that','this','have','from','they','your','was','what','when','will','just','about','would','there','their','could','should','them','then','than','some','more','like','into','only','over','such','very','much','even','know','been','can','who','out','get','has','all','too','got','our','had','did','why','how','his','her','him','she','himself','herself','my','mine','we','us','were','where','which','because','on','in','at','to','of','is','it','as','by','an','be','or','if','so','do','no','yes','up','down','off','a','i','me','he','see','say','said','also','am','im','u','rt','its','dont','does','doesnt','cant','wont','youre','youve','youll','ill','im','ive','didnt','wasnt','arent','isnt','aint','lets','lets','youre','youve','the','a','an','in','on','at','to','of','is','it','as','by','be','or','if','so','do','no','yes','up','down','off','out','get','has','all','too','got','our','had','did','why','how','his','her','him','she','himself','herself','my','mine','we','us','were','where','which','because','see','say','said','also','am','im','u','rt','its','dont','does','doesnt','cant','wont','youre','youve','youll','ill','im','ive','didnt','wasnt','arent','isnt','aint','lets','lets','youre','youve'
  ])
  const ngrams: Record<string, number> = {}
  comments.forEach(c => {
    const words = c.text.toLowerCase().split(/\W+/).filter(w => w && !stopwords.has(w) && w.length > 2)
    for (let n = 2; n <= 3; n++) {
      for (let i = 0; i <= words.length - n; i++) {
        const gram = words.slice(i, i + n).join(' ')
        ngrams[gram] = (ngrams[gram] || 0) + 1
      }
    }
  })
  const keyPhrase = Object.entries(ngrams).sort((a, b) => b[1] - a[1])[0]?.[0] || ''

  // --- Headline: Most central comment (closest to centroid) ---
  let headline = ''
  if (embeddings && embeddings.length > 0) {
    // Compute centroid
    const centroid = embeddings[0].map((_, i) => embeddings.reduce((sum, emb) => sum + emb[i], 0) / embeddings.length)
    // Find comment closest to centroid
    let minDist = Infinity
    let minIdx = 0
    embeddings.forEach((emb, i) => {
      const dist = emb.reduce((sum, val, j) => sum + Math.pow(val - centroid[j], 2), 0)
      if (dist < minDist) {
        minDist = dist
        minIdx = i
      }
    })
    headline = comments[minIdx]?.text || ''
  }

  return { keyPhrase, headline }
}

export async function analyzeBias(comments: Comment[]): Promise<{
  political: number
  emotional: number
  moral: number
}> {
  // Simple bias analysis based on keyword matching
  const politicalKeywords = ['government', 'policy', 'democrat', 'republican', 'liberal', 'conservative']
  const emotionalKeywords = ['love', 'hate', 'angry', 'happy', 'sad', 'excited']
  const moralKeywords = ['right', 'wrong', 'good', 'bad', 'moral', 'immoral']

  const text = comments.map(c => c.text.toLowerCase()).join(' ')
  
  const politicalScore = politicalKeywords.reduce((score, word) => 
    score + (text.includes(word) ? 1 : 0), 0) / politicalKeywords.length
  
  const emotionalScore = emotionalKeywords.reduce((score, word) => 
    score + (text.includes(word) ? 1 : 0), 0) / emotionalKeywords.length
  
  const moralScore = moralKeywords.reduce((score, word) => 
    score + (text.includes(word) ? 1 : 0), 0) / moralKeywords.length

  return {
    political: politicalScore,
    emotional: emotionalScore,
    moral: moralScore
  }
} 