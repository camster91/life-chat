import { createShellNavigation, isMobilePrimaryRoute } from "../lib/app-shell";
import { defaultMiniAppConfiguration } from "../lib/mini-app-registry";

const navigation = createShellNavigation(defaultMiniAppConfiguration());
const routeCopy = {
  chat: ["Chat", "Chat-first assistance will always hand important work to a reviewable proposal and a normal UI."],
  calendar: ["Calendar", "A timezone-aware household agenda will appear here after sign-in."],
  family: ["Family", "Member access is available only in an authorized household context."],
  search: ["Search", "Search results must always respect household and member visibility."],
  notifications: ["Notifications", "Notification preferences and delivery status will appear after sign-in."],
  settings: ["Settings", "Settings will explain impact and require the appropriate household permission."],
} as const;

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div className="app-shell">
        <aside className="shell-sidebar" aria-label="Life Chat navigation">
          <a className="brand" href="#today">Life Chat</a>
          <div className="context-card" aria-label="Current household context">
            <span className="eyebrow">Current space</span>
            <strong>Sign in to choose a household</strong>
            <p>No household or member is inferred from this preview.</p>
          </div>
          <nav aria-label="Primary navigation">
            <ul className="shell-navigation">
              {navigation.map((item) => <li key={item.route}>
                {item.available ? <a aria-current={item.route === "today" ? "page" : undefined} href={`#${item.route}`}>{item.label}</a> : <span aria-disabled="true">{item.label}<small>Enable an app after sign-in</small></span>}
              </li>)}
            </ul>
          </nav>
          <p className="shell-note">Normal interfaces remain available alongside chat.</p>
        </aside>
        <div className="shell-workspace">
          <header className="shell-header">
            <a className="brand mobile-brand" href="#today">Life Chat</a>
            <p>Foundation preview · no household selected</p>
          </header>
          <main id="main-content" tabIndex={-1}>
          <section id="today" aria-labelledby="today-title">
            <p className="eyebrow">Today</p>
            <h1 id="today-title">A calm place to start your day</h1>
            <p>Life Chat will bring household life together while leaving each important action available in its normal interface.</p>
            <div className="shell-card empty-state">
              <h2>Sign in to see what needs attention</h2>
              <p>This prototype does not load or infer household, member, task, calendar, or message data.</p>
            </div>
          </section>
          <section id="apps" className="shell-card" aria-labelledby="apps-title">
            <h2 id="apps-title">Apps stay optional</h2>
            <p>Apps appear only after an authorized household configuration enables an eligible mini-app. This preview has none enabled.</p>
          </section>
          {Object.entries(routeCopy).map(([route, [title, description]]) => (
            <section className="shell-card" id={route} key={route} aria-labelledby={`${route}-title`}>
              <h2 id={`${route}-title`}>{title}</h2>
              <p>{description}</p>
            </section>
          ))}
          </main>
          <nav className="mobile-navigation" aria-label="Mobile primary navigation">
            <ul>
              {navigation.filter((item) => isMobilePrimaryRoute(item.route)).map((item) => <li key={item.route}>
                {item.available ? <a aria-current={item.route === "today" ? "page" : undefined} href={`#${item.route}`}>{item.label}</a> : <span aria-disabled="true">{item.label}</span>}
              </li>)}
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}
