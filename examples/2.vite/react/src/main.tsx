import { scan } from 'react-scan'
import { createRoot } from 'react-dom/client'
import App from './App'

scan({ enabled: true })

createRoot(document.getElementById('root')!).render(<App />)
