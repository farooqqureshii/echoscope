'use client'

import { useEffect, useRef, useState } from 'react'
import type { Cluster } from '@/types/analysis'
import { motion } from 'framer-motion'
import { Info } from 'lucide-react'

interface ClusterVisualizationProps {
  clusters: Cluster[]
  onClusterClick?: (cluster: Cluster) => void
  hoveredClusterId?: string | null
  setHoveredClusterId?: (id: string | null) => void
}

export function ClusterVisualization({ clusters, onClusterClick, hoveredClusterId, setHoveredClusterId }: ClusterVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [bubblePositions, setBubblePositions] = useState<{ id: string, x: number, y: number, r: number }[]>([])
  const [hoveredBubble, setHoveredBubble] = useState<{ cluster: Cluster, x: number, y: number } | null>(null)
  const [infoHover, setInfoHover] = useState<string | null>(null)
  const [tooltipHovered, setTooltipHovered] = useState(false)
  const hideTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Calculate total comments for sizing
    const totalComments = clusters.reduce((sum, cluster) => sum + cluster.size, 0)
    const positions: { id: string, x: number, y: number, r: number }[] = []

    // Calculate positions using force-directed layout
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const maxRadius = Math.min(canvas.width, canvas.height) * 0.4

    // Sort clusters by size for better visualization
    const sortedClusters = [...clusters].sort((a, b) => b.size - a.size)

    sortedClusters.forEach((cluster, index) => {
      // Calculate position using golden ratio for better distribution
      const angle = index * 2.4 // Golden angle approximation
      const radius = maxRadius * (1 - index / clusters.length * 0.5) // Larger clusters closer to center
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius
      
      // Calculate size based on comment count
      const size = Math.max(40, (cluster.size / totalComments) * 250)
      positions.push({ id: cluster.id, x, y, r: size })

      // Draw bubble with gradient
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size)
      const hue = cluster.sentiment > 0 ? 120 : 0 // Green for positive, Red for negative
      const saturation = Math.abs(cluster.sentiment) * 100
      gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, 60%, 0.8)`)
      gradient.addColorStop(1, `hsla(${hue}, ${saturation}%, 40%, 0.6)`)

      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.shadowColor = 'rgba(0,0,0,0.3)'
      ctx.shadowBlur = 12
      ctx.fill()
      ctx.shadowBlur = 0

      // Draw border if hovered
      if (hoveredClusterId === cluster.id) {
        ctx.lineWidth = 4
        ctx.strokeStyle = '#fff'
        ctx.stroke()
      }

      // Draw key phrase (theme) in the bubble
      ctx.fillStyle = 'white'
      ctx.font = `bold ${Math.max(14, Math.min(20, size / 4))}px Inter`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const phrase = cluster.theme || '...'
      const lines = phrase.split(/(?<=\b.{1,18})(?:\s|$)/g).filter(Boolean)
      lines.forEach((line, i) => {
        ctx.fillText(line, x, y - 10 + i * 20)
      })
      ctx.font = `${Math.max(10, Math.min(14, size / 6))}px Inter`
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.fillText(`${cluster.size} comments`, x, y + size - 18)
    })

    // Draw center text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.beginPath()
    ctx.arc(centerX, centerY, 30, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = 'white'
    ctx.font = 'bold 16px Inter'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Clusters', centerX, centerY)

    setBubblePositions(positions)
  }, [clusters, hoveredClusterId])

  // Mouse event handlers for interactivity
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!setHoveredClusterId) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const hovered = bubblePositions.find(b => Math.hypot(b.x - x, b.y - y) < b.r)
    setHoveredClusterId(hovered ? hovered.id : null)
    if (hovered) {
      const cluster = clusters.find(c => c.id === hovered.id)
      if (cluster) setHoveredBubble({ cluster, x, y })
      if (hideTimeout.current) clearTimeout(hideTimeout.current)
    } else {
      if (hideTimeout.current) clearTimeout(hideTimeout.current)
      hideTimeout.current = setTimeout(() => {
        if (!tooltipHovered) setHoveredBubble(null)
      }, 120)
    }
  }

  const handleTooltipEnter = () => {
    setTooltipHovered(true)
    if (hideTimeout.current) clearTimeout(hideTimeout.current)
  }
  const handleTooltipLeave = () => {
    setTooltipHovered(false)
    hideTimeout.current = setTimeout(() => setHoveredBubble(null), 120)
  }

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onClusterClick) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const clicked = bubblePositions.find(b => Math.hypot(b.x - x, b.y - y) < b.r)
    if (clicked) {
      const cluster = clusters.find(c => c.id === clicked.id)
      if (cluster) onClusterClick(cluster)
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full aspect-square bg-gray-800 rounded-lg p-4 relative overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setHoveredClusterId && setHoveredClusterId(null); hideTimeout.current = setTimeout(() => setHoveredBubble(null), 120) }}
        onClick={handleClick}
      />
      {/* Tooltip for hovered bubble */}
      {hoveredBubble && (
        <div
          className="absolute z-30 px-4 py-3 rounded-lg shadow-xl bg-gray-900 border border-blue-700 text-white text-sm"
          style={{ left: hoveredBubble.x + 20, top: hoveredBubble.y - 20, minWidth: 220, maxWidth: 320 }}
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipLeave}
        >
          <div className="font-bold text-base mb-1">{hoveredBubble.cluster.theme}</div>
          <div className="italic text-gray-300 mb-2">“{hoveredBubble.cluster.headline}”</div>
          <div className="mb-1 flex items-center gap-1">
            <span className="font-semibold">Sentiment:</span>{' '}
            <span className={hoveredBubble.cluster.sentiment > 0 ? 'text-green-400' : hoveredBubble.cluster.sentiment < 0 ? 'text-red-400' : 'text-gray-300'}>
              {hoveredBubble.cluster.sentiment.toFixed(2)}
            </span>
            <span
              className="ml-1 cursor-pointer text-blue-300"
              onMouseEnter={() => setInfoHover('sentiment')}
              onMouseLeave={() => setInfoHover(null)}
            >
              <Info size={14} />
            </span>
            {infoHover === 'sentiment' && (
              <div className="absolute left-full top-0 ml-2 bg-gray-800 border border-blue-700 rounded px-2 py-1 text-xs w-48 z-40">
                Sentiment: How positive or negative the comments are, from -1 (negative) to 1 (positive).
              </div>
            )}
          </div>
          <div className="mb-1 flex items-center gap-1">
            <span className="font-semibold">Comments:</span> {hoveredBubble.cluster.size}
            <span
              className="ml-1 cursor-pointer text-blue-300"
              onMouseEnter={() => setInfoHover('comments')}
              onMouseLeave={() => setInfoHover(null)}
            >
              <Info size={14} />
            </span>
            {infoHover === 'comments' && (
              <div className="absolute left-full top-8 ml-2 bg-gray-800 border border-blue-700 rounded px-2 py-1 text-xs w-48 z-40">
                Number of comments in this cluster.
              </div>
            )}
          </div>
          <div className="mt-2">
            <span className="font-semibold">Sample:</span>
            <ul className="list-disc ml-5 mt-1">
              {hoveredBubble.cluster.comments.slice(0, 2).map((c, i) => (
                <li key={c.id} className="text-gray-400 text-xs">{c.text}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </motion.div>
  )
} 