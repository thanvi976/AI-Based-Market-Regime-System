import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchMarketRisk, fetchIndiaRisk, fetchMarketData, fetchIndiaMarket } from '../services/api'

export default function HomePage() {
  const [usRisk, setUsRisk] = useState(null)
  const [indiaRisk, setIndiaRisk] = useState(null)
  const [marketData, setMarketData] = useState(null)
  const [indiaMarket, setIndiaMarket] = useState(null)

  useEffect(() => {
    fetchMarketRisk().then(setUsRisk).catch(() => {})
    fetchIndiaRisk().then(setIndiaRisk).catch(() => {})
    fetchMarketData().then(setMarketData).catch(() => {})
    fetchIndiaMarket().then(setIndiaMarket).catch(() => {})
  }, [])

  // regime badge helper
  const regimeBadge = (regime) => {
    if (!regime) return { bg:'#F2EDE6', color:'#6B6560', border:'#E8E2D9', label:'Loading' }
    if (regime.includes('Bull'))  return { bg:'#E8F5E9', color:'#2C4A3E', border:'#A5D6A7', label: regime }
    if (regime.includes('Bear'))  return { bg:'#FDECEA', color:'#8B3A3A', border:'#FFAB91', label: regime }
    return { bg:'#FFF8E7', color:'#C17F4A', border:'#FFE082', label: regime }
  }

  const crashColor = (pct) => pct >= 40 ? '#8B3A3A' : pct >= 20 ? '#C17F4A' : '#2C4A3E'

  const usBadge     = regimeBadge(usRisk?.market_regime)
  const indiaBadge  = regimeBadge(indiaRisk?.market_regime)
  const usCrashPct  = Math.round((usRisk?.crash_probability || 0) * 100)
  const inCrashPct  = Math.round((indiaRisk?.crash_probability || 0) * 100)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── NAV ── */}
      <nav style={{
        position:'sticky', top:0, zIndex:100,
        background:'white', borderBottom:'1px solid var(--border)',
        height:'64px', display:'flex', alignItems:'center',
        justifyContent:'space-between', padding:'0 2.5rem'
      }}>
        <span style={{ fontFamily:'Playfair Display, serif', fontSize:'1.3rem', fontWeight:700, letterSpacing:'-0.01em' }}>
          KAIROS <span style={{ color:'var(--gold)', margin:'0 0.25rem' }}>·</span> Markets
        </span>
        <div style={{ display:'flex', alignItems:'center', gap:'2rem' }} className="nav-links">
          <Link href="/dashboard" style={{ fontSize:'0.875rem', color:'var(--ink-muted)', textDecoration:'none' }}>Dashboard</Link>
          <Link href="/signal"    style={{ fontSize:'0.875rem', color:'var(--ink-muted)', textDecoration:'none' }}>Signal</Link>
          <Link href="/trading-assistant" style={{ fontSize:'0.875rem', color:'var(--ink-muted)', textDecoration:'none' }}> AI Assistant</Link>
          
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero" style={{ maxWidth:'1200px', margin:'0 auto', padding:'5rem 2.5rem 4rem', display:'flex', alignItems:'center', gap:'4rem', flexWrap:'wrap' }}>
        
        {/* Left */}
        <div style={{ flex:1, minWidth:'280px' }}>
          <div className="fade-up" style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1.5rem' }}>
            <div style={{ width:'28px', height:'1.5px', background:'var(--gold)' }} />
            <span style={{ fontSize:'0.7rem', letterSpacing:'0.18em', color:'var(--gold)', textTransform:'uppercase', fontWeight:500, fontFamily:'DM Sans, sans-serif' }}>
              AI-Powered Market Intelligence
            </span>
          </div>

          <h1 className="fade-up delay-1" style={{ fontFamily:'Playfair Display, serif', fontSize:'clamp(2.8rem, 4.5vw, 4.2rem)', fontWeight:700, lineHeight:1.12, color:'var(--ink)', marginBottom:'1.5rem' }}>
            Know where<br />
            the <em>market</em><br />
            stands.
          </h1>

          <p className="fade-up delay-2" style={{ fontSize:'1.05rem', color:'var(--ink-muted)', lineHeight:1.75, maxWidth:'460px', marginBottom:'2rem' }}>
            Machine-learning risk analytics and regime detection for US and Indian equity markets. Deconstruced data, editorial clarity.
          </p>

          <div className="fade-up delay-3" style={{ display:'flex', gap:'0.875rem', flexWrap:'wrap', marginBottom:'1.25rem' }}>
            <Link href="/dashboard" style={{
              background:'var(--navy)', color:'white', padding:'0.8rem 1.75rem',
              borderRadius:'8px', fontWeight:600, fontSize:'0.95rem', textDecoration:'none',
              transition:'all 0.2s', display:'inline-block'
            }}>Open Dashboard</Link>
            <Link href="/signal" style={{
              background:'transparent', color:'var(--ink)', border:'1.5px solid var(--border-gold)',
              padding:'0.8rem 1.75rem', borderRadius:'8px', fontWeight:500, fontSize:'0.95rem',
              textDecoration:'none', transition:'all 0.2s', display:'inline-block'
            }}>View Signal</Link>
          </div>

          <p className="fade-up delay-3" style={{ fontSize:'0.8rem', color:'var(--ink-muted)', fontStyle:'italic' }}>
            Refreshes every 5 minutes · Not financial advice
          </p>
        </div>

        {/* Right — Snapshot Card */}
        <div className="fade-up delay-2 hero-right" style={{ flex:'0 0 320px', minWidth:'280px' }}>
          <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:'16px', padding:'1.5rem', boxShadow:'0 8px 40px rgba(0,0,0,0.09)' }}>
            
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
              <span style={{ fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.12em', color:'var(--ink-muted)', fontWeight:500 }}>Live Market</span>
              <span style={{ display:'flex', alignItems:'center', gap:'0.35rem', fontSize:'0.72rem', color:'var(--forest)', fontWeight:600 }}>
                <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:'var(--forest)', animation:'pulseDot 2s ease-in-out infinite', display:'inline-block' }} />
                Live
              </span>
            </div>

            <div style={{ height:'1px', background:'var(--border)', margin:'0.85rem 0' }} />

            {/* US */}
            <div style={{ marginBottom:'1rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.35rem' }}>
                <span>🇺🇸</span>
                <span style={{ fontSize:'0.78rem', color:'var(--ink-muted)', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.08em' }}>S&P 500</span>
              </div>
              <div style={{ fontFamily:'Playfair Display, serif', fontSize:'1.7rem', fontWeight:700, color:'var(--ink)', lineHeight:1, marginBottom:'0.4rem' }}>
                {marketData?.sp500_close ? Number(marketData.sp500_close).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) : '—'}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <span style={{ fontSize:'0.7rem', fontWeight:600, padding:'0.2rem 0.65rem', borderRadius:'999px', border:`1px solid ${usBadge.border}`, background:usBadge.bg, color:usBadge.color }}>
                  {usBadge.label}
                </span>
                <span style={{ fontSize:'0.78rem', color:'var(--ink-muted)' }}>
                  Crash Risk <strong style={{ color: crashColor(usCrashPct) }}>{usCrashPct}%</strong>
                </span>
              </div>
            </div>

            <div style={{ height:'1px', background:'var(--border)', margin:'0.85rem 0' }} />

            {/* India */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.35rem' }}>
                <span>🇮🇳</span>
                <span style={{ fontSize:'0.78rem', color:'var(--ink-muted)', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.08em' }}>NIFTY 50</span>
              </div>
              <div style={{ fontFamily:'Playfair Display, serif', fontSize:'1.7rem', fontWeight:700, color:'var(--ink)', lineHeight:1, marginBottom:'0.4rem' }}>
                {indiaMarket?.nifty_close ? Number(indiaMarket.nifty_close).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) : '—'}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <span style={{ fontSize:'0.7rem', fontWeight:600, padding:'0.2rem 0.65rem', borderRadius:'999px', border:`1px solid ${indiaBadge.border}`, background:indiaBadge.bg, color:indiaBadge.color }}>
                  {indiaBadge.label}
                </span>
                <span style={{ fontSize:'0.78rem', color:'var(--ink-muted)' }}>
                  Crash Risk <strong style={{ color: crashColor(inCrashPct) }}>{inCrashPct}%</strong>
                </span>
              </div>
            </div>

            <div style={{ marginTop:'1.1rem', paddingTop:'0.85rem', borderTop:'1px solid var(--border)', textAlign:'right' }}>
              <Link href="/dashboard" style={{ fontSize:'0.82rem', color:'var(--gold)', textDecoration:'none', fontWeight:500 }}>
                Full Analysis →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div style={{ background:'var(--navy)', height:'44px', overflow:'hidden', display:'flex', alignItems:'center' }}>
        <div style={{ display:'flex', animation:'ticker 30s linear infinite', whiteSpace:'nowrap', width:'max-content' }}>
          {[
            { label:'S&P 500',   value: marketData?.sp500_close },
            { label:'VIX',       value: marketData?.vix_close },
            { label:'NIFTY 50',  value: indiaMarket?.nifty_close },
            { label:'India VIX', value: indiaMarket?.india_vix },
            { label:'NASDAQ',    value: marketData?.nasdaq_close },
            { label:'DOW',       value: marketData?.dow_jones_close },
          ].concat([
            { label:'S&P 500',   value: marketData?.sp500_close },
            { label:'VIX',       value: marketData?.vix_close },
            { label:'NIFTY 50',  value: indiaMarket?.nifty_close },
            { label:'India VIX', value: indiaMarket?.india_vix },
            { label:'NASDAQ',    value: marketData?.nasdaq_close },
            { label:'DOW',       value: marketData?.dow_jones_close },
          ]).map((item, i) => (
            <span key={i} style={{ padding:'0 2rem', fontSize:'0.78rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <span style={{ color:'rgba(255,255,255,0.55)', letterSpacing:'0.06em' }}>{item.label}</span>
              <strong style={{ color:'white', fontWeight:600 }}>
                {item.value ? Number(item.value).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) : '—'}
              </strong>
              <span style={{ color:'rgba(255,255,255,0.2)', marginLeft:'1rem' }}>·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section style={{ maxWidth:'1200px', margin:'0 auto', padding:'5rem 2.5rem' }}>
        <div style={{ textAlign:'center', marginBottom:'3rem' }}>
          <p style={{ fontFamily:'Playfair Display, serif', fontStyle:'italic', fontSize:'1rem', color:'var(--gold)', marginBottom:'0.5rem' }}>What we track</p>
          <h2 style={{ fontFamily:'Playfair Display, serif', fontSize:'clamp(1.6rem, 3vw, 2.2rem)', fontWeight:700, color:'var(--ink)' }}>
            Everything the market tells you.
          </h2>
        </div>

        <div className="features-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'1.5rem' }}>
          {[
            { accent:'var(--forest)', iconBg:'#E8F5E9', icon:'📊', title:'Regime Detection',   desc:'ML-powered analysis identifies whether the market is in a bull, bear, or sideways phase — updated in real time.',   link:'/dashboard', cta:'Open Dashboard →' },
            { accent:'var(--rose)',   iconBg:'#FDECEA', icon:'⚡', title:'Crash Probability',  desc:'A trained Random Forest model scores crash risk from 0–100% using VIX, momentum, and trend signals.',             link:'/signal',    cta:'View Signal →' },
            { accent:'var(--camel)', iconBg:'#FFF8E7', icon:'💬', title:'AI Stock Assistant', desc:'Ask about any Indian or US stock in plain language. Get regime context, momentum, and a clear buy/hold/sell signal.', link:'/trading-assistant', cta:'Try Assistant →' },
          ].map((card, i) => (
            <div key={i} className={`fade-up delay-${i+1}`} style={{
              background:'white', border:'1px solid var(--border)', borderRadius:'12px',
              padding:'1.75rem', position:'relative', overflow:'hidden',
              transition:'transform 0.2s, box-shadow 0.2s', cursor:'default',
              borderTop:`3px solid ${card.accent}`
            }}>
              <div style={{ width:'44px', height:'44px', borderRadius:'10px', background:card.iconBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.3rem', marginBottom:'1.1rem' }}>
                {card.icon}
              </div>
              <h3 style={{ fontFamily:'Playfair Display, serif', fontSize:'1.1rem', fontWeight:700, marginBottom:'0.6rem', color:'var(--ink)' }}>{card.title}</h3>
              <p style={{ fontSize:'0.9rem', color:'var(--ink-muted)', lineHeight:1.7, marginBottom:'1.1rem' }}>{card.desc}</p>
              <Link href={card.link} style={{ fontSize:'0.85rem', color:'var(--gold)', textDecoration:'none', fontWeight:500 }}>{card.cta}</Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background:'var(--navy)', padding:'2.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1rem' }}>
        <span style={{ fontFamily:'Playfair Display, serif', fontSize:'1rem', color:'white', fontWeight:700 }}>
          KAIROS <span style={{ color:'var(--gold)' }}>·</span> Markets
        </span>
        <span style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.4)' }}>
          Not financial advice · Data refreshes every 5 min · © 2026
        </span>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .nav-links a:hover { color: var(--ink) !important; }
        @media (max-width: 768px) {
          .nav-links { display: none; }
          section.hero { padding: 3rem 1.25rem !important; }
          footer { flex-direction: column; text-align: center; }
        }
      `}} />
    </div>
  )
}
