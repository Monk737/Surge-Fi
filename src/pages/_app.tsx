import type { AppProps } from 'next/app'
import Head from 'next/head'
import dynamic from 'next/dynamic';
import '@rainbow-me/rainbowkit/styles.css';
import '../styles/globals.css'

// Everything below the shell depends on wallet state, so it renders in the
// browser only. Loading it with ssr:false also keeps WalletConnect's Node-only
// logging dependencies out of the server bundle, which otherwise breaks the build.
const AppShell = dynamic(() => import('../components/AppShell'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black text-2xl tracking-tighter">
      SURGE_
    </div>
  ),
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Surge Finance</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <AppShell>
        <Component {...pageProps} />
      </AppShell>
    </>
  )
}
