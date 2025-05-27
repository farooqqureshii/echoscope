'use client'

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts'

export function BiasCompass({ bias }) {
  const data = [
    { subject: 'Political', value: bias.political },
    { subject: 'Emotional', value: bias.emotional },
    { subject: 'Moral', value: bias.moral },
  ]

  return (
    <div className="w-full h-64 flex flex-col items-center justify-center">
      <h3 className="text-lg font-semibold mb-2">Bias Compass</h3>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#374151" />
          <PolarAngleAxis dataKey="subject" stroke="#c7d2fe" fontSize={14} />
          <PolarRadiusAxis angle={30} domain={[0, 1]} tick={false} />
          <Radar name="Bias" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.5} />
          <Tooltip formatter={v => v.toFixed(2)} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
} 