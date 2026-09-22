import './App.css'

function App() {
  return (
    <main className="app-shell">
      <section className="welcome-panel" aria-labelledby="page-title">
        <p className="eyebrow">Chess project</p>
        <h1 id="page-title">Your next game starts here.</h1>
        <p className="intro">
          The board is coming soon. This first milestone sets up the foundation
          for a focused chess experience.
        </p>
        <div className="status-pill" role="status">
          <span className="status-dot" aria-hidden="true" />
          Project ready
        </div>
      </section>
    </main>
  )
}

export default App