"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import {
  clampMapZoom,
  createProjection,
  italyBoundary,
  streetSnapshotCities,
  type Bounds,
  type MapPoint,
} from "@/modules/geography";
import type { City, EditorialPlace } from "@/modules/catalog";
import { EditorialPhoto } from "./photo";

type StreetFeature = {
  properties: { kind: "building" | "street" | "water"; name: string };
  geometry: {
    type: "Polygon" | "LineString";
    coordinates: number[][] | number[][][];
  };
};
type StreetSnapshot = { bbox: Bounds; features: StreetFeature[] };
const italyBounds: Bounds = [6.1, 35.2, 19, 47.5];
const labelCities = new Set([
  "torino",
  "milano",
  "venezia",
  "bologna",
  "firenze",
  "roma",
  "napoli",
  "bari",
  "cagliari",
  "palermo",
]);
function pathOf(
  points: readonly number[][],
  project: (point: MapPoint) => [number, number],
  closed = false,
) {
  return (
    points
      .filter(
        (point) =>
          point.length >= 2 && point.slice(0, 2).every(Number.isFinite),
      )
      .map((point, index) => {
        const [x, y] = project([point[0]!, point[1]!]);
        return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ") + (closed ? "Z" : "")
  );
}
export function GeographicMap({
  cities,
  city,
  places = [],
  selectedPlace,
  variant = "discovery",
  highlightCitySlug = "firenze",
}: {
  cities: readonly City[];
  city?: City;
  places?: readonly EditorialPlace[];
  selectedPlace?: EditorialPlace;
  variant?: "discovery" | "index" | "saved";
  highlightCitySlug?: string;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [streetState, setStreetState] = useState<{
    slug: string;
    data: StreetSnapshot | null;
  } | null>(null);
  const drag = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);
  const citySlug = city?.slug;
  const cityFeatured = city?.featured;
  useEffect(() => {
    if (!citySlug || !cityFeatured || !streetSnapshotCities.includes(citySlug))
      return;
    const controller = new AbortController();
    fetch(`/geodata/${citySlug}.json`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Map unavailable");
        const value = (await response.json()) as StreetSnapshot;
        if (
          !Array.isArray(value.features) ||
          value.features.length > 50000 ||
          !Array.isArray(value.bbox) ||
          value.bbox.length !== 4
        )
          throw new Error("Invalid map snapshot");
        setStreetState({ slug: citySlug, data: value });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setStreetState({ slug: citySlug, data: null });
      });
    return () => controller.abort();
  }, [citySlug, cityFeatured]);
  const streets =
    streetState && streetState.slug === citySlug ? streetState.data : null;
  const bounds = useMemo<Bounds>(() => {
    if (!city) return italyBounds;
    if (!places.length)
      return [
        city.longitude - 0.025,
        city.latitude - 0.02,
        city.longitude + 0.025,
        city.latitude + 0.02,
      ];
    const west = Math.min(...places.map((place) => place.longitude)),
      east = Math.max(...places.map((place) => place.longitude));
    const south = Math.min(...places.map((place) => place.latitude)),
      north = Math.max(...places.map((place) => place.latitude));
    const x = (west + east) / 2,
      y = (south + north) / 2;
    const halfWidth = Math.max(0.011, (east - west) * 1.15),
      halfHeight = Math.max(0.008, (north - south) * 1.15);
    return [x - halfWidth, y - halfHeight, x + halfWidth, y + halfHeight];
  }, [city, places]);
  const project = useMemo(
    () => createProjection(bounds, 1000, 900, city ? 5 : 30),
    [bounds, city],
  );
  const streetPaths = useMemo(() => {
    const result = { building: "", street: "", water: "" };
    for (const feature of streets?.features ?? []) {
      if (!["building", "street", "water"].includes(feature.properties.kind))
        continue;
      const polygon = feature.geometry.type === "Polygon";
      const points = polygon
        ? ((feature.geometry.coordinates as number[][][])[0] ?? [])
        : (feature.geometry.coordinates as number[][]);
      result[feature.properties.kind] += pathOf(points, project, polygon) + " ";
    }
    return result;
  }, [streets, project]);
  const focusCity =
    city ?? cities.find((item) => item.slug === highlightCitySlug);
  const reset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  const pointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 || (event.target as Element).closest("a")) return;
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const preview =
    selectedPlace ?? places.find((place) => place.slug === "giardino-bardini");
  return (
    <section
      className={`geographic-map ${city ? "city-map" : "italy-map"}`}
      aria-label={city ? `Map of ${city.name}` : "Map of Italy"}
    >
      {!city ? (
        <div className="map-mode">
          <span>Map</span>
          <span aria-hidden="true">/</span>
          <Link href="/cities">Index 48</Link>
        </div>
      ) : (
        <div className="map-city-note micro">
          {city.name}
          <br />
          <span>A city best met at your own pace.</span>
        </div>
      )}
      <span className="map-north micro" aria-hidden="true">
        N ↑
      </span>
      <svg
        className="map-canvas"
        data-testid="map-canvas"
        data-zoom={zoom}
        role="group"
        aria-label={
          city
            ? "Geographic places overview; use arrow keys to pan, plus and minus to zoom"
            : "Interactive map of Italy; use arrow keys to pan, plus and minus to zoom"
        }
        tabIndex={0}
        viewBox="0 0 1000 900"
        onPointerDown={pointerDown}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onPointerMove={(event) => {
          if (drag.current) {
            const scale =
              1000 / event.currentTarget.getBoundingClientRect().width;
            setPan({
              x: Math.max(
                -700,
                Math.min(
                  700,
                  drag.current.panX + (event.clientX - drag.current.x) * scale,
                ),
              ),
              y: Math.max(
                -650,
                Math.min(
                  650,
                  drag.current.panY + (event.clientY - drag.current.y) * scale,
                ),
              ),
            });
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "+" || event.key === "=") {
            event.preventDefault();
            setZoom((value) => clampMapZoom(value * 1.25));
          }
          if (event.key === "-") {
            event.preventDefault();
            setZoom((value) => clampMapZoom(value / 1.25));
          }
          if (event.key === "Home") {
            event.preventDefault();
            reset();
          }
          if (
            event.target === event.currentTarget &&
            ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
              event.key,
            )
          ) {
            event.preventDefault();
            setPan((value) => ({
              x: Math.max(
                -700,
                Math.min(
                  700,
                  value.x +
                    (event.key === "ArrowLeft"
                      ? 30
                      : event.key === "ArrowRight"
                        ? -30
                        : 0),
                ),
              ),
              y: Math.max(
                -650,
                Math.min(
                  650,
                  value.y +
                    (event.key === "ArrowUp"
                      ? 30
                      : event.key === "ArrowDown"
                        ? -30
                        : 0),
                ),
              ),
            }));
          }
        }}
      >
        <g
          transform={`translate(${500 + pan.x} ${450 + pan.y}) scale(${zoom}) translate(-500 -450)`}
        >
          {!city ? (
            <>
              {italyBoundary.features[0]!.geometry.coordinates.map(
                (polygon, index) => (
                  <path
                    key={index}
                    className="italy-land"
                    d={pathOf(polygon[0]!, project, true)}
                  />
                ),
              )}
              <text className="sea-label" x="700" y="300">
                ADRIATIC
              </text>
              <text className="sea-label" x="195" y="590">
                TYRRHENIAN
                <tspan x="235" dy="18">
                  SEA
                </tspan>
              </text>
              {cities.map((item) => {
                const [x, y] = project([item.longitude, item.latitude]);
                const selected = item.slug === focusCity?.slug;
                return (
                  <a
                    key={item.id}
                    href={`/cities/${item.slug}`}
                    className={`city-marker ${selected ? "selected" : ""}`}
                    aria-label={`Explore ${item.name}`}
                  >
                    <title>{`${item.name}, ${item.region}`}</title>
                    <circle cx={x} cy={y} r="12" fill="transparent" />
                    <circle
                      className="marker-dot"
                      cx={x}
                      cy={y}
                      r={selected ? 6 : 3.2}
                    />
                    {selected ? (
                      <>
                        <rect
                          className="marker-pill"
                          x={x + 9}
                          y={y - 18}
                          width="96"
                          height="35"
                          rx="8"
                        />
                        <text
                          className="marker-selected-text"
                          x={x + 21}
                          y={y + 4}
                        >
                          {item.name}
                          <tspan dx="11">→</tspan>
                        </text>
                      </>
                    ) : labelCities.has(item.slug) ? (
                      <text className="marker-name" x={x + 8} y={y + 4}>
                        {item.name}
                      </text>
                    ) : null}
                  </a>
                );
              })}
            </>
          ) : (
            <>
              <path className="street-buildings" d={streetPaths.building} />
              <path className="street-roads" d={streetPaths.street} />
              <path className="street-water" d={streetPaths.water} />
              {!streets || !streets.features.length ? (
                <g className="map-coordinate-grid" aria-hidden="true">
                  {[150, 300, 450, 600, 750].map((line) => (
                    <path key={line} d={`M0 ${line}H1000 M${line} 0V900`} />
                  ))}
                </g>
              ) : null}
              {(places.length
                ? places
                : [{ ...city, categories: [], citySlug: city.slug }]
              ).map((place, index) => {
                const [x, y] = project([place.longitude, place.latitude]);
                const selected = selectedPlace
                  ? selectedPlace.id === place.id
                  : index === 0;
                const labelWidth = Math.min(300, place.name.length * 7 + 30);
                const labelX = x > 500 ? x - labelWidth - 18 : x + 18;
                return (
                  <a
                    key={place.id}
                    href={
                      places.length
                        ? `/places/${place.slug}`
                        : `/cities/${city.slug}`
                    }
                    aria-label={`Explore ${place.name}`}
                    className="place-marker"
                  >
                    <title>{place.name}</title>
                    <circle className="marker-dot" cx={x} cy={y} r="14" />
                    <text
                      className="marker-number"
                      x={x}
                      y={y + 4}
                      textAnchor="middle"
                    >
                      {places.length ? String(index + 1).padStart(2, "0") : "•"}
                    </text>
                    {selected ? (
                      <>
                        <rect
                          className="place-label-bg"
                          x={labelX}
                          y={y - 22}
                          width={labelWidth}
                          height="42"
                          rx="8"
                        />
                        <text className="marker-name" x={labelX + 14} y={y + 4}>
                          {place.name}
                        </text>
                      </>
                    ) : null}
                  </a>
                );
              })}
            </>
          )}
        </g>
      </svg>
      {!city && variant === "discovery" ? (
        <aside className="map-editorial">
          <span className="micro accent">A different point of view</span>
          <h2>
            Less itinerary.
            <br />
            More discovery.
          </h2>
          <p>Choose a city. Follow your curiosity.</p>
        </aside>
      ) : city && preview ? (
        <aside
          className={`map-place-preview ${selectedPlace ? "is-detail" : ""}`}
        >
          <EditorialPhoto photo={preview.photo} name={preview.name} />
          <Link href={`/places/${preview.slug}`}>
            <span className="micro accent">A different perspective</span>
            <h2>{selectedPlace ? preview.name : "Above the everyday."}</h2>
            <span>{selectedPlace ? city.name : `${preview.name} →`}</span>
          </Link>
        </aside>
      ) : null}
      <div className="map-controls">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => setZoom((value) => clampMapZoom(value * 1.25))}
          disabled={zoom >= 5}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => setZoom((value) => clampMapZoom(value / 1.25))}
          disabled={zoom <= 1}
        >
          −
        </button>
        <button type="button" aria-label="Reset map" onClick={reset}>
          ↺
        </button>
      </div>
      <p className="map-attribution micro">
        {city ? (
          streets ? (
            <>
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noreferrer"
              >
                © OpenStreetMap contributors
              </a>
              <span> · Selected streets / snapshot</span>
            </>
          ) : (
            <>
              <a
                href="https://www.wikidata.org/"
                target="_blank"
                rel="noreferrer"
              >
                Wikidata / CC0
              </a>
              <span> · Places overview / no street data</span>
            </>
          )
        ) : (
          <>
            <a
              href="https://www.naturalearthdata.com/about/terms-of-use/"
              target="_blank"
              rel="noreferrer"
            >
              Natural Earth
            </a>
            <span> · Geographic overview</span>
          </>
        )}
        <br />
        <span>No live status or route guidance</span>
      </p>
    </section>
  );
}
