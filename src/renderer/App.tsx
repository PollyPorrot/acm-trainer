const navItems = ["Today", "Contest Reminders", "VP Contests", "Reviews", "Image Wall", "Settings"];

export function App() {
  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand">ACM Trainer</div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <button className="nav-item" type="button" key={item}>
              {item}
            </button>
          ))}
        </nav>
      </aside>
      <section className="content-area" aria-labelledby="page-title">
        <p className="eyebrow">Desktop training assistant</p>
        <h1 id="page-title">ACM Trainer</h1>
        <p className="placeholder">Project scaffold ready for the app modules.</p>
      </section>
    </main>
  );
}
