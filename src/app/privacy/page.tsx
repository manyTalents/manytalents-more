export const metadata = {
  title: "Privacy Policy — ManyTalents Prep",
};

export default function PrivacyPolicy() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif", color: "#e2e2e2", lineHeight: 1.7 }}>
      <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Privacy Policy</h1>
      <p style={{ color: "#999", marginBottom: "2rem" }}>Effective Date: May 18, 2026</p>

      <p>
        ManyTalents Prep (&quot;the App&quot;) is operated by ManyTalentMore.com (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;).
        This policy describes how we collect, use, and protect your information.
      </p>

      <h2>Information We Collect</h2>
      <ul>
        <li><strong>Account information:</strong> email address when you create an account via Supabase authentication.</li>
        <li><strong>Usage data:</strong> quiz scores, flashcard progress, and study preferences stored locally on your device and in our database to track your learning.</li>
        <li><strong>Payment information:</strong> if you subscribe to premium features, payment is processed by Stripe and RevenueCat. We do not store your credit card details.</li>
      </ul>

      <h2>How We Use Your Information</h2>
      <ul>
        <li>To provide and improve the App&apos;s study features</li>
        <li>To track your learning progress across sessions</li>
        <li>To process premium subscriptions</li>
        <li>To communicate important updates about the App</li>
      </ul>

      <h2>Data Sharing</h2>
      <p>
        We do not sell your personal information. We share data only with:
      </p>
      <ul>
        <li><strong>Supabase</strong> — authentication and database hosting</li>
        <li><strong>Stripe / RevenueCat</strong> — payment processing</li>
      </ul>

      <h2>Data Storage and Security</h2>
      <p>
        Your data is stored securely using Supabase (hosted on AWS). We use industry-standard encryption
        and access controls to protect your information.
      </p>

      <h2>Your Rights</h2>
      <p>
        You may request deletion of your account and associated data at any time by contacting us
        at <a href="mailto:wit@manytalentsmore.com" style={{ color: "#7c3aed" }}>wit@manytalentsmore.com</a>.
      </p>

      <h2>Children&apos;s Privacy</h2>
      <p>
        The App is not directed at children under 13. We do not knowingly collect personal information
        from children under 13.
      </p>

      <h2>Changes to This Policy</h2>
      <p>
        We may update this policy from time to time. Changes will be posted on this page with an updated effective date.
      </p>

      <h2>Contact Us</h2>
      <p>
        If you have questions about this privacy policy, contact us at{" "}
        <a href="mailto:wit@manytalentsmore.com" style={{ color: "#7c3aed" }}>wit@manytalentsmore.com</a>.
      </p>
    </main>
  );
}
