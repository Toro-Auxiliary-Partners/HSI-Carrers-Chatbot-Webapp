import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { initializeIcons } from '@fluentui/react'
import { MsalProvider } from '@azure/msal-react'
import { PublicClientApplication } from '@azure/msal-browser'

import Chat from './pages/chat/Chat'
import Quiz from './pages/quiz/Quiz'
import Layout from './pages/layout/Layout'
import { Home } from './pages/home/Home'
import NoPage from './pages/NoPage'
import { AppStateProvider } from './state/AppProvider'
import { msalConfig } from '../authConfig.js'

import './index.css'

initializeIcons("https://res.cdn.office.net/files/fabric-cdn-prod_20241209.001/assets/icons/")

const msalInstance = new PublicClientApplication(msalConfig)

export default function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <AppStateProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="chat" element={<Chat />} />
              <Route path="quiz" element={<Quiz />} />
              <Route path="*" element={<NoPage />} />
            </Route>
          </Routes>
        </HashRouter>
      </AppStateProvider>
    </MsalProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
