'use client'

import { motion } from 'framer-motion'
import { Logo } from '@/components/Logo'
import { VideoAnalyzer } from '@/components/VideoAnalyzer'
import { Playfair_Display, Space_Grotesk } from 'next/font/google'
import { useRef, useLayoutEffect, useState } from 'react'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '700', '900'] })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['700'] })

export default function Home() {
  // For dynamic bubble sizing
  const echoRef = useRef(null)
  const [bubble, setBubble] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    if (echoRef.current) {
      const rect = (echoRef.current as HTMLElement).getBoundingClientRect()
      setBubble({ width: rect.width, height: rect.height })
    }
  }, [])

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#181c2b] via-[#1a1a2e] to-[#232946] relative overflow-x-hidden">
      {/* Animated blurred blobs */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1.1, opacity: 0.5 }}
        transition={{ duration: 1.2, delay: 0.1, type: 'spring' }}
        className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 rounded-full blur-3xl opacity-40 -z-10"
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1.1, opacity: 0.4 }}
        transition={{ duration: 1.2, delay: 0.3, type: 'spring' }}
        className="absolute bottom-[-10%] right-[-10%] w-[30vw] h-[30vw] bg-gradient-to-br from-blue-400 via-cyan-400 to-teal-400 rounded-full blur-3xl opacity-30 -z-10"
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1.1, opacity: 0.3 }}
        transition={{ duration: 1.2, delay: 0.5, type: 'spring' }}
        className="absolute top-1/2 left-1/2 w-[60vw] h-[20vw] bg-gradient-to-br from-purple-400 via-pink-400 to-yellow-300 rounded-full blur-2xl opacity-20 -z-10"
        style={{ transform: 'translate(-50%, -50%)' }}
      />

      <div className="w-full max-w-2xl mx-auto px-4 pt-4 pb-8 flex flex-col items-center justify-center min-h-screen">
        {/* Hero Section: logo, wordmark, animated headline, subheadline, CTA */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, type: 'tween', ease: 'easeOut' }}
          className="text-center mb-10 flex flex-col items-center justify-center w-full"
        >
          {/* Logo in glassy, glowing badge */}
          <motion.div
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, type: 'tween', ease: 'easeOut' }}
            className="mb-2 flex items-center justify-center"
          >
            <span className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-pink-400 via-blue-400 to-purple-400 shadow-2xl border-4 border-white/20 p-3 backdrop-blur-xl">
              <Logo className="w-14 h-14 drop-shadow-xl" />
            </span>
          </motion.div>
          {/* EchoScope wordmark with Space Grotesk, gradient, and animated underline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.18, type: 'tween', ease: 'easeOut' }}
            className={`mb-6 text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 ${spaceGrotesk.className} relative`}
          >
            EchoScope
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, delay: 0.3, type: 'spring' }}
              className="absolute left-0 right-0 -bottom-2 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full origin-left"
            />
          </motion.div>
          <motion.h1
            className={`font-normal text-4xl md:text-5xl lg:text-6xl leading-tight mb-2 tracking-tight text-white ${playfair.className}`}
            style={{ lineHeight: 1.1, position: 'relative' }}
          >
            <motion.span
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, type: 'tween', ease: 'easeOut' }}
              className="block"
            >
              See beyond the{' '}
              <span className="relative inline-block align-baseline">
                <motion.span
                  ref={echoRef}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.35, type: 'tween', ease: 'easeOut' }}
                  className={`text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-red-400 to-yellow-300 drop-shadow-[0_2px_16px_rgba(232,121,249,0.5)] animate-pulse ${playfair.className}`}
                  style={{
                    textShadow: '0 2px 24px #e879f9, 0 1px 2px #fff',
                    filter: 'drop-shadow(0 0 16px #e879f9aa)'
                  }}
                >
                  echo
                </motion.span>
              </span>
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5, type: 'tween', ease: 'easeOut' }}
              className="block mt-2"
            >
              <span className={`text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-300 ${playfair.className}`}>AI-powered YouTube insight</span>
            </motion.span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1, type: 'tween', ease: 'easeOut' }}
            className="text-lg md:text-xl text-blue-100 font-sans mb-6 max-w-2xl mx-auto"
          >
            Uncover bias, diversity, and sentiment in YouTube comments for smarter content decisions.
          </motion.p>
          <motion.a
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.2, type: 'tween', ease: 'easeOut' }}
            href="#analyze"
            className="inline-block px-8 py-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold text-lg shadow-lg hover:scale-105 hover:shadow-xl transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Try EchoScope Now
          </motion.a>
        </motion.div>

        {/* Analyzer Card - glassmorphic */}
        <motion.div
          id="analyze"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.3, type: 'tween', ease: 'easeOut' }}
          className="w-full rounded-3xl bg-white/10 shadow-2xl border border-blue-100/20 backdrop-blur-2xl p-0 md:p-6 mb-6"
          style={{ boxShadow: '0 8px 32px 0 rgba(80,120,255,0.10), 0 1.5px 6px 0 rgba(80,120,255,0.08)' }}
        >
          <VideoAnalyzer />
        </motion.div>

        {/* Footer - glassmorphic */}
        <motion.footer
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.4, type: 'tween', ease: 'easeOut' }}
          className="w-full text-center text-blue-100/80 text-sm py-3 rounded-xl bg-white/10 border border-blue-100/20 shadow backdrop-blur-md mt-2"
        >
          <p>
            Built by{' '}
            <a
              href="https://farooqqureshi.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-300 hover:text-pink-300 transition-colors font-semibold"
            >
              Farooq
            </a>
          </p>
        </motion.footer>
      </div>
    </main>
  )
}
