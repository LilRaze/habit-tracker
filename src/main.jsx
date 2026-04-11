import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './contexts/AuthContext'
import { ProfileProvider } from './contexts/ProfileContext'
import { FriendsProvider } from './contexts/FriendsContext'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ProfileProvider>
        <FriendsProvider>
          <App />
        </FriendsProvider>
      </ProfileProvider>
    </AuthProvider>
  </StrictMode>,
)
