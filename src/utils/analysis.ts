import type { Comment, Cluster } from '@/types/analysis'

const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models'

// Models we'll use
const EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2'
const SENTIMENT_MODEL = 'distilbert-base-uncased-finetuned-sst-2-english'

async function callHuggingFaceAPI(model: string, inputs: string | string[], isEmbedding: boolean = false) {
  try {
    console.log(`Calling ${model} with inputs:`, inputs)
    const response = await fetch(`${HUGGINGFACE_API_URL}/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: isEmbedding ? {
          source_sentence: inputs,
          sentences: [inputs]
        } : inputs,
        options: {
          wait_for_model: true
        }
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`API error for ${model}:`, error)
      throw new Error(`HuggingFace API error: ${error}`)
    }

    const result = await response.json()
    console.log(`Response from ${model}:`, result)
    return result
  } catch (error) {
    console.error(`Error calling ${model}:`, error)
    throw error
  }
}

export async function getCommentEmbedding(text: string): Promise<number[]> {
  try {
    const result = await callHuggingFaceAPI(EMBEDDING_MODEL, text, true)
    
    // Handle different response formats
    if (Array.isArray(result)) {
      // If it's an array, take the first element
      return result[0]
    } else if (result && typeof result === 'object') {
      // If it's an object with similarity scores
      if (result.similarity_scores) {
        return result.similarity_scores
      }
      // If it's an object with embeddings
      if (result.embeddings) {
        return result.embeddings[0]
      }
    }
    
    // If we can't parse the response, return a default embedding
    console.warn('Unexpected embedding response format:', result)
    return new Array(384).fill(0) // Default size for MiniLM model
  } catch (error) {
    console.error('Error getting embedding:', error)
    return new Array(384).fill(0) // Fallback to default embedding
  }
}

export async function analyzeSentiment(text: string): Promise<number> {
  try {
    const result = await callHuggingFaceAPI(SENTIMENT_MODEL, text)
    
    // Handle different response formats
    let sentiment
    if (Array.isArray(result)) {
      sentiment = result[0]
    } else if (result && typeof result === 'object') {
      sentiment = result
    } else {
      console.warn('Unexpected sentiment response format:', result)
      return 0
    }

    // Convert sentiment to a number between -1 and 1
    return sentiment.label === 'POSITIVE' ? sentiment.score : -sentiment.score
  } catch (error) {
    console.error('Error analyzing sentiment:', error)
    return 0 // Fallback to neutral sentiment
  }
}

export async function clusterComments(comments: Comment[]): Promise<Cluster[]> {
  try {
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
  } catch (error) {
    console.error('Error clustering comments:', error)
    // Return a single cluster with all comments if clustering fails
    return [{
      id: 'cluster-0',
      theme: 'General Discussion',
      headline: comments[0]?.text || '',
      comments: comments,
      sentiment: 0,
      size: comments.length
    }]
  }
}

function kMeansClustering(embeddings: number[][], k: number): number[][] {
  try {
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
  } catch (error) {
    console.error('Error in k-means clustering:', error)
    // Return a single cluster with all points if clustering fails
    return [embeddings.map((_, i) => i)]
  }
}

function cosineDistance(a: number[] | any, b: number[] | any): number {
  try {
    // Ensure inputs are arrays
    if (!Array.isArray(a) || !Array.isArray(b)) {
      console.error('Invalid inputs to cosineDistance:', { a, b })
      return 1 // Maximum distance for invalid inputs
    }

    // Ensure arrays have same length
    if (a.length !== b.length) {
      console.error('Arrays must have same length:', { aLength: a.length, bLength: b.length })
      return 1
    }

    // Ensure all elements are numbers
    if (!a.every(x => typeof x === 'number') || !b.every(x => typeof x === 'number')) {
      console.error('Arrays must contain only numbers')
      return 1
    }

    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
    const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
    const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))

    // Handle edge cases
    if (normA === 0 || normB === 0) {
      return 1 // Maximum distance for zero vectors
    }

    return 1 - dotProduct / (normA * normB)
  } catch (error) {
    console.error('Error calculating cosine distance:', error)
    return 1 // Maximum distance as fallback
  }
}

function areClustersEqual(a: number[][], b: number[][]): boolean {
  try {
    if (a.length !== b.length) return false
    return a.every((cluster, i) => 
      cluster.length === b[i].length &&
      cluster.every((val, j) => val === b[i][j])
    )
  } catch (error) {
    console.error('Error comparing clusters:', error)
    return true // Assume equal to stop iteration
  }
}

export async function generateClusterTheme(comments: Comment[], embeddings?: number[][]): Promise<{ keyPhrase: string, headline: string }> {
  try {
    // --- Key Phrase: Most frequent bigram/trigram ---
    const stopwords = new Set([
      'the','and','for','are','but','not','with','you','that','this','have','from','they','your','was','what','when','will','just','about','would','there','their','could','should','them','then','than','some','more','like','into','only','over','such','very','much','even','know','been','can','who','out','get','has','all','too','got','our','had','did','why','how','his','her','him','she','himself','herself','my','mine','we','us','were','where','which','because','on','in','at','to','of','is','it','as','by','an','be','or','if','so','do','no','yes','up','down','off','a','i','me','he','see','say','said','also','am','im','u','rt','its','dont','does','doesnt','cant','wont','youre','youve','youll','ill','im','ive','didnt','wasnt','arent','isnt','aint','lets','lets','youre','youve'
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
  } catch (error) {
    console.error('Error generating cluster theme:', error)
    return { keyPhrase: '', headline: comments[0]?.text || '' }
  }
}

export async function analyzeBias(comments: Comment[]): Promise<{
  political: number
  emotional: number
  moral: number
}> {
  try {
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
  } catch (error) {
    console.error('Error analyzing bias:', error)
    return {
      political: 0,
      emotional: 0,
      moral: 0
    }
  }
}