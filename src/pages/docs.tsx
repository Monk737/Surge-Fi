import dynamic from 'next/dynamic'

const DocsPage = dynamic(() => import('../views/DocsPage').then(m => m.DocsPage), { ssr: false })

export default function Docs() {
  return <DocsPage />
}
