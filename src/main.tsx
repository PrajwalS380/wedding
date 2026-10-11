import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/400-italic.css'
import '@fontsource/cormorant-garamond/500-italic.css'
import '@fontsource-variable/manrope'
import '@fontsource/pinyon-script'
import './styles/indic-fonts.css'
import './styles/index.css'

import App from './app/App'
import { I18nProvider } from './i18n/I18nProvider'
import { SoundtrackProvider } from './audio/SoundtrackProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <SoundtrackProvider>
        <App />
      </SoundtrackProvider>
    </I18nProvider>
  </StrictMode>,
)
