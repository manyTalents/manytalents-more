/**
 * ManyTalents More — root landing page.
 * Hero + 3 product cards (Prep / Manager / Money).
 *
 * This is a static page, no auth. Converted from the original
 * index.html to use Next.js + inline styles (to preserve the
 * custom typography/glow effects from the prep site design).
 */

import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <>
      <style>{LANDING_CSS}</style>

      <section className="hero">
        <div className="hero-content">
          <img src="/mtm-logo.png" alt="ManyTalents More" className="logo" />
          <h1>
            Many<span className="gold">Talents</span> More
            <span className="tm">&trade;</span>
          </h1>
          <p className="tagline">
            Three tools to many talents. One mission.
          </p>
          <a href="#products" className="scroll-indicator">
            scroll down ↓
          </a>
        </div>
      </section>

      <section className="products" id="products">
        <div className="products-header">
          <div className="section-label">The Suite</div>
          <h2>
            Multiply what&apos;s been
            <br />
            entrusted to you.
          </h2>
          <p className="products-subtitle">
            A focused set of tools built on the principle of the parable — take
            what you&apos;re given and return more.
          </p>
        </div>

        <div className="product-grid">
          <a href="/prep" className="product-card">
            <div className="card-number">01</div>
            <h3 className="card-title">
              Many<span className="gold">Talents</span> Prep
            </h3>
            <p className="card-tagline">Study smarter. Test stronger.</p>
            <p className="card-description">
              Professional licensing exam prep for the trades that matter —
              electrical, plumbing, dietitian, tax credit specialist, onsite
              wastewater, and more. 5,000+ questions. Adaptive practice. Mobile
              and web.
            </p>
            <span className="card-link">
              Enter Prep
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </span>
          </a>

          <Link href="/manager" className="product-card">
            <div className="card-number">02</div>
            <h3 className="card-title">
              Many<span className="gold">Talents</span> Manager
            </h3>
            <p className="card-tagline">Run your trade. Own your data.</p>
            <p className="card-description">
              Office dashboard for field service businesses — review tech work,
              approve invoices, manage inventory, track receipts, and bill
              customers. The replacement for Housecall Pro&apos;s office frontend.
            </p>
            <span className="card-link">
              Open Manager
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </span>
          </Link>

          <a href="#" className="product-card">
            <div className="card-number">03</div>
            <h3 className="card-title">
              Many<span className="gold">Talents</span> Money
            </h3>
            <p className="card-tagline">Grow what&apos;s entrusted.</p>
            <p className="card-description">
              Disciplined capital allocation tools — strategy development,
              position sizing, risk management, and portfolio tracking. Treat
              every dollar like it was given to you to multiply.
            </p>
            <span className="card-link disabled">Coming Soon</span>
          </a>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-brand">
          Many<span className="gold">Talents</span> More
          <sup className="tm">&trade;</sup>
        </div>
        <p className="footer-copy">&copy; 2026 ManyTalents More, LLC</p>
      </footer>
    </>
  );
}

// Inline styles preserve the original hero glow + gold accents + Playfair typography
const LANDING_CSS = `
  .hero, .products, .landing-footer { font-family: 'Inter', -apple-system, sans-serif; }
  .hero {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 2rem;
    position: relative;
  }
  .hero::before {
    content: '';
    position: absolute;
    width: 800px; height: 800px;
    top: 50%; left: 50%;
    transform: translate(-50%, -55%);
    background: radial-gradient(circle, rgba(201,168,76,0.08) 0%, rgba(201,168,76,0.03) 40%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }
  .hero::after {
    content: '';
    position: absolute;
    width: 600px; height: 600px;
    top: 50%; left: 50%;
    transform: translate(-50%, -55%);
    border-radius: 50%;
    border: 1px solid rgba(201,168,76,0.06);
    pointer-events: none;
    z-index: 0;
  }
  .hero-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: 720px;
  }
  .logo {
    width: 180px;
    height: 180px;
    border-radius: 50%;
    object-fit: cover;
    margin-bottom: 2.5rem;
    box-shadow: 0 0 60px rgba(201,168,76,0.12), 0 0 120px rgba(201,168,76,0.05);
    border: 2px solid rgba(201,168,76,0.15);
  }
  .hero h1 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(2.25rem, 6vw, 4rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    margin-bottom: 0.75rem;
    color: #f0ebe0;
    line-height: 1.05;
  }
  .gold {
    background: linear-gradient(135deg, #c9a84c, #e2c873);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .tm {
    color: #5db56e;
    font-size: 0.5em;
    vertical-align: super;
    font-weight: 600;
    margin-left: 2px;
    -webkit-text-fill-color: #5db56e;
  }
  .tagline {
    color: #8a8578;
    font-size: clamp(1rem, 1.5vw, 1.25rem);
    margin-bottom: 3rem;
    max-width: 520px;
    line-height: 1.6;
  }
  .scroll-indicator {
    margin-top: 2rem;
    color: rgba(201,168,76,0.5);
    font-size: 0.75rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    animation: bounce 2s ease-in-out infinite;
    text-decoration: none;
  }
  @keyframes bounce {
    0%, 100% { transform: translateY(0); opacity: 0.5; }
    50% { transform: translateY(8px); opacity: 0.9; }
  }
  .products {
    padding: 6rem 2rem 8rem;
    max-width: 1280px;
    margin: 0 auto;
  }
  .products-header { text-align: center; margin-bottom: 5rem; }
  .section-label {
    color: #c9a84c;
    font-size: 0.8rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    font-weight: 600;
    margin-bottom: 1rem;
  }
  .products h2 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(2rem, 4vw, 3rem);
    font-weight: 800;
    color: #f0ebe0;
    letter-spacing: -0.02em;
    line-height: 1.1;
  }
  .products-subtitle {
    color: #8a8578;
    font-size: 1.125rem;
    margin-top: 1rem;
    max-width: 540px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.6;
  }
  .product-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }
  .product-card {
    background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
    border: 1px solid rgba(201,168,76,0.12);
    border-radius: 16px;
    padding: 2.5rem 2rem;
    text-decoration: none;
    color: inherit;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
  }
  .product-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #c9a84c, transparent);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .product-card:hover {
    border-color: rgba(201,168,76,0.35);
    transform: translateY(-4px);
    background: linear-gradient(180deg, rgba(201,168,76,0.04) 0%, rgba(201,168,76,0.01) 100%);
    box-shadow: 0 24px 48px rgba(0,0,0,0.3);
  }
  .product-card:hover::before { opacity: 1; }
  .card-number {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 4rem;
    font-weight: 800;
    color: rgba(201,168,76,0.15);
    line-height: 1;
    margin-bottom: 0.5rem;
    letter-spacing: -0.05em;
  }
  .card-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.75rem;
    font-weight: 800;
    color: #f0ebe0;
    margin-bottom: 0.5rem;
    letter-spacing: -0.01em;
  }
  .card-tagline {
    color: #c9a84c;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-bottom: 1.5rem;
  }
  .card-description {
    color: #8a8578;
    font-size: 0.95rem;
    line-height: 1.6;
    margin-bottom: 2rem;
    flex: 1;
  }
  .card-link {
    display: inline-flex;
    align-items: center;
    gap: 0.625rem;
    color: #c9a84c;
    font-weight: 600;
    font-size: 0.875rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    padding-top: 1rem;
    border-top: 1px solid rgba(201,168,76,0.15);
    transition: all 0.2s ease;
  }
  .product-card:hover .card-link { color: #e2c873; gap: 0.875rem; }
  .card-link svg { width: 16px; height: 16px; }
  .card-link.disabled { color: #5a5548; pointer-events: none; font-weight: 500; letter-spacing: 0.1em; }
  .landing-footer {
    padding: 3rem 2rem;
    text-align: center;
    border-top: 1px solid rgba(201,168,76,0.08);
  }
  .footer-brand {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.125rem;
    font-weight: 800;
    color: #f0ebe0;
    margin-bottom: 0.5rem;
  }
  .footer-copy { color: #3d3a34; font-size: 0.75rem; }
  @media (max-width: 640px) {
    .logo { width: 140px; height: 140px; }
    .products { padding: 4rem 1.25rem 5rem; }
    .products-header { margin-bottom: 3rem; }
    .product-card { padding: 2rem 1.5rem; }
    .card-number { font-size: 3rem; }
    .card-title { font-size: 1.5rem; }
  }
`;
