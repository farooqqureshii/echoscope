import { motion } from 'framer-motion'

export function Logo({ className = "" }: { className?: string }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`relative w-20 h-20 ${className}`}
    >
      {/* Outer circle */}
      <motion.div
        className="absolute inset-0 rounded-full border-4 border-blue-500"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Inner circle */}
      <motion.div
        className="absolute inset-4 rounded-full border-4 border-purple-500"
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Center dot */}
      <motion.div
        className="absolute inset-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </motion.div>
  )
} 