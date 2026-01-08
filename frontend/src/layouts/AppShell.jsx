import "../styles/app-shell.css";

export default function AppShell({
  header,
  bottomNav,
  children,
  className = "",
  mainClassName = "",
  style = {},
}) {
  return (
    <div className={`app-shell ${className}`.trim()} style={style}>
      {header ? <div className="app-shell__header">{header}</div> : null}
      <main className={`app-shell__main ${mainClassName}`.trim()}>
        {children}
      </main>
      {bottomNav ? <div className="app-shell__bottom">{bottomNav}</div> : null}
    </div>
  );
}
