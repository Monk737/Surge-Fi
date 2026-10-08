import dynamic from 'next/dynamic'

const LeaderboardPage = dynamic(() => import('../views/LeaderboardPage').then(m => m.LeaderboardPage), { ssr: false })

export default function Leaderboard() {
  return <LeaderboardPage />
}
