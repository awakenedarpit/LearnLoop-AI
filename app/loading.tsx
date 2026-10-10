export default function Loading() {
  return <main className="dashboard-column" aria-busy="true" aria-live="polite" aria-label="Loading LearnLoop page">
    <div className="skeleton" style={{ height: 42, maxWidth: 420 }} />
    <div className="skeleton" style={{ height: 210 }} />
    <div className="skeleton" style={{ height: 128 }} />
  </main>;
}
