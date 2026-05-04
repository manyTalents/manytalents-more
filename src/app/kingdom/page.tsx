/**
 * /kingdom — Supporting God's Kingdom
 * Broader page for featuring mission causes. Jonathan Uncapher (Cameroon) is the first.
 */

import Image from "next/image";

export const metadata = {
  title: "Supporting God's Kingdom — ManyTalents More",
  description:
    "Support missionaries and Kingdom-building work around the world. Give, pray, and connect.",
};

export default function KingdomPage() {
  return (
    <>
      <style>{KINGDOM_CSS}</style>

      {/* ── Hero ── */}
      <section className="k-hero">
        <div className="k-hero-content">
          <div className="k-label">Supporting</div>
          <h1>
            God&apos;s <span className="gold">Kingdom</span>
          </h1>
          <p className="k-tagline">
            &ldquo;Well done, good and faithful servant. You were faithful over
            a few things; I will set you over many things.&rdquo;
            <br />
            <span className="k-verse">&mdash; Matthew 25:23</span>
          </p>
          <p className="k-intro">
            Multiplying talents was never just about business. These are the
            people on the ground doing the work &mdash; building hospitals,
            teaching trades, serving the least of these. Here&apos;s how you can
            help.
          </p>
        </div>
      </section>

      {/* ── Jonathan Uncapher — Cameroon Mission ── */}
      <section className="k-cause" id="cameroon">
        <div className="k-cause-header">
          <div className="k-cause-number">01</div>
          <h2>
            Jonathan <span className="gold">Uncapher</span>
          </h2>
          <p className="k-cause-location">Nomedjoh, Cameroon, Africa</p>
        </div>

        {/* ── Pull Quote ── */}
        <blockquote className="k-pullquote">
          &ldquo;The Gospel is free, but sharing it costs a lot of
          money.&rdquo;
        </blockquote>

        {/* ── Story ── */}
        <div className="k-story">
          <div className="k-chapter">
            <div className="k-chapter-label">The Calling</div>
            <p>
              For years Jonathan pastored a small church in Alabama and ran a
              home construction company. He made trip after trip to Cameroon,
              trying to build a mission from 5,000 miles away. Progress was
              slow.
            </p>
            <p>
              Then his wife &mdash; who seemed to be in excellent health &mdash;
              suddenly died. In his grief and aloneness, the Lord made it
              unmistakably clear: go. Full-time. No more half measures.
            </p>
            <p className="k-accent-text">
              After a period of struggle, he went.
            </p>
          </div>

          <div className="k-chapter">
            <div className="k-chapter-label">The Mission</div>
            <p>
              Jonathan is now Director of Development in Nomedjoh, Cameroon.
              His job: build a hospital campus, a high school and technical
              school, and develop a local economy to make the mission
              self-supporting within five years.
            </p>
            <p>
              The Lord provided him a house, a wife &mdash; a fellow missionary
              who directs the hospital laboratory &mdash; and an adopted family.
              She is, in his words, &ldquo;a beautiful and wonderful woman of
              great faith.&rdquo;
            </p>
          </div>
        </div>

        {/* ── Photo ── */}
        <div className="k-photo-strip">
          <Image
            src="/kingdom/mission-letter.jpg"
            alt="Jonathan Uncapher's mission in Cameroon — letter with photos of the village and family"
            width={800}
            height={500}
            className="k-photo"
          />
          <p className="k-photo-caption">
            Jonathan&apos;s letter from the field &mdash; with photos of the
            village and his family in Cameroon.
          </p>
        </div>

        {/* ── Needs ── */}
        <div className="k-needs">
          <h3>What&apos;s Needed Right Now</h3>
          <div className="k-needs-grid">
            <div className="k-need-card">
              <div className="k-need-icon">&#9960;</div>
              <div className="k-need-amount">$12,000</div>
              <div className="k-need-title">Hospital Construction</div>
              <p>
                The 5,000 sq ft hospital building is at a standstill.
                Walls and floors need to be completed before any medical
                care can begin.
              </p>
            </div>
            <div className="k-need-card">
              <div className="k-need-icon">&#9875;</div>
              <div className="k-need-amount">$7,500</div>
              <div className="k-need-title">Shipping Container Release</div>
              <p>
                A container loaded with a track loader, tools, supplies,
                and x-ray machines is stuck in the port of Kribi, Cameroon.
                Import taxes must be paid before it can be released.
              </p>
            </div>
          </div>
        </div>

        {/* ── Giving Methods ── */}
        <div className="k-giving">
          <h3>Ways to Give</h3>
          <div className="k-giving-grid">
            <div className="k-give-card k-give-featured">
              <div className="k-give-method">By Check</div>
              <p>
                The Church at Arley
                <br />
                PO Box 498
                <br />
                Arley, AL 35541
              </p>
              <span className="k-tax-note">Tax deductible</span>
            </div>
            <div className="k-give-card">
              <div className="k-give-method">Venmo</div>
              <p className="k-give-handle">@JonathanUncapher1957</p>
            </div>
            <div className="k-give-card">
              <div className="k-give-method">PayPal</div>
              <p className="k-give-handle">jonathan.uncapher@gmail.com</p>
            </div>
            <div className="k-give-card">
              <div className="k-give-method">Direct Transfer</div>
              <p>
                Phone account in Cameroon via money transfer platforms:
              </p>
              <p className="k-give-handle">237-682-732-018</p>
            </div>
          </div>
          <p className="k-give-note">
            If you give via Venmo, PayPal, or direct transfer, please message
            Jonathan so he knows who sent it and how it should be used.
          </p>
        </div>

        {/* ── Jonathan's Ask ── */}
        <blockquote className="k-pullquote k-pullquote-closing">
          &ldquo;Simple enough. Just do whatever the Lord puts on your heart.
          Pray for this cause with authority. Tell others about this wonderful
          opportunity to help Our Lord&apos;s impoverished servants. Give to
          this mission yourself as He impresses it upon your heart.&rdquo;
          <cite>&mdash; Jonathan Uncapher</cite>
        </blockquote>

        {/* ── Follow ── */}
        <div className="k-follow">
          <p>
            Jonathan shares daily updates on{" "}
            <strong>Facebook</strong> &mdash; search{" "}
            <strong>Jonathan Uncapher</strong> to follow the mission&apos;s
            progress from the field.
          </p>
        </div>
      </section>

      {/* ── Contact / Email ── */}
      <section className="k-contact" id="contact">
        <h2>
          Want to <span className="gold">Connect</span>?
        </h2>
        <p className="k-contact-sub">
          Leave your email and we&apos;ll put you in touch with Jonathan or
          share updates about Kingdom-building opportunities.
        </p>
        <form
          className="k-contact-form"
          action={`mailto:jonathan.uncapher@gmail.com?subject=${encodeURIComponent("Kingdom Support Inquiry — ManyTalents More")}`}
          method="GET"
        >
          <input
            type="email"
            name="body"
            placeholder="your@email.com"
            required
            className="k-email-input"
          />
          <button type="submit" className="k-submit-btn">
            Reach Out
          </button>
        </form>
      </section>

      {/* ── Footer ── */}
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

const KINGDOM_CSS = `
  /* ── Base ── */
  .k-hero, .k-cause, .k-contact, .landing-footer {
    font-family: 'Inter', -apple-system, sans-serif;
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

  /* ── Hero ── */
  .k-hero {
    min-height: 55vh;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 6rem 2rem 3rem;
    position: relative;
  }
  .k-hero::before {
    content: '';
    position: absolute;
    width: 700px; height: 700px;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    background: radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%);
    pointer-events: none;
  }
  .k-hero-content {
    position: relative; z-index: 1;
    max-width: 640px;
  }
  .k-label {
    color: #c9a84c;
    font-size: 0.8rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    font-weight: 600;
    margin-bottom: 0.75rem;
  }
  .k-hero h1 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(2.5rem, 6vw, 4rem);
    font-weight: 800;
    color: #f0ebe0;
    letter-spacing: -0.02em;
    margin-bottom: 1.5rem;
  }
  .k-tagline {
    color: #8a8578;
    font-size: 1.1rem;
    line-height: 1.7;
    font-style: italic;
    margin-bottom: 1.5rem;
  }
  .k-verse {
    font-style: normal;
    font-size: 0.9rem;
    color: #c9a84c;
  }
  .k-intro {
    color: #a09a8e;
    font-size: 1rem;
    line-height: 1.7;
    max-width: 520px;
    margin: 0 auto;
  }

  /* ── Cause Section ── */
  .k-cause {
    max-width: 880px;
    margin: 0 auto;
    padding: 2rem 2rem 4rem;
  }
  .k-cause-header {
    text-align: center;
    margin-bottom: 2.5rem;
  }
  .k-cause-number {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 5rem;
    font-weight: 800;
    color: rgba(201,168,76,0.1);
    line-height: 1;
    margin-bottom: 0.25rem;
  }
  .k-cause-header h2 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(1.75rem, 4vw, 2.75rem);
    font-weight: 800;
    color: #f0ebe0;
    letter-spacing: -0.02em;
  }
  .k-cause-location {
    color: #c9a84c;
    font-size: 0.8rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    font-weight: 600;
    margin-top: 0.5rem;
  }

  /* ── Pull Quote ── */
  .k-pullquote {
    text-align: center;
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(1.25rem, 2.5vw, 1.6rem);
    font-weight: 700;
    font-style: italic;
    color: #c9a84c;
    max-width: 600px;
    margin: 0 auto 3rem;
    padding: 1.5rem 0;
    border-top: 1px solid rgba(201,168,76,0.15);
    border-bottom: 1px solid rgba(201,168,76,0.15);
    line-height: 1.5;
  }
  .k-pullquote-closing {
    margin-top: 4rem;
    font-size: clamp(1rem, 2vw, 1.2rem);
    color: #a09a8e;
    padding: 2rem 2.5rem;
    background: linear-gradient(180deg, rgba(201,168,76,0.04) 0%, transparent 100%);
    border-radius: 12px;
    border: 1px solid rgba(201,168,76,0.1);
    max-width: 700px;
  }
  .k-pullquote-closing cite {
    display: block;
    margin-top: 1rem;
    font-style: normal;
    font-family: 'Inter', sans-serif;
    font-size: 0.8rem;
    font-weight: 600;
    color: #c9a84c;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  /* ── Story Chapters ── */
  .k-story {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3rem;
    margin-bottom: 3rem;
  }
  .k-chapter {
    padding: 2rem;
    background: linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 100%);
    border: 1px solid rgba(201,168,76,0.08);
    border-radius: 14px;
  }
  .k-chapter-label {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 0.7rem;
    font-weight: 700;
    color: #c9a84c;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    margin-bottom: 1.25rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(201,168,76,0.1);
  }
  .k-chapter p {
    color: #a09a8e;
    font-size: 0.925rem;
    line-height: 1.75;
    margin-bottom: 1rem;
  }
  .k-chapter p:last-child { margin-bottom: 0; }
  .k-accent-text {
    color: #c9a84c !important;
    font-style: italic;
    font-weight: 500;
  }

  /* ── Photo Strip ── */
  .k-photo-strip {
    margin-bottom: 4rem;
    text-align: center;
  }
  .k-photo {
    width: 100%;
    max-width: 700px;
    height: auto;
    border-radius: 14px;
    border: 1px solid rgba(201,168,76,0.12);
    box-shadow: 0 12px 40px rgba(0,0,0,0.35);
  }
  .k-photo-caption {
    color: #5a5548;
    font-size: 0.8rem;
    margin-top: 1rem;
    font-style: italic;
  }

  /* ── Needs ── */
  .k-needs { margin-bottom: 4rem; }
  .k-needs h3, .k-giving h3 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.5rem;
    font-weight: 800;
    color: #f0ebe0;
    margin-bottom: 1.5rem;
    text-align: center;
  }
  .k-needs-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }
  .k-need-card {
    background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
    border: 1px solid rgba(201,168,76,0.12);
    border-radius: 14px;
    padding: 2rem 1.75rem;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .k-need-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, transparent, #c9a84c, transparent);
    opacity: 0.4;
  }
  .k-need-icon {
    font-size: 1.75rem;
    margin-bottom: 0.75rem;
    opacity: 0.7;
  }
  .k-need-amount {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 2.75rem;
    font-weight: 800;
    background: linear-gradient(135deg, #c9a84c, #e2c873);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0.5rem;
    line-height: 1;
  }
  .k-need-title {
    color: #f0ebe0;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 1rem;
  }
  .k-need-card p {
    color: #8a8578;
    font-size: 0.875rem;
    line-height: 1.65;
  }

  /* ── Giving ── */
  .k-giving { margin-bottom: 3rem; }
  .k-giving-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }
  .k-give-card {
    background: linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 100%);
    border: 1px solid rgba(201,168,76,0.1);
    border-radius: 12px;
    padding: 1.5rem 1.25rem;
    text-align: center;
    transition: border-color 0.2s;
  }
  .k-give-card:hover {
    border-color: rgba(201,168,76,0.3);
  }
  .k-give-featured {
    border-color: rgba(93,181,110,0.25);
  }
  .k-give-method {
    color: #c9a84c;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(201,168,76,0.08);
  }
  .k-give-card p {
    color: #a09a8e;
    font-size: 0.85rem;
    line-height: 1.55;
  }
  .k-give-handle {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 0.8rem !important;
    color: #c9a84c !important;
    word-break: break-all;
  }
  .k-tax-note {
    display: inline-block;
    margin-top: 0.75rem;
    color: #5db56e;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    border: 1px solid rgba(93,181,110,0.3);
    border-radius: 100px;
    padding: 0.2rem 0.6rem;
  }
  .k-give-note {
    text-align: center;
    color: #5a5548;
    font-size: 0.78rem;
    margin-top: 1.25rem;
    line-height: 1.5;
  }

  /* ── Follow ── */
  .k-follow {
    text-align: center;
    padding: 1.5rem 0 2rem;
  }
  .k-follow p {
    color: #6a6560;
    font-size: 0.9rem;
    line-height: 1.6;
  }
  .k-follow strong {
    color: #a09a8e;
  }

  /* ── Contact ── */
  .k-contact {
    max-width: 560px;
    margin: 0 auto;
    padding: 3rem 2rem 5rem;
    text-align: center;
    border-top: 1px solid rgba(201,168,76,0.06);
  }
  .k-contact h2 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(1.5rem, 3vw, 2rem);
    font-weight: 800;
    color: #f0ebe0;
    margin-bottom: 0.75rem;
  }
  .k-contact-sub {
    color: #8a8578;
    font-size: 0.9rem;
    line-height: 1.6;
    margin-bottom: 1.75rem;
  }
  .k-contact-form {
    display: flex;
    gap: 0.75rem;
    max-width: 420px;
    margin: 0 auto;
  }
  .k-email-input {
    flex: 1;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(201,168,76,0.18);
    border-radius: 8px;
    padding: 0.7rem 1rem;
    color: #f0ebe0;
    font-size: 0.9rem;
    outline: none;
    transition: border-color 0.2s;
  }
  .k-email-input::placeholder { color: #4a4540; }
  .k-email-input:focus { border-color: #c9a84c; }
  .k-submit-btn {
    background: linear-gradient(135deg, #c9a84c, #b8943e);
    color: #1a1814;
    border: none;
    border-radius: 8px;
    padding: 0.7rem 1.5rem;
    font-weight: 700;
    font-size: 0.8rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }
  .k-submit-btn:hover {
    background: linear-gradient(135deg, #e2c873, #c9a84c);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(201,168,76,0.3);
  }

  /* ── Footer ── */
  .landing-footer {
    padding: 3rem 2rem;
    text-align: center;
    border-top: 1px solid rgba(201,168,76,0.08);
    font-family: 'Inter', -apple-system, sans-serif;
  }
  .footer-brand {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.125rem;
    font-weight: 800;
    color: #f0ebe0;
    margin-bottom: 0.5rem;
  }
  .footer-copy { color: #3d3a34; font-size: 0.75rem; }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .k-story { grid-template-columns: 1fr; gap: 1.5rem; }
    .k-needs-grid { grid-template-columns: 1fr; }
    .k-giving-grid { grid-template-columns: 1fr 1fr; }
    .k-contact-form { flex-direction: column; }
    .k-cause { padding: 2rem 1.25rem 3rem; }
    .k-hero { padding: 4rem 1.25rem 2rem; min-height: 45vh; }
    .k-pullquote { font-size: 1.15rem; padding: 1.25rem 1rem; }
    .k-pullquote-closing { padding: 1.5rem; }
    .k-chapter { padding: 1.5rem; }
  }
  @media (max-width: 480px) {
    .k-giving-grid { grid-template-columns: 1fr; }
  }
`;
