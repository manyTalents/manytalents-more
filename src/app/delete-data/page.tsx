export const metadata = {
  title: "Delete Your Data — ManyTalents Prep",
};

export default function DeleteData() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif", color: "#e2e2e2", lineHeight: 1.7 }}>
      <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Delete Your Data</h1>
      <p style={{ color: "#999", marginBottom: "2rem" }}>ManyTalents Prep — Data Deletion Request</p>

      <h2>How to Request Data Deletion</h2>
      <p>
        To request deletion of your account and associated data, send an email to{" "}
        <a href="mailto:wit@manytalentsmore.com?subject=Data%20Deletion%20Request%20-%20ManyTalents%20Prep" style={{ color: "#7c3aed" }}>
          wit@manytalentsmore.com
        </a>{" "}
        with the subject line <strong>&quot;Data Deletion Request&quot;</strong>.
      </p>
      <p>Please include the email address associated with your ManyTalents Prep account.</p>

      <h2>What Gets Deleted</h2>
      <ul>
        <li>Your account and login credentials</li>
        <li>Quiz scores and flashcard progress</li>
        <li>Study preferences and settings</li>
      </ul>

      <h2>What We Retain</h2>
      <ul>
        <li>Payment transaction records (required by law for tax/accounting purposes) — these are stored by Stripe, not in our app</li>
      </ul>

      <h2>Timeline</h2>
      <p>
        Data deletion requests are processed within <strong>30 days</strong>. You will receive a confirmation
        email once your data has been deleted.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Email us at{" "}
        <a href="mailto:wit@manytalentsmore.com" style={{ color: "#7c3aed" }}>wit@manytalentsmore.com</a>.
      </p>
    </main>
  );
}
