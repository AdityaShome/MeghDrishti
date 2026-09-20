/**
 * MeghDrishti — Landing / Home Page
 *
 * Background image: /image.png (public/image.png in the Vite project).
 * Live hazard counts are derived from the /hazards API via useHazards().
 * Fallback hardcoded values are marked with TODO comments.
 */

import { useState, useEffect } from "react";
import { useHazards } from "./hooks/useNowcastData";
import type { HazardsResponse } from "./types";

interface HomePageProps {
  onNavigateToDashboard: () => void;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function countHazardType(data: HazardsResponse | null, type: string): number {
  if (!data) return 0; // TODO: replace with actual data once backend is live
  return data.features.filter((f) =>
    f.properties.hazards.some((h) => h.type === type)
  ).length;
}

// ─── SVG icons (inline, no extra deps) ───────────────────────────────────────

const IconRadar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="2" />
    <path d="M16.24 7.76a6 6 0 010 8.49" /><path d="M19.07 4.93a10 10 0 010 14.14" />
    <path d="M7.76 16.24a6 6 0 010-8.49" /><path d="M4.93 19.07a10 10 0 010-14.14" />
  </svg>
);

const IconCloud = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
  </svg>
);

const IconLightning = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconCloudLightning = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 16.9A5 5 0 0018 7h-1.26a8 8 0 10-11.62 9" />
    <polyline points="13 11 9 17 15 17 11 23" />
  </svg>
);

const IconRefresh = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
  </svg>
);

const IconWarn = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

const IconCloudHail = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 17.58A5 5 0 0018 8h-1.26A8 8 0 104 16.25" />
    <line x1="8" y1="16" x2="8.01" y2="16" /><line x1="8" y1="20" x2="8.01" y2="20" />
    <line x1="12" y1="18" x2="12.01" y2="18" /><line x1="12" y1="22" x2="12.01" y2="22" />
    <line x1="16" y1="16" x2="16.01" y2="16" /><line x1="16" y1="20" x2="16.01" y2="20" />
  </svg>
);

const IconChevronDown = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const IconMouse = () => (
  <svg width="22" height="30" viewBox="0 0 22 30" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <rect x="1" y="1" width="20" height="28" rx="10" />
    <line x1="11" y1="7" x2="11" y2="12" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomePage({ onNavigateToDashboard }: HomePageProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Live hazard counts from the API (lead=0 = current observations)
  // TODO: if the backend is not running the counts will be 0; replace hardcoded
  //       fallback values (16 / 4) with real data once confirmed working.
  const { data: hazardData } = useHazards(0);
  const hailZones   = hazardData ? countHazardType(hazardData, "hail")      : 16; // TODO: fallback
  const lightZones  = hazardData ? countHazardType(hazardData, "lightning") : 4;  // TODO: fallback
  const isLive      = true; // TODO: derive from API health endpoint if available

  // Reveal animation: add class once mounted
  const [revealed, setRevealed] = useState(false);
  useEffect(() => { const t = setTimeout(() => setRevealed(true), 60); return () => clearTimeout(t); }, []);

  function scrollToContent() {
    document.getElementById("hp-capabilities")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="hp-page">
      <style>{CSS}</style>

      {/* ══════════════════════════════════════════════
          NAV
      ══════════════════════════════════════════════ */}
      <header className="hp-nav-wrap" role="banner">
        <nav className="hp-nav" aria-label="Main navigation">
          {/* Brand */}
          <a href="/" className="hp-brand" aria-label="MeghDrishti home">
            <span className="hp-brand-icon" aria-hidden="true">
              <IconCloudLightning />
            </span>
            <span className="hp-brand-text">
              <span className="hp-brand-name">
                <span className="hp-brand-megh">Megh</span><span className="hp-brand-drishti">Drishti</span>
              </span>
              <span className="hp-brand-sub">Convective Weather Intelligence</span>
            </span>
          </a>

          {/* Centre links */}
          <ul className="hp-nav-links" role="list">
            {[
              { label: "Home",         id: "",                active: true  },
              { label: "Capabilities", id: "hp-capabilities", active: false },
              { label: "How It Works", id: "hp-pipeline",     active: false },
              { label: "Technology",   id: "",                active: false },
              { label: "About",        id: "",                active: false },
            ].map(({ label, id, active }) => (
              <li key={label}>
                <a
                  href="#"
                  className={`hp-nav-link${active ? " hp-nav-link--active" : ""}`}
                  onClick={e => { e.preventDefault(); if (id) document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>

          {/* Right controls */}
          <div className="hp-nav-right">
            <span className="hp-live-pill" aria-live="polite">
              <span className={`hp-live-dot${isLive ? " hp-live-dot--on" : ""}`} aria-hidden="true" />
              System Status: <strong>{isLive ? "LIVE" : "OFFLINE"}</strong>
            </span>
            <button className="hp-btn-launch" onClick={onNavigateToDashboard}>
              Launch Dashboard <IconArrow />
            </button>
            {/* Mobile hamburger */}
            <button
              className="hp-hamburger"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(v => !v)}
            >
              <span /><span /><span />
            </button>
          </div>
        </nav>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="hp-mobile-menu" role="menu">
            {["Home", "Capabilities", "How It Works", "Technology", "About"].map(l => (
              <a key={l} href="#" role="menuitem" className="hp-mobile-link"
                onClick={e => { e.preventDefault(); setMobileOpen(false); }}>
                {l}
              </a>
            ))}
            <button className="hp-btn-launch hp-mobile-launch" onClick={() => { setMobileOpen(false); onNavigateToDashboard(); }}>
              Launch Dashboard <IconArrow />
            </button>
          </div>
        )}
      </header>

      {/* ══════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════ */}
      <section className="hp-hero" aria-label="Hero section">
        {/* Full-bleed background image */}
        <div className="hp-hero-bg" role="presentation" aria-hidden="true">
          <img
            src="/image.png"
            alt=""
            className="hp-hero-img"
            aria-hidden="true"
          />
          {/* Left-to-right text-legibility overlay */}
          <div className="hp-hero-overlay" aria-hidden="true" />
          {/* Bottom fade into page background */}
          <div className="hp-hero-bottom-fade" aria-hidden="true" />
        </div>

        {/* ── Left column ── */}
        <div className={`hp-hero-content${revealed ? " hp-revealed" : ""}`}>
          {/* Badge */}
          <div className="hp-badge" role="note">
            <span className="hp-badge-icon"><IconRadar /></span>
            <span>INDIA'S WEATHER INTELLIGENCE PLATFORM</span>
          </div>

          {/* H1 */}
          <h1 className="hp-h1">
            <span className="hp-h1-white">See Severe Weather</span>
            <br />
            <span className="hp-h1-gradient">Before It Strikes.</span>
          </h1>

          {/* Sub */}
          <p className="hp-hero-sub">
            MeghDrishti transforms real-time radar, satellite and lightning
            observations into actionable 0–6 hour convective weather intelligence.
          </p>

          {/* CTA buttons */}
          <div className="hp-btn-row">
            <button className="hp-btn-primary" onClick={onNavigateToDashboard}>
              Get Started <IconArrow />
            </button>
            <button
              className="hp-btn-secondary"
              onClick={scrollToContent}
              aria-label="Explore MeghDrishti features"
            >
              <span className="hp-play-icon" aria-hidden="true">◉</span>
              Explore MeghDrishti
            </button>
          </div>

          {/* Feature pills */}
          <div className="hp-features" role="list">
            <span className="hp-feature" role="listitem">
              <span className="hp-feature-icon"><IconLightning /></span>
              Real-time observations
            </span>
            <span className="hp-feature-sep" aria-hidden="true" />
            <span className="hp-feature" role="listitem">
              <span className="hp-feature-icon"><IconCloud /></span>
              AI-assisted hazard intelligence
            </span>
            <span className="hp-feature-sep" aria-hidden="true" />
            <span className="hp-feature" role="listitem">
              <span className="hp-feature-icon"><IconClock /></span>
              0–6 hour nowcasting
            </span>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="hp-hero-right" aria-label="Live weather status">
          {/* Live intelligence card */}
          <div className="hp-live-card" role="region" aria-label="Live weather intelligence">
            <div className="hp-live-card-head">
              <span className="hp-live-card-title">LIVE WEATHER INTELLIGENCE</span>
              <span className="hp-live-pill hp-live-pill--sm" aria-live="polite">
                <span className={`hp-live-dot${isLive ? " hp-live-dot--on" : ""}`} aria-hidden="true" />
                LIVE
              </span>
            </div>

            <p className="hp-live-label">Hazards Detected:</p>
            <div className="hp-hazard-tiles">
              {/* Hail tile */}
              <div className="hp-hazard-tile" aria-label={`Hail: ${hailZones} zones`}>
                <span className="hp-hazard-tile-icon hp-hazard-tile-icon--purple">
                  <IconCloudHail />
                </span>
                <span className="hp-hazard-tile-name">Hail</span>
                <span className="hp-hazard-tile-count">{hailZones} Zones</span>
              </div>
              {/* Lightning tile */}
              <div className="hp-hazard-tile" aria-label={`Lightning: ${lightZones} zones`}>
                <span className="hp-hazard-tile-icon hp-hazard-tile-icon--amber">
                  <IconLightning />
                </span>
                <span className="hp-hazard-tile-name">Lightning</span>
                <span className="hp-hazard-tile-count">{lightZones} Zones</span>
              </div>
            </div>

            <hr className="hp-live-divider" aria-hidden="true" />

            <p className="hp-live-label">Forecast Horizon:</p>
            <div className="hp-forecast-tile">
              <span className="hp-hazard-tile-icon hp-hazard-tile-icon--cyan">
                <IconClock />
              </span>
              <span className="hp-forecast-value">0 – 6 Hours</span>
            </div>
          </div>

          {/* Colour legend */}
          <div className="hp-legend" aria-label="Precipitation intensity scale">
            <span className="hp-legend-label">Light</span>
            <div className="hp-legend-bar" aria-hidden="true" />
            <span className="hp-legend-label">Severe</span>
          </div>
        </div>

        {/* ── Bottom stat strip ── */}
        <div className="hp-stat-strip" role="list" aria-label="Platform statistics">
          {[
            {
              icon: <IconRadar />,
              iconCls: "hp-stat-icon--cyan",
              title: "REAL-TIME DATA",
              value: "Radar + Satellite + Lightning",
            },
            {
              icon: <IconClock />,
              iconCls: "hp-stat-icon--cyan",
              title: "FORECAST WINDOW",
              value: "0 – 6 Hours",
            },
            {
              icon: <IconWarn />,
              iconCls: "hp-stat-icon--purple",
              title: "HAZARD TYPES",
              value: "Hail \u2022 Lightning \u2022 Heavy Rain \u2022 Storms",
            },
            {
              icon: <IconRefresh />,
              iconCls: "hp-stat-icon--cyan",
              title: "UPDATE INTERVAL",
              value: "Near Real-Time",
            },
          ].map(({ icon, iconCls, title, value }) => (
            <div key={title} className="hp-stat-card" role="listitem">
              <span className={`hp-stat-icon ${iconCls}`} aria-hidden="true">{icon}</span>
              <div className="hp-stat-text">
                <span className="hp-stat-title">{title}</span>
                <span className="hp-stat-value">{value}</span>
              </div>
              <span className="hp-stat-dot" aria-hidden="true" />
            </div>
          ))}
        </div>

        {/* ── Scroll indicator ── */}
        <div className="hp-scroll-hint" aria-hidden="true">
          <button
            className="hp-scroll-btn"
            onClick={scrollToContent}
            tabIndex={-1}
            aria-hidden="true"
          >
            <span className="hp-scroll-mouse">
              <IconMouse />
            </span>
            <IconChevronDown />
          </button>
          <span className="hp-scroll-label">SCROLL TO EXPLORE</span>
          <span className="hp-scroll-line" />
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          CAPABILITIES SECTION
      ══════════════════════════════════════════════ */}
      <section id="hp-capabilities" className="hp-section">
        <div className="hp-section-inner">
          <p className="hp-section-eyebrow">CAPABILITIES</p>
          <h2 className="hp-section-h2">Weather Intelligence, Reimagined.</h2>
          <p className="hp-section-sub">
            MeghDrishti brings radar, satellite, lightning and nowcasting
            intelligence together in a single operational platform.
          </p>
          <div className="hp-cards">
            {[
              {
                color: "cyan",
                eyebrow: "REAL-TIME",
                title: "Live Weather Observations",
                desc: "Multi-source fusion of radar reflectivity, satellite imagery and lightning strike data with sub-minute latency.",
                icon: <IconRadar />,
              },
              {
                color: "violet",
                eyebrow: "NOWCASTING",
                title: "0–6 Hour Short-Term Forecasting",
                desc: "pySTEPS and DGMR deep-learning models deliver probabilistic precipitation nowcasts at 5-minute intervals.",
                icon: <IconClock />,
              },
              {
                color: "amber",
                eyebrow: "HAZARD INTELLIGENCE",
                title: "Storm Detection & Alerting",
                desc: "Automated detection of hail, lightning clusters, downbursts, and cloudburst events with severity scoring.",
                icon: <IconLightning />,
              },
            ].map(({ color, eyebrow, title, desc, icon }) => (
              <div key={title} className={`hp-cap-card hp-cap-card--${color}`}>
                <span className={`hp-cap-icon hp-cap-icon--${color}`}>{icon}</span>
                <p className={`hp-cap-eyebrow hp-cap-eyebrow--${color}`}>{eyebrow}</p>
                <h3 className="hp-cap-title">{title}</h3>
                <p className="hp-cap-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          PIPELINE SECTION
      ══════════════════════════════════════════════ */}
      <section id="hp-pipeline" className="hp-section hp-section--alt">
        <div className="hp-section-inner">
          <p className="hp-section-eyebrow">PIPELINE</p>
          <h2 className="hp-section-h2">From Observation to Action</h2>
          <div className="hp-pipeline" role="list">
            {[
              { n: "01", title: "OBSERVE",  sub: "Radar + Satellite + Lightning",       color: "#22D3EE" },
              { n: "02", title: "ANALYZE",  sub: "Atmospheric and convective patterns",  color: "#3B82F6" },
              { n: "03", title: "FORECAST", sub: "0–6 hour nowcasting",                 color: "#8B5CF6" },
              { n: "04", title: "ALERT",    sub: "Actionable hazard intelligence",      color: "#FBBF24" },
            ].map(({ n, title, sub, color }, i, arr) => (
              <div key={n} className="hp-pipeline-item" role="listitem">
                <div className="hp-pipeline-node" style={{ borderColor: color, boxShadow: `0 0 18px ${color}30` }}>
                  <span className="hp-pipeline-n" style={{ color }}>{n}</span>
                  <span className="hp-pipeline-title">{title}</span>
                  <span className="hp-pipeline-sub">{sub}</span>
                </div>
                {i < arr.length - 1 && (
                  <div className="hp-pipeline-conn" aria-hidden="true">
                    <div className="hp-pipeline-line" style={{ background: `linear-gradient(90deg,${color}80,${color}20)` }} />
                    <div className="hp-pipeline-arrow" style={{ borderLeftColor: color }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          DASHBOARD PREVIEW
      ══════════════════════════════════════════════ */}
      <section className="hp-section">
        <div className="hp-section-inner">
          <p className="hp-section-eyebrow">PLATFORM</p>
          <h2 className="hp-section-h2">Operational Weather Intelligence</h2>
          <p className="hp-section-sub">
            A single command-centre view — real-time map, hazard alerts, nowcast
            timeline, and forecast charts — all in one interface.
          </p>
          <div className="hp-dash-preview" aria-label="Dashboard preview">
            <div className="hp-dash-chrome">
              <div className="hp-dash-topbar">
                <div className="hp-dash-brand">
                  <div className="hp-dash-brandmark" aria-hidden="true" />
                  <div>
                    <div className="hp-dash-brandname">MeghDrishti</div>
                    <div className="hp-dash-brandtag">Nowcasting Engine</div>
                  </div>
                </div>
                <span className="hp-live-pill hp-live-pill--sm">
                  <span className="hp-live-dot hp-live-dot--on" />LIVE
                </span>
              </div>
              <div className="hp-dash-body">
                <div className="hp-dash-nav" aria-hidden="true">
                  {["MAP", "FCST", "HZRD", "RPLY"].map(t => (
                    <div key={t} className="hp-dash-navitem">{t}</div>
                  ))}
                </div>
                <div className="hp-dash-map" aria-label="Live radar map">
                  <div className="hp-dash-grid" aria-hidden="true" />
                  {/* India outline SVG */}
                  <svg className="hp-dash-india" viewBox="0 0 100 100" aria-hidden="true">
                    <polygon
                      points="45,15 52,12 60,14 67,10 74,14 78,20 80,28 82,38 83,48 82,57 79,65 74,72 68,77 60,80 52,77 45,72 38,64 33,55 30,45 31,35 35,26 40,20"
                      fill="rgba(30,80,150,0.25)"
                      stroke="rgba(34,211,238,0.45)"
                      strokeWidth="0.8"
                    />
                  </svg>
                  <div className="hp-dash-rings" aria-hidden="true">
                    {[40, 80, 120].map(r => (
                      <div key={r} className="hp-dash-ring" style={{ width: r, height: r, marginLeft: -r/2, marginTop: -r/2 }} />
                    ))}
                  </div>
                  <div className="hp-dash-map-label" aria-hidden="true">INDIA — LIVE RADAR</div>
                  {[
                    { l: "44%", t: "28%", c: "#ef4444" },
                    { l: "55%", t: "38%", c: "#f97316" },
                    { l: "62%", t: "50%", c: "#22c55e" },
                    { l: "47%", t: "56%", c: "#3b82f6" },
                  ].map((d, i) => (
                    <div key={i} aria-hidden="true" style={{ position:"absolute", left:d.l, top:d.t, width:8, height:8, borderRadius:"50%", background:d.c, boxShadow:`0 0 6px ${d.c}88`, opacity:0.85 }} />
                  ))}
                </div>
                <div className="hp-dash-sidebar" aria-hidden="true">
                  {[["#8b5cf6","HAIL · HIGH"],["#fbbf24","LIGHTNING · MOD"],["#3b82f6","RAIN · HIGH"]].map(([c,t]) => (
                    <div key={t as string} className="hp-dash-sidecard" style={{ borderLeft:`3px solid ${c}` }}>
                      <div style={{ fontSize:9, fontWeight:700, color: c as string }}>{t}</div>
                      <div style={{ fontSize:8, color:"#566782", marginTop:2 }}>Detected 2m ago</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="hp-dash-glow" aria-hidden="true" />
          </div>
          <div className="hp-dash-cta">
            <button className="hp-btn-primary" onClick={onNavigateToDashboard}>
              Open Live Dashboard <IconArrow />
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          USE CASES
      ══════════════════════════════════════════════ */}
      <section className="hp-section hp-section--alt">
        <div className="hp-section-inner">
          <p className="hp-section-eyebrow">USE CASES</p>
          <h2 className="hp-section-h2">Built for Time-Critical Decisions</h2>
          <div className="hp-use-grid">
            {[
              { icon: "🛡️", title: "Disaster Management", desc: "Early warning for civil authorities and NDRF operations." },
              { icon: "✈️",  title: "Aviation",            desc: "Convective hazard advisories for flight operations." },
              { icon: "🌾", title: "Agriculture",         desc: "Short-range precipitation guidance for farming decisions." },
              { icon: "🏗️", title: "Infrastructure",      desc: "Storm impact forecasts for power and transport networks." },
              { icon: "🚨", title: "Emergency Response",  desc: "Real-time alerts for field response coordination." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="hp-use-card">
                <div className="hp-use-icon" aria-hidden="true">{icon}</div>
                <h3 className="hp-use-title">{title}</h3>
                <p className="hp-use-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════════ */}
      <section className="hp-cta-section" aria-labelledby="hp-cta-heading">
        <div className="hp-cta-bg" aria-hidden="true" />
        <div className="hp-cta-inner">
          <p className="hp-section-eyebrow">GET STARTED</p>
          <h2 id="hp-cta-heading" className="hp-section-h2">Monitor the Next Storm.</h2>
          <p className="hp-section-sub">
            Explore real-time weather intelligence, nowcasting and hazard
            detection with MeghDrishti.
          </p>
          <button className="hp-btn-primary hp-btn-primary--lg" onClick={onNavigateToDashboard}>
            Launch MeghDrishti <IconArrow />
          </button>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════ */}
      <footer className="hp-footer" role="contentinfo">
        <div className="hp-footer-brand">
          <span className="hp-brand-icon"><IconCloudLightning /></span>
          <div>
            <div className="hp-brand-name">
              <span className="hp-brand-megh">Megh</span><span className="hp-brand-drishti">Drishti</span>
            </div>
            <div className="hp-brand-sub">Convective Weather Intelligence Platform</div>
          </div>
        </div>
        <nav className="hp-footer-links" aria-label="Footer navigation">
          {["Home","Capabilities","Technology","Dashboard","About"].map(l => (
            <a key={l} href="#" className="hp-footer-link"
              onClick={e => { e.preventDefault(); if (l === "Dashboard") onNavigateToDashboard(); }}>
              {l}
            </a>
          ))}
        </nav>
        <div className="hp-footer-bottom">
          <span>Built for Smart India Hackathon 2026</span>
          <span className="hp-footer-bottom-right">Nowcasting · Hazard Detection · GIS Intelligence</span>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CSS  (injected via <style> — no extra build step needed)
═══════════════════════════════════════════════════════════════════════════ */

const CSS = `
/* ── Reset / page shell ─────────────────────────────────────────────────── */
.hp-page {
  font-family: "Inter", system-ui, -apple-system, sans-serif;
  background: #050B1A;
  color: #CBD5E1;
  overflow-x: hidden;
  min-height: 100vh;
}
.hp-page *, .hp-page *::before, .hp-page *::after { box-sizing: border-box; }
.hp-page button { font-family: inherit; cursor: pointer; }
.hp-page a { text-decoration: none; }

/* ── Navbar ─────────────────────────────────────────────────────────────── */
.hp-nav-wrap {
  position: fixed; top: 0; left: 0; right: 0; z-index: 200;
  background: rgba(5,11,26,0.82);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(34,211,238,0.15);
}
.hp-nav {
  max-width: 1440px; margin: 0 auto;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 40px; height: 78px; gap: 24px;
}
.hp-brand {
  display: flex; align-items: center; gap: 10px;
  color: inherit; flex-shrink: 0;
}
.hp-brand-icon {
  display: flex; align-items: center; justify-content: center;
  width: 38px; height: 38px; border-radius: 10px;
  background: linear-gradient(135deg,#1E4D8C,#0E7490);
  border: 1px solid rgba(34,211,238,0.35);
  color: #22D3EE; flex-shrink: 0;
}
.hp-brand-text { display: flex; flex-direction: column; line-height: 1.2; }
.hp-brand-name { font-size: 17px; font-weight: 700; letter-spacing: 0.01em; }
.hp-brand-megh { color: #FFFFFF; }
.hp-brand-drishti { color: #22D3EE; }
.hp-brand-sub { font-size: 10px; color: #64748B; letter-spacing: 0.06em; margin-top: 1px; }

.hp-nav-links {
  display: flex; align-items: center; gap: 4px;
  list-style: none; margin: 0; padding: 0;
}
.hp-nav-link {
  font-size: 13.5px; font-weight: 500; color: #94A3B8;
  padding: 6px 14px; border-radius: 6px; transition: color 0.2s;
  white-space: nowrap;
}
.hp-nav-link:hover { color: #E2E8F0; }
.hp-nav-link--active {
  color: #22D3EE;
  border-bottom: 2px solid #22D3EE;
  padding-bottom: 4px;
}

.hp-nav-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }

.hp-live-pill {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11.5px; font-weight: 600; color: #22C55E;
  background: rgba(34,197,94,0.08);
  border: 1px solid rgba(34,197,94,0.25);
  padding: 5px 12px; border-radius: 20px; white-space: nowrap;
}
.hp-live-pill--sm { font-size: 10px; padding: 3px 9px; }
.hp-live-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #64748B; flex-shrink: 0;
}
.hp-live-dot--on {
  background: #22C55E;
  box-shadow: 0 0 0 2px rgba(34,197,94,0.25);
  animation: hp-pulse-dot 2s ease-in-out infinite;
}

.hp-btn-launch {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 13px; font-weight: 700; color: #fff;
  background: linear-gradient(135deg, #0EA5E9, #2563EB);
  border: none; border-radius: 10px; padding: 9px 20px;
  box-shadow: 0 0 18px rgba(14,165,233,0.28);
  transition: box-shadow 0.25s, transform 0.18s;
  white-space: nowrap;
}
.hp-btn-launch:hover {
  box-shadow: 0 0 28px rgba(14,165,233,0.5);
  transform: translateY(-1px);
}
.hp-btn-launch:focus-visible { outline: 2px solid #22D3EE; outline-offset: 3px; }

.hp-hamburger {
  display: none; flex-direction: column; gap: 5px;
  background: none; border: none; padding: 6px; cursor: pointer;
}
.hp-hamburger span {
  display: block; width: 22px; height: 2px;
  background: #94A3B8; border-radius: 2px;
}

.hp-mobile-menu {
  position: absolute; top: 78px; left: 0; right: 0;
  background: rgba(5,11,26,0.97);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(34,211,238,0.12);
  display: flex; flex-direction: column; padding: 12px 24px 20px; gap: 2px;
}
.hp-mobile-link {
  font-size: 14px; color: #94A3B8; padding: 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  display: block;
}
.hp-mobile-launch { width: 100%; justify-content: center; margin-top: 12px; }

/* ── Hero ───────────────────────────────────────────────────────────────── */
.hp-hero {
  position: relative;
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto 1fr auto;
  align-items: center;
  padding-top: 78px;
  overflow: hidden;
}

.hp-hero-bg {
  position: absolute; inset: 0; z-index: 0;
}
.hp-hero-img {
  width: 100%; height: 100%;
  object-fit: cover;
  object-position: center right;
  display: block;
}
.hp-hero-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(
    90deg,
    rgba(5,11,26,0.97) 0%,
    rgba(5,11,26,0.80) 38%,
    rgba(5,11,26,0.42) 62%,
    rgba(5,11,26,0.12) 100%
  );
}
.hp-hero-bottom-fade {
  position: absolute; bottom: 0; left: 0; right: 0; height: 180px;
  background: linear-gradient(to bottom, transparent, #050B1A);
}

/* Left content */
.hp-hero-content {
  position: relative; z-index: 2;
  grid-column: 1; grid-row: 1 / 3;
  padding: 80px 0 80px 80px;
  max-width: 700px;
  opacity: 0; transform: translateY(26px);
  transition: opacity 0.85s cubic-bezier(.2,.6,.4,1), transform 0.85s cubic-bezier(.2,.6,.4,1);
}
.hp-hero-content.hp-revealed {
  opacity: 1; transform: translateY(0);
}

.hp-badge {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
  color: #22D3EE;
  background: rgba(34,211,238,0.07);
  border: 1px solid rgba(34,211,238,0.30);
  border-radius: 20px; padding: 7px 16px; margin-bottom: 26px;
}
.hp-badge-icon { display: flex; }

.hp-h1 {
  margin: 0 0 22px;
  font-size: clamp(46px, 5.5vw, 78px);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.03em;
}
.hp-h1-white { color: #FFFFFF; display: block; }
.hp-h1-gradient {
  display: block;
  background: linear-gradient(90deg, #22D3EE 0%, #3B82F6 50%, #8B5CF6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hp-hero-sub {
  margin: 0 0 36px;
  font-size: clamp(15px, 1.5vw, 19px);
  line-height: 1.65;
  color: #94A3B8;
  max-width: 540px;
}

.hp-btn-row { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 32px; }

.hp-btn-primary {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 14.5px; font-weight: 700; color: #fff;
  background: linear-gradient(135deg, #0EA5E9, #2563EB);
  border: none; border-radius: 12px; padding: 13px 28px;
  box-shadow: 0 0 22px rgba(14,165,233,0.35);
  transition: box-shadow 0.25s, transform 0.18s;
}
.hp-btn-primary:hover {
  box-shadow: 0 0 36px rgba(14,165,233,0.6);
  transform: translateY(-1px);
}
.hp-btn-primary:focus-visible { outline: 2px solid #22D3EE; outline-offset: 3px; }
.hp-btn-primary--lg { font-size: 16px; padding: 15px 36px; }

.hp-btn-secondary {
  display: inline-flex; align-items: center; gap: 9px;
  font-size: 14.5px; font-weight: 600; color: #E2E8F0;
  background: rgba(34,211,238,0.06);
  border: 1px solid rgba(34,211,238,0.28);
  border-radius: 12px; padding: 12px 26px;
  backdrop-filter: blur(6px);
  transition: background 0.2s, border-color 0.2s;
}
.hp-btn-secondary:hover {
  background: rgba(34,211,238,0.12);
  border-color: rgba(34,211,238,0.5);
  color: #22D3EE;
}
.hp-btn-secondary:focus-visible { outline: 2px solid #22D3EE; outline-offset: 3px; }
.hp-play-icon { font-size: 17px; color: #22D3EE; line-height: 1; }

.hp-features {
  display: flex; align-items: center; gap: 14px;
  flex-wrap: wrap;
}
.hp-feature {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12.5px; color: #64748B;
}
.hp-feature-icon { color: #22D3EE; display: flex; }
.hp-feature-sep {
  width: 1px; height: 14px;
  background: rgba(100,116,139,0.4);
  flex-shrink: 0;
}

/* Right column */
.hp-hero-right {
  position: relative; z-index: 2;
  grid-column: 2; grid-row: 1 / 3;
  display: flex; flex-direction: column;
  align-items: flex-end;
  padding: 80px 80px 80px 24px;
  gap: 16px;
  justify-content: center;
}

/* Live card */
.hp-live-card {
  background: rgba(10,25,50,0.62);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(34,211,238,0.30);
  border-radius: 18px;
  padding: 22px 22px 18px;
  width: 280px;
  box-shadow: 0 0 40px rgba(34,211,238,0.08), inset 0 0 30px rgba(34,211,238,0.02);
  animation: hp-card-reveal 1.1s cubic-bezier(.2,.6,.4,1) 0.25s both;
}
.hp-live-card-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px;
}
.hp-live-card-title {
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.14em; color: #22D3EE;
}
.hp-live-label {
  font-size: 10.5px; color: #475569; font-weight: 600;
  letter-spacing: 0.05em; margin: 0 0 10px;
}
.hp-hazard-tiles { display: flex; gap: 10px; margin-bottom: 16px; }
.hp-hazard-tile {
  flex: 1; background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 12px 10px;
  display: flex; flex-direction: column; align-items: center; gap: 5px;
}
.hp-hazard-tile-icon {
  display: flex; align-items: center; justify-content: center;
  width: 38px; height: 38px; border-radius: 10px;
}
.hp-hazard-tile-icon--purple {
  background: rgba(168,85,247,0.15); color: #A855F7;
  border: 1px solid rgba(168,85,247,0.3);
}
.hp-hazard-tile-icon--amber {
  background: rgba(251,191,36,0.12); color: #FBBF24;
  border: 1px solid rgba(251,191,36,0.3);
}
.hp-hazard-tile-icon--cyan {
  background: rgba(34,211,238,0.12); color: #22D3EE;
  border: 1px solid rgba(34,211,238,0.3);
}
.hp-hazard-tile-name { font-size: 11px; color: #CBD5E1; font-weight: 600; }
.hp-hazard-tile-count { font-size: 12px; font-weight: 700; color: #F8FAFC; }

.hp-live-divider { border: none; border-top: 1px solid rgba(34,211,238,0.12); margin: 0 0 14px; }

.hp-forecast-tile {
  display: flex; align-items: center; gap: 12px;
}
.hp-forecast-value { font-size: 20px; font-weight: 800; color: #F8FAFC; }

/* Legend bar */
.hp-legend {
  display: flex; align-items: center; gap: 10px;
  animation: hp-card-reveal 1.1s cubic-bezier(.2,.6,.4,1) 0.4s both;
}
.hp-legend-label { font-size: 10.5px; color: #64748B; font-weight: 600; white-space: nowrap; }
.hp-legend-bar {
  height: 8px; border-radius: 4px; flex: 1; min-width: 140px;
  background: linear-gradient(90deg,
    #3B82F6 0%, #22D3EE 18%, #22C55E 36%,
    #FBBF24 54%, #F97316 72%, #EF4444 88%, #A855F7 100%);
  border: 1px solid rgba(255,255,255,0.08);
}

/* Stat strip */
.hp-stat-strip {
  position: relative; z-index: 2;
  grid-column: 1 / -1; grid-row: 3;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 0 80px 48px;
  align-items: stretch;
}
.hp-stat-card {
  background: rgba(10,25,50,0.58);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(34,211,238,0.22);
  border-radius: 14px; padding: 16px 18px;
  display: flex; align-items: center; gap: 14px;
  position: relative;
  transition: border-color 0.25s, box-shadow 0.25s;
}
.hp-stat-card:hover {
  border-color: rgba(34,211,238,0.45);
  box-shadow: 0 0 22px rgba(34,211,238,0.1);
}
.hp-stat-icon {
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
}
.hp-stat-icon--cyan { background: rgba(34,211,238,0.1); color: #22D3EE; border: 1px solid rgba(34,211,238,0.2); }
.hp-stat-icon--purple { background: rgba(139,92,246,0.1); color: #8B5CF6; border: 1px solid rgba(139,92,246,0.2); }
.hp-stat-text { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.hp-stat-title { font-size: 9px; font-weight: 700; letter-spacing: 0.13em; color: #22D3EE; }
.hp-stat-value { font-size: 12px; color: #CBD5E1; font-weight: 500; }
.hp-stat-dot {
  position: absolute; top: 10px; right: 10px;
  width: 6px; height: 6px; border-radius: 50%;
  background: #22C55E; box-shadow: 0 0 6px #22C55E;
  animation: hp-pulse-dot 2s ease-in-out infinite;
}

/* Scroll hint */
.hp-scroll-hint {
  position: absolute; bottom: 180px; left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  pointer-events: none;
}
.hp-scroll-btn {
  background: none; border: none; padding: 0;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  color: rgba(34,211,238,0.55);
  animation: hp-scroll-bounce 2.2s ease-in-out infinite;
  pointer-events: auto;
  cursor: pointer;
}
.hp-scroll-mouse { color: rgba(34,211,238,0.5); }
.hp-scroll-label {
  font-size: 8.5px; font-weight: 700; letter-spacing: 0.2em;
  color: rgba(34,211,238,0.45);
}
.hp-scroll-line {
  width: 1px; height: 28px;
  background: linear-gradient(to bottom, rgba(34,211,238,0.35), transparent);
}

/* ── Below-hero sections ────────────────────────────────────────────────── */
.hp-section { padding: 96px 80px; }
.hp-section--alt { background: rgba(4,10,24,0.8); }
.hp-section-inner { max-width: 1200px; margin: 0 auto; }
.hp-section-eyebrow {
  font-size: 10px; font-weight: 700; letter-spacing: 0.22em;
  color: #22D3EE; margin: 0 0 14px;
}
.hp-section-h2 {
  margin: 0 0 16px;
  font-size: clamp(28px, 3.5vw, 46px);
  font-weight: 800; color: #F8FAFC; letter-spacing: -0.02em;
}
.hp-section-sub {
  font-size: 15.5px; color: #64748B; line-height: 1.7;
  max-width: 560px; margin: 0 0 52px;
}

/* Capability cards */
.hp-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px,1fr));
  gap: 20px;
}
.hp-cap-card {
  background: rgba(6,14,32,0.9);
  border: 1px solid rgba(34,55,90,0.5);
  border-radius: 16px; padding: 28px 24px;
  transition: border-color 0.25s, box-shadow 0.25s;
}
.hp-cap-card:hover { box-shadow: 0 0 30px rgba(34,211,238,0.07); border-color: rgba(34,211,238,0.3); }
.hp-cap-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 44px; height: 44px; border-radius: 11px; margin-bottom: 18px;
}
.hp-cap-icon--cyan { background:rgba(34,211,238,0.1); color:#22D3EE; border:1px solid rgba(34,211,238,0.25); }
.hp-cap-icon--violet { background:rgba(139,92,246,0.1); color:#8B5CF6; border:1px solid rgba(139,92,246,0.25); }
.hp-cap-icon--amber { background:rgba(251,191,36,0.1); color:#FBBF24; border:1px solid rgba(251,191,36,0.25); }
.hp-cap-eyebrow { font-size:9.5px; font-weight:700; letter-spacing:0.16em; margin:0 0 9px; }
.hp-cap-eyebrow--cyan { color:#22D3EE; }
.hp-cap-eyebrow--violet { color:#8B5CF6; }
.hp-cap-eyebrow--amber { color:#FBBF24; }
.hp-cap-title { font-size:15px; font-weight:700; color:#F8FAFC; margin:0 0 10px; }
.hp-cap-desc { font-size:13px; color:#64748B; line-height:1.65; margin:0; }

/* Pipeline */
.hp-pipeline {
  display: flex; align-items: center;
  justify-content: center; flex-wrap: wrap; gap: 0;
}
.hp-pipeline-item { display: flex; align-items: center; }
.hp-pipeline-node {
  display: flex; flex-direction: column; align-items: center;
  padding: 22px 26px; border: 1px solid; border-radius: 14px;
  min-width: 160px; background: rgba(6,14,32,0.95); gap: 5px;
}
.hp-pipeline-n { font-size: 11px; font-weight: 800; letter-spacing: 0.12em; }
.hp-pipeline-title { font-size: 14px; font-weight: 700; color: #F8FAFC; margin-top: 2px; }
.hp-pipeline-sub { font-size: 11px; color: #64748B; text-align: center; line-height: 1.5; }
.hp-pipeline-conn { display: flex; align-items: center; width: 44px; flex-shrink: 0; }
.hp-pipeline-line { flex: 1; height: 1.5px; }
.hp-pipeline-arrow {
  width: 0; height: 0;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
}

/* Dashboard preview */
.hp-dash-preview {
  position: relative; border-radius: 16px; overflow: hidden;
  border: 1px solid rgba(34,55,90,0.5);
  box-shadow: 0 0 80px rgba(34,211,238,0.05);
}
.hp-dash-chrome { background: #060910; display: flex; flex-direction: column; height: 360px; }
.hp-dash-topbar {
  height: 46px; background: rgba(13,18,28,0.98);
  border-bottom: 1px solid rgba(43,55,78,0.4);
  display: flex; align-items: center; justify-content: space-between; padding: 0 16px;
}
.hp-dash-brand { display: flex; align-items: center; gap: 8px; }
.hp-dash-brandmark {
  width: 24px; height: 24px; border-radius: 6px;
  background: radial-gradient(circle at 30% 30%, #5fd0ff, #1c6fb3 70%);
}
.hp-dash-brandname { font-size: 11px; font-weight: 700; color: #fff; }
.hp-dash-brandtag  { font-size: 9px; color: #566782; }
.hp-dash-body { flex:1; display:flex; overflow:hidden; }
.hp-dash-nav {
  width: 48px; background: rgba(13,18,28,0.95);
  border-right: 1px solid rgba(43,55,78,0.3);
  display: flex; flex-direction: column; align-items: center; padding: 12px 0; gap: 12px;
}
.hp-dash-navitem { font-size: 7px; font-weight: 700; color: #566782; letter-spacing: 0.05em; }
.hp-dash-map {
  flex: 1; position: relative; overflow: hidden;
  background: linear-gradient(135deg, #020c1c, #040f1e);
}
.hp-dash-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(63,182,255,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(63,182,255,0.04) 1px, transparent 1px);
  background-size: 24px 24px;
}
.hp-dash-india { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.4; }
.hp-dash-rings { position: absolute; top: 50%; left: 50%; }
.hp-dash-ring {
  position: absolute; border-radius: 50%;
  border: 1px solid rgba(34,211,238,0.18);
}
.hp-dash-map-label {
  position: absolute; bottom: 10px; left: 12px;
  font-size: 9px; font-weight: 700; color: rgba(34,211,238,0.4); letter-spacing: 0.14em;
}
.hp-dash-sidebar {
  width: 148px; background: rgba(11,16,26,0.9);
  border-left: 1px solid rgba(43,55,78,0.3);
  padding: 10px; display: flex; flex-direction: column; gap: 8px;
}
.hp-dash-sidecard {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(43,55,78,0.3);
  border-radius: 5px; padding: 7px 8px;
}
.hp-dash-glow {
  position: absolute; inset: -1px; border-radius: 16px;
  background: linear-gradient(180deg, transparent 65%, rgba(34,211,238,0.04) 100%);
  pointer-events: none;
}
.hp-dash-cta { text-align: center; margin-top: 32px; }

/* Use cases */
.hp-use-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px; margin-top: 48px;
}
.hp-use-card {
  background: rgba(6,14,32,0.85);
  border: 1px solid rgba(34,55,90,0.4);
  border-radius: 12px; padding: 22px 18px;
  transition: border-color 0.25s, transform 0.22s;
}
.hp-use-card:hover { border-color: rgba(34,211,238,0.3); transform: translateY(-2px); }
.hp-use-icon { font-size: 24px; margin-bottom: 12px; }
.hp-use-title { font-size: 13px; font-weight: 700; color: #F8FAFC; margin: 0 0 6px; }
.hp-use-desc  { font-size: 12px; color: #64748B; line-height: 1.6; margin: 0; }

/* CTA section */
.hp-cta-section {
  position: relative; padding: 120px 80px; text-align: center; overflow: hidden;
  border-top: 1px solid rgba(34,55,90,0.3);
}
.hp-cta-bg {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at 50% 0%, rgba(34,211,238,0.07), transparent 60%);
  pointer-events: none;
}
.hp-cta-inner { position: relative; z-index: 1; max-width: 660px; margin: 0 auto; }

/* Footer */
.hp-footer {
  padding: 48px 80px 32px;
  border-top: 1px solid rgba(34,55,90,0.3);
  background: rgba(2,4,12,0.8);
}
.hp-footer-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; }
.hp-footer-links { display: flex; gap: 28px; flex-wrap: wrap; margin-bottom: 32px; }
.hp-footer-link { font-size: 12.5px; color: #475569; transition: color 0.2s; }
.hp-footer-link:hover { color: #22D3EE; }
.hp-footer-bottom {
  display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;
  font-size: 11px; color: #334155;
  padding-top: 20px; border-top: 1px solid rgba(34,55,90,0.2);
}
.hp-footer-bottom-right { color: #22D3EE; }

/* ── Animations ─────────────────────────────────────────────────────────── */
@keyframes hp-pulse-dot {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 2px rgba(34,197,94,0.3); }
  50%       { opacity: 0.45; box-shadow: 0 0 0 4px rgba(34,197,94,0.08); }
}
@keyframes hp-card-reveal {
  from { opacity: 0; transform: translateY(22px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes hp-scroll-bounce {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(7px); }
}

/* ── Responsive ─────────────────────────────────────────────────────────── */
@media (max-width: 1024px) {
  .hp-nav { padding: 0 24px; }
  .hp-nav-links { display: none; }
  .hp-hamburger { display: flex; }
  .hp-nav-right .hp-live-pill { display: none; }

  .hp-hero {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
  }
  .hp-hero-content {
    grid-column: 1; grid-row: 1;
    padding: 60px 24px 24px;
    max-width: none;
  }
  .hp-hero-right {
    grid-column: 1; grid-row: 2;
    align-items: flex-start;
    padding: 16px 24px 16px;
  }
  .hp-live-card { width: 100%; max-width: 380px; }
  .hp-stat-strip {
    grid-column: 1; grid-row: 3;
    grid-template-columns: 1fr 1fr;
    padding: 0 24px 40px;
  }
  .hp-scroll-hint { display: none; }

  .hp-section { padding: 64px 24px; }
  .hp-cta-section { padding: 80px 24px; }
  .hp-footer { padding: 40px 24px 28px; }
}

@media (max-width: 640px) {
  .hp-hero-content { padding: 48px 16px 20px; }
  .hp-hero-right { padding: 12px 16px; }
  .hp-stat-strip { grid-template-columns: 1fr; padding: 0 16px 32px; }
  .hp-btn-row { flex-direction: column; }
  .hp-btn-primary, .hp-btn-secondary { width: 100%; justify-content: center; }
  .hp-pipeline { flex-direction: column; align-items: center; }
  .hp-pipeline-conn { display: none; }
}
`;
