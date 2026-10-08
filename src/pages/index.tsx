import dynamic from 'next/dynamic'

const Dashboard = dynamic(() => import('../views/Dashboard').then(m => m.Dashboard), { ssr: false })

export default function Home() {
  return <Dashboard />
}
