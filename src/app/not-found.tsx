import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main-content" className="not-found-page">
      <p className="micro accent">A different direction</p>
      <h1>This place isn’t in our guide.</h1>
      <p>Try the city index to find your way back.</p>
      <Link className="button primary" href="/cities">
        Explore the 48 cities →
      </Link>
    </main>
  );
}
