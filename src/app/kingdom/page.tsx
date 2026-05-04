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
          <div className="k-section-label">Supporting</div>
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
            We believe that multiplying talents isn&apos;t just about business
            &mdash; it&apos;s about advancing the Kingdom. Here you&apos;ll find
            missionaries and causes we&apos;re honored to support.
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

        <div className="k-cause-body">
          <div className="k-story">
            <div className="k-photos">
              <Image
                src="/kingdom/mission-letter.jpg"
                alt="Jonathan Uncapher's mission letter from Cameroon"
                width={560}
                height={400}
                className="k-photo"
              />
            </div>

            <div className="k-narrative">
              <p>
                Jonathan Uncapher is a full-time missionary in the village of
                Nomedjoh, Cameroon. He serves as Director of Development for the
                mission, facilitating and directing the construction of a new
                hospital campus, a high school and technical school, and working
                to develop a local economy to make the mission self-supporting
                within five years.
              </p>
              <p>
                For many years, Jonathan was a pastor of a small church in
                Alabama and operated a home construction company. He made many
                trips to Cameroon, trying to accomplish from a distance what he
                now does in person. After the sudden passing of his wife, the
                Lord made it clear that he was to go out as a full-time
                missionary.
              </p>
              <p>
                In the village, the Lord provided him a house, a wife &mdash; a
                fellow missionary and director of the hospital laboratory
                &mdash; and an adopted family.
              </p>
            </div>
          </div>

          {/* ── Needs ── */}
          <div className="k-needs">
            <h3>Current Needs</h3>
            <div className="k-needs-grid">
              <div className="k-need-card">
                <div className="k-need-amount">$12,000</div>
                <p>
                  To complete the walls and floors of the 5,000 sq ft hospital
                  building, currently at a standstill due to lack of funds.
                </p>
              </div>
              <div className="k-need-card">
                <div className="k-need-amount">$7,500</div>
                <p>
                  To release a shipping container stuck in the port of Kribi,
                  Cameroon &mdash; loaded with a track loader, tools, supplies,
                  and x-ray machines essential for the hospital. Import taxes
                  must be paid before release.
                </p>
              </div>
            </div>
          </div>

          {/* ── Giving Methods ── */}
          <div className="k-giving">
            <h3>Ways to Give</h3>
            <div className="k-giving-grid">
              <div className="k-give-card">
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
                <p>@JonathanUncapher1957</p>
              </div>
              <div className="k-give-card">
                <div className="k-give-method">PayPal</div>
                <p>jonathan.uncapher@gmail.com</p>
              </div>
              <div className="k-give-card">
                <div className="k-give-method">Direct Transfer</div>
                <p>
                  To Jonathan&apos;s phone account in Cameroon via money transfer
                  platforms:
                  <br />
                  <strong>237-682-732-018</strong>
                </p>
              </div>
            </div>
            <p className="k-give-note">
              If you give via Venmo, PayPal, or direct transfer, please text or
              message Jonathan so he knows who sent it and how it should be used.
            </p>
          </div>

          {/* ── Follow ── */}
          <div className="k-follow">
            <h3>Follow the Mission</h3>
            <p>
              Jonathan shares daily updates on Facebook. Search{" "}
              <strong>Jonathan Uncapher</strong> to follow along with the
              mission&apos;s progress.
            </p>
          </div>
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
    min-height: 60vh;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 6rem 2rem 4rem;
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
    max-width: 680px;
  }
  .k-section-label {
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
    max-width: 540px;
    margin: 0 auto;
  }

  /* ── Cause Section ── */
  .k-cause {
    max-width: 960px;
    margin: 0 auto;
    padding: 4rem 2rem 6rem;
  }
  .k-cause-header {
    text-align: center;
    margin-bottom: 3rem;
  }
  .k-cause-number {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 5rem;
    font-weight: 800;
    color: rgba(201,168,76,0.12);
    line-height: 1;
    margin-bottom: 0.5rem;
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

  /* ── Story ── */
  .k-story {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3rem;
    align-items: start;
    margin-bottom: 4rem;
  }
  .k-photo {
    width: 100%;
    height: auto;
    border-radius: 12px;
    border: 1px solid rgba(201,168,76,0.15);
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  }
  .k-narrative p {
    color: #a09a8e;
    font-size: 0.95rem;
    line-height: 1.75;
    margin-bottom: 1.25rem;
  }

  /* ── Needs ── */
  .k-needs { margin-bottom: 4rem; }
  .k-needs h3, .k-giving h3, .k-follow h3 {
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
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
  }
  .k-need-amount {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 2.5rem;
    font-weight: 800;
    background: linear-gradient(135deg, #c9a84c, #e2c873);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 1rem;
  }
  .k-need-card p {
    color: #8a8578;
    font-size: 0.9rem;
    line-height: 1.65;
  }

  /* ── Giving ── */
  .k-giving { margin-bottom: 4rem; }
  .k-giving-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.25rem;
  }
  .k-give-card {
    background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
    border: 1px solid rgba(201,168,76,0.12);
    border-radius: 12px;
    padding: 1.75rem 1.5rem;
    text-align: center;
  }
  .k-give-method {
    color: #c9a84c;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-bottom: 0.75rem;
  }
  .k-give-card p {
    color: #a09a8e;
    font-size: 0.9rem;
    line-height: 1.6;
  }
  .k-tax-note {
    display: inline-block;
    margin-top: 0.75rem;
    color: #5db56e;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    border: 1px solid rgba(93,181,110,0.3);
    border-radius: 100px;
    padding: 0.25rem 0.75rem;
  }
  .k-give-note {
    text-align: center;
    color: #6a6560;
    font-size: 0.8rem;
    margin-top: 1.25rem;
    line-height: 1.6;
  }

  /* ── Follow ── */
  .k-follow {
    text-align: center;
    margin-bottom: 2rem;
  }
  .k-follow p {
    color: #8a8578;
    font-size: 0.95rem;
    line-height: 1.6;
  }

  /* ── Contact ── */
  .k-contact {
    max-width: 600px;
    margin: 0 auto;
    padding: 4rem 2rem 6rem;
    text-align: center;
  }
  .k-contact h2 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(1.5rem, 3vw, 2.25rem);
    font-weight: 800;
    color: #f0ebe0;
    margin-bottom: 1rem;
  }
  .k-contact-sub {
    color: #8a8578;
    font-size: 0.95rem;
    line-height: 1.6;
    margin-bottom: 2rem;
  }
  .k-contact-form {
    display: flex;
    gap: 0.75rem;
    max-width: 440px;
    margin: 0 auto;
  }
  .k-email-input {
    flex: 1;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(201,168,76,0.2);
    border-radius: 8px;
    padding: 0.75rem 1rem;
    color: #f0ebe0;
    font-size: 0.9rem;
    outline: none;
    transition: border-color 0.2s;
  }
  .k-email-input::placeholder { color: #5a5548; }
  .k-email-input:focus { border-color: #c9a84c; }
  .k-submit-btn {
    background: linear-gradient(135deg, #c9a84c, #b8943e);
    color: #1a1814;
    border: none;
    border-radius: 8px;
    padding: 0.75rem 1.5rem;
    font-weight: 700;
    font-size: 0.85rem;
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

  /* ── Footer (same as landing) ── */
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
    .k-story { grid-template-columns: 1fr; }
    .k-needs-grid { grid-template-columns: 1fr; }
    .k-contact-form { flex-direction: column; }
    .k-cause { padding: 3rem 1.25rem 4rem; }
    .k-hero { padding: 4rem 1.25rem 3rem; min-height: 50vh; }
  }
`;
