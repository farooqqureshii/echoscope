'use client'

import { useState } from 'react'
import { Search, Loader2, TrendingUp, MessageSquare, Users, X, RefreshCw } from 'lucide-react'
import type { AnalysisResults, Cluster } from '@/types/analysis'
import { ClusterVisualization } from './ClusterVisualization'
import { LoadingState } from './LoadingState'
import { BiasCompass } from './BiasCompass'
import { motion, AnimatePresence } from 'framer-motion'

const DEFAULT_BATCH_SIZE = 10
const MAX_COMMENTS = 100

function getToxicityScore(comments: { text: string }[]): number {
  // Simple keyword-based toxicity (placeholder for real model)
  const toxicWords = ['idiot', 'stupid', 'hate', 'dumb', 'moron', 'trash', 'kill', 'shut up', 'racist', 'sexist']
  const text = comments.map(c => c.text.toLowerCase()).join(' ')
  let score = 0
  toxicWords.forEach(word => {
    if (text.includes(word)) score++
  })
  return Math.min(1, score / Math.max(1, comments.length))
}

const tooltips = {
  diversityScore: "Measures the variety of viewpoints and perspectives in the comments. Higher scores indicate more diverse discussions.",
  biasMetrics: {
    political: "Indicates the level of political bias in the comments. Higher values suggest stronger political leanings.",
    emotional: "Measures the emotional intensity of the comments. Higher values indicate more emotionally charged discussions.",
    moral: "Shows the presence of moral or ethical judgments in the comments. Higher values suggest more moralizing content."
  }
}

export function VideoAnalyzer() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<AnalysisResults | null>(null)
  const [commentCount, setCommentCount] = useState(DEFAULT_BATCH_SIZE)
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null)
  const [hoveredClusterId, setHoveredClusterId] = useState<string | null>(null)
  const [showTooltip, setShowTooltip] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResults(null)

    try {
      const response = await fetch(`/api/analyze?maxResults=${commentCount}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze video')
      }

      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze video. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLoadMore = async () => {
    if (commentCount >= MAX_COMMENTS) return
    setCommentCount((prev) => Math.min(prev + DEFAULT_BATCH_SIZE, MAX_COMMENTS))
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/analyze?maxResults=${Math.min(commentCount + DEFAULT_BATCH_SIZE, MAX_COMMENTS)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze video')
      }
      setResults(data)
      setCommentCount((prev) => Math.min(prev + DEFAULT_BATCH_SIZE, MAX_COMMENTS))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more comments.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setUrl('')
    setResults(null)
    setCommentCount(DEFAULT_BATCH_SIZE)
    setSelectedCluster(null)
    setHoveredClusterId(null)
  }

  // Tooltip for clusters
  const hoveredCluster = results?.clusters.find(c => c.id === hoveredClusterId) || null

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste YouTube video URL here..."
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400 transition-all duration-200"
          />
          <button
            type="submit"
            disabled={loading || !url}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </button>
        </div>
        
        {error && (
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-500 text-sm"
          >
            {error}
          </motion.p>
        )}
      </form>

      {/* Loading State */}
      {loading && <LoadingState />}

      {/* Analysis Results */}
      {!loading && results && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mt-8 space-y-6"
        >
          {/* Overview Summary Card */}
          <div className="p-6 bg-gray-900 rounded-lg shadow-lg border border-blue-800 mb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-blue-400 font-semibold mb-1">Overview</div>
                <div className="text-lg font-bold mb-1">{results.clusters.length} Clusters</div>
                <div className="text-sm text-gray-400 mb-1">Most common topics: <span className="text-white font-semibold">{results.clusters.map(c => c.theme).slice(0, 3).join(', ')}</span></div>
                <div className="text-sm text-gray-400 mb-1">Overall sentiment: <span className={results.clusters.reduce((a, c) => a + c.sentiment, 0) / results.clusters.length > 0 ? 'text-green-400' : 'text-red-400'}>{(results.clusters.reduce((a, c) => a + c.sentiment, 0) / results.clusters.length).toFixed(2)}</span></div>
                <div className="text-sm text-gray-400">Diversity score: <span className="text-blue-400 font-semibold">{results.diversityScore.toFixed(2)}</span></div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-xs uppercase tracking-widest text-purple-400 font-semibold">Bias Metrics</div>
                <div className="text-sm text-gray-400">Political: <span className="text-white font-semibold">{results.biasMetrics.political.toFixed(2)}</span></div>
                <div className="text-sm text-gray-400">Emotional: <span className="text-white font-semibold">{results.biasMetrics.emotional.toFixed(2)}</span></div>
                <div className="text-sm text-gray-400">Moral: <span className="text-white font-semibold">{results.biasMetrics.moral.toFixed(2)}</span></div>
              </div>
            </div>
          </div>

          {/* Video Info */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-gray-800 rounded-lg shadow-lg"
          >
            <h2 className="text-2xl font-semibold mb-2">{results.title}</h2>
            <p className="text-gray-400">Channel: {results.channelTitle}</p>
          </motion.div>

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-6 bg-gray-800 rounded-lg shadow-lg relative"
              onMouseEnter={() => setShowTooltip('diversityScore')}
              onMouseLeave={() => setShowTooltip(null)}
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold">Diversity Score</h3>
              </div>
              <p className="text-3xl font-bold text-blue-500">
                {results.diversityScore.toFixed(2)}
              </p>
              {showTooltip === 'diversityScore' && (
                <div className="absolute left-0 right-0 -bottom-2 translate-y-full bg-gray-900 text-white p-2 rounded text-sm z-10 shadow-lg">
                  {tooltips.diversityScore}
                </div>
              )}
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-6 bg-gray-800 rounded-lg shadow-lg"
            >
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-5 h-5 text-purple-500" />
                <h3 className="text-lg font-semibold">Comment Clusters</h3>
              </div>
              <p className="text-3xl font-bold text-purple-500">
                {results.clusters.length}
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 bg-gray-800 rounded-lg shadow-lg relative"
              onMouseEnter={() => setShowTooltip('biasMetrics')}
              onMouseLeave={() => setShowTooltip(null)}
            >
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-green-500" />
                <h3 className="text-lg font-semibold">Bias Analysis</h3>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-400">
                  Political: {results.biasMetrics.political.toFixed(2)}
                </p>
                <p className="text-sm text-gray-400">
                  Emotional: {results.biasMetrics.emotional.toFixed(2)}
                </p>
                <p className="text-sm text-gray-400">
                  Moral: {results.biasMetrics.moral.toFixed(2)}
                </p>
              </div>
              {showTooltip === 'biasMetrics' && (
                <div className="absolute left-0 right-0 -bottom-2 translate-y-full bg-gray-900 text-white p-2 rounded text-sm z-10 shadow-lg">
                  <p className="mb-1"><strong>Political:</strong> {tooltips.biasMetrics.political}</p>
                  <p className="mb-1"><strong>Emotional:</strong> {tooltips.biasMetrics.emotional}</p>
                  <p><strong>Moral:</strong> {tooltips.biasMetrics.moral}</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Bias Compass Radar Chart */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 bg-gray-800 rounded-lg shadow-lg"
          >
            <BiasCompass bias={results.biasMetrics} />
          </motion.div>

          {/* Load More Comments Button */}
          {commentCount < MAX_COMMENTS && (
            <div className="flex justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLoadMore}
                className="px-6 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold shadow transition"
                disabled={loading}
              >
                Load More Comments
              </motion.button>
            </div>
          )}

          {/* Cluster Visualization */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative"
          >
            <h3 className="text-lg font-semibold mb-4">Comment Clusters</h3>
            <ClusterVisualization
              clusters={results.clusters}
              onClusterClick={setSelectedCluster}
              hoveredClusterId={hoveredClusterId}
              setHoveredClusterId={setHoveredClusterId}
            />
            {hoveredCluster && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute left-1/2 top-8 z-20 -translate-x-1/2 bg-gray-900 text-white rounded-lg shadow-lg px-4 py-2 text-sm pointer-events-none border border-blue-700"
              >
                <div className="font-semibold mb-1">{hoveredCluster.theme}</div>
                <div>Sentiment: <span className={hoveredCluster.sentiment > 0 ? 'text-green-400' : hoveredCluster.sentiment < 0 ? 'text-red-400' : 'text-gray-300'}>{hoveredCluster.sentiment.toFixed(2)}</span></div>
                <div>Size: {hoveredCluster.size} comments</div>
              </motion.div>
            )}
          </motion.div>

          {/* Try Again Button */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex justify-center mt-8"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleReset}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold shadow transition"
            >
              <RefreshCw className="w-4 h-4" />
              Try Another Video
            </motion.button>
          </motion.div>
        </motion.div>
      )}

      {/* Cluster Modal */}
      <AnimatePresence>
        {selectedCluster && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-lg shadow-xl max-w-lg w-full p-6 relative"
            >
              <button
                className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
                onClick={() => setSelectedCluster(null)}
              >
                <X className="w-6 h-6" />
              </button>
              <div className="mb-2">
                <div className="text-xs uppercase tracking-widest text-blue-400 font-semibold mb-1">Key Phrase</div>
                <div className="text-lg font-bold mb-2">{selectedCluster.theme}</div>
              </div>
              <div className="mb-2">
                <div className="text-xs uppercase tracking-widest text-purple-400 font-semibold mb-1">Headline</div>
                <div className="italic text-gray-300 mb-2">"{selectedCluster.headline}"</div>
              </div>
              <div className="mb-2 text-gray-400">Sentiment: <span className={selectedCluster.sentiment > 0 ? 'text-green-400' : selectedCluster.sentiment < 0 ? 'text-red-400' : 'text-gray-300'}>{selectedCluster.sentiment.toFixed(2)}</span></div>
              <div className="mb-2 text-gray-400">Toxicity: <span className={getToxicityScore(selectedCluster.comments) > 0.2 ? 'text-red-400' : 'text-green-400'}>{getToxicityScore(selectedCluster.comments).toFixed(2)}</span></div>
              <div className="mb-4 text-gray-400">{selectedCluster.size} comments</div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {selectedCluster.comments.slice(0, 10).map((c, i) => (
                  <motion.div 
                    key={c.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-gray-800 rounded p-2 text-sm text-gray-200 border border-gray-700"
                  >
                    <span className="font-semibold text-blue-400">{c.author}:</span> {c.text}
                  </motion.div>
                ))}
                {selectedCluster.comments.length > 10 && (
                  <div className="text-xs text-gray-500 mt-2">...and {selectedCluster.comments.length - 10} more</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 