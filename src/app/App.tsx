import { useCallback, useEffect, useState } from 'react'
import { MotionProvider } from '../hooks/motion'
import { safeSessionGet, safeSessionSet } from '../lib/browser'
import { HASH_TO_DIRECTION } from '../lib/compass'
import { useI18n } from '../i18n/useI18n'
import { WeddingNavigation } from '../components/navigation/WeddingNavigation'
import { CinematicIntro } from '../components/sections/CinematicIntro'
import { WeddingHero } from '../components/sections/WeddingHero'
import { InvitationScroll } from '../components/sections/InvitationScroll'
import { LivingCalendar } from '../components/sections/LivingCalendar'
import { WeddingCompass } from '../components/sections/WeddingCompass'
import { RSVPSection } from '../components/sections/RSVPSection'
import { WeddingFooter } from '../components/sections/WeddingFooter'

const INTRO_KEY = 'wr:intro-seen'

/** `?still` hides all chrome so the 3D scene can be captured as the poster image. */
const params = new URLSearchParams(window.location.search)
const stillMode = params.has('still')

function shouldShowIntro() {
  if (stillMode || params.has('nointro')) return false
  // Deep links (e.g. #venue) go straight to the content.
  if (window.location.hash && window.location.hash !== '#home') return false // deep links (incl. #venue) go straight in
  // A plain boolean flag for this tab only — no personal data is stored.
  return safeSessionGet(INTRO_KEY) !== '1'
}

export default function App() {
  const [introOpen, setIntroOpen] = useState(shouldShowIntro)
  const { t } = useI18n()

  // Honour deep links such as /#venue — on first load and on later in-page hash changes.
  useEffect(() => {
    let cleanup = () => {}
    const goToHash = () => {
      cleanup()
      const hash = decodeURIComponent(window.location.hash.slice(1))
      if (!hash || hash === 'home') return
      // Compass aliases (#venue, #schedule, …) land on the Compass, which opens the direction itself.
      const el = document.getElementById(HASH_TO_DIRECTION[hash] ? 'compass' : hash)
      if (!el) return
      let userScrolled = false
      const markUser = () => (userScrolled = true)
      // Jump instantly (smooth scrolling would be interrupted by late layout),
      // then re-align once fonts and images have settled the layout.
      const align = () => !userScrolled && el.scrollIntoView({ block: 'start', behavior: 'instant' })
      const raf = requestAnimationFrame(align)
      const timers = [250, 900, 1800].map((t) => window.setTimeout(align, t))
      document.fonts?.ready.then(align)
      // any deliberate input (scroll, tap, click, key) ends the re-alignment, so it never undoes the visitor
      window.addEventListener('wheel', markUser, { passive: true, once: true })
      window.addEventListener('touchstart', markUser, { passive: true, once: true })
      window.addEventListener('pointerdown', markUser, { passive: true, once: true })
      window.addEventListener('keydown', markUser, { once: true })
      cleanup = () => {
        cancelAnimationFrame(raf)
        timers.forEach(clearTimeout)
        window.removeEventListener('wheel', markUser)
        window.removeEventListener('touchstart', markUser)
        window.removeEventListener('pointerdown', markUser)
        window.removeEventListener('keydown', markUser)
      }
    }
    goToHash()
    window.addEventListener('hashchange', goToHash)
    return () => {
      cleanup()
      window.removeEventListener('hashchange', goToHash)
    }
  }, [])

  const enter = useCallback(() => {
    safeSessionSet(INTRO_KEY, '1')
    setIntroOpen(false)
    requestAnimationFrame(() => document.getElementById('hero-title')?.focus({ preventScroll: true }))
  }, [])

  return (
    <MotionProvider>
      {introOpen && <CinematicIntro onEnter={enter} />}
      <div inert={introOpen} className={stillMode ? 'still-mode' : undefined}>
        <a
          href="#invitation"
          className="sr-only z-[70] bg-ivory px-4 py-3 text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          {t('nav.skipToInvitation')}
        </a>
        {!stillMode && <WeddingNavigation />}
        <main id="main">
          <WeddingHero introActive={introOpen} />
          <InvitationScroll />
          <LivingCalendar />
          <WeddingCompass />
          <RSVPSection />
        </main>
        {!stillMode && <WeddingFooter />}
      </div>
    </MotionProvider>
  )
}
