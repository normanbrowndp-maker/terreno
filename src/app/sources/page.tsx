import Link from "next/link";
import { getItalyCatalog } from "@/modules/catalog/server";
export const metadata = { title: "Sources & photograph credits" };
export default async function SourcesPage() {
  const catalog = await getItalyCatalog();
  const photos = [...catalog.cities, ...catalog.places].flatMap((record) =>
    record.photo ? [record.photo] : [],
  );
  return (
    <main id="main-content" className="sources-page">
      <p className="micro accent">Curated, with care</p>
      <h1>
        Good places.
        <br />
        Clear sources.
      </h1>
      <p className="sources-intro">
        This is an editorial preview of terreno: 48 confirmed Italian cities and
        12 independently checked places. It is a separate sample collection, not
        a complete or live visitor directory.
      </p>
      <section>
        <h2>What you can rely on</h2>
        <p>
          Names and coordinates were checked against Wikidata on 18 November
          2026. Place descriptions were written from the factual sources linked
          below. Hours, prices and live opening status have not been
          independently verified: always check the official website before
          visiting.
        </p>
        <p>
          Saved places belong to this browser on this device. There is no
          account, cloud sync or permanent travel history. Clearing browser data
          removes the saved list.
        </p>
        <p>
          The geographic overview supports selection, zoom and pan. Italy’s
          outline is real Natural Earth data. City maps use selected
          OpenStreetMap street/building snapshots where available; they are not
          complete navigation maps. No routes or walking times are calculated.
        </p>
        <p className="micro">
          Collection: {catalog.dataset}
          <br />
          Current source:{" "}
          {catalog.backend === "postgres"
            ? "Owned local PostgreSQL/PostGIS demo collection"
            : "Bundled verified offline collection"}
          <br />
          {catalog.backend === "bundled"
            ? `Database availability: ${catalog.availability}`
            : "Production data is separate."}
        </p>
      </section>
      <section>
        <h2>The city index</h2>
        <p>
          All 48 names and their 19 region groupings are present in the supplied
          design. The list includes no invented city to reach the count.
        </p>
        <ul className="city-source-list">
          {catalog.cities.map((city) => (
            <li key={city.id}>
              <Link href={`/cities/${city.slug}`}>{city.name}</Link>
              <span>
                {city.region} · {city.latitude.toFixed(5)},{" "}
                {city.longitude.toFixed(5)}
              </span>
              <a href={city.sources[0]!.url} target="_blank" rel="noreferrer">
                Wikidata ↗
              </a>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>The places</h2>
        {catalog.places.map((place) => (
          <article className="source-record" key={place.id}>
            <h3>
              <Link href={`/places/${place.slug}`}>{place.name}</Link>
            </h3>
            <p>
              {place.address ??
                catalog.cities.find((city) => city.slug === place.citySlug)
                  ?.name}{" "}
              · {place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}
            </p>
            <p>Checked {place.verifiedAt}</p>
            <ul>
              {place.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.name} ↗
                  </a>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
      <section>
        <h2>Photographs & attribution</h2>
        <p>
          All photographs below depict the named city or attraction. They are
          downloaded Wikimedia Commons photographs, not generated images.
          Displayed with an editorial crop; each retains its own reuse
          conditions. Unavailable imagery is replaced by a labelled neutral
          placeholder.
        </p>
        {photos.map((photo) => (
          <article
            id={photo.src.split("/").pop()?.replace(".jpg", "")}
            className="source-record photo-source-record"
            key={photo.src}
          >
            <h3>{photo.depicts}</h3>
            <p>{photo.attribution}</p>
            <p>
              <a href={photo.sourceUrl} target="_blank" rel="noreferrer">
                Original Commons file page ↗
              </a>{" "}
              ·{" "}
              <a href={photo.licenseUrl} target="_blank" rel="noreferrer">
                {photo.license} ↗
              </a>{" "}
              · <a href={photo.src}>Local image</a>
            </p>
          </article>
        ))}
      </section>
      <section>
        <h2>Geographic data & typography</h2>
        <p>
          <a
            href="https://www.naturalearthdata.com/about/terms-of-use/"
            target="_blank"
            rel="noreferrer"
          >
            Natural Earth
          </a>{" "}
          country boundary: public domain, 1:110m scale. City coordinates:
          Wikidata contributors,{" "}
          <a
            href="https://creativecommons.org/publicdomain/zero/1.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC0
          </a>
          . Selected city street/building data:{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            © OpenStreetMap contributors
          </a>
          ,{" "}
          <a
            href="https://opendatacommons.org/licenses/odbl/1-0/"
            target="_blank"
            rel="noreferrer"
          >
            ODbL1.0
          </a>
          , snapshot18 November2026. Data files include their source and license
          metadata.
        </p>
        <p>
          Local fonts: Playfair Display (a visual approximation of the unnamed
          serif in the PDF), Inter and JetBrains Mono.{" "}
          <a href="/fonts/playfair-OFL.txt">Playfair license</a> ·{" "}
          <a href="/fonts/inter-OFL.txt">Inter license</a> ·{" "}
          <a href="/fonts/jetbrains-OFL.txt">JetBrains Mono license</a>.
        </p>
      </section>
      <Link className="button primary" href="/">
        Back to the map →
      </Link>
    </main>
  );
}
