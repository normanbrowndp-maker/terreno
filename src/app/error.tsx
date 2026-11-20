"use client";

export default function Error({ retry }: { retry: () => void }) {
  return (
    <main id="main-content" className="route-state">
      <h1>This page couldn’t open.</h1>
      <p role="alert">Try loading the guide again.</p>
      <button type="button" className="button primary" onClick={retry}>Try again</button>
    </main>
  );
}
