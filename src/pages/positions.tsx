import dynamic from 'next/dynamic'

const PositionsPage = dynamic(() => import('../views/PositionsPage').then(m => m.PositionsPage), { ssr: false })

export default function Positions() {
  return <PositionsPage />
}
