"use client";

import Link from "next/link";
import {LocationControl} from "./location-control";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LibreMap, Marker, GeoJSONSource } from "maplibre-gl";
import type { City, EditorialPlace } from "@/modules/catalog";
import {countries,type CatalogCountry} from "@/modules/catalog";
import { useCatalog } from "./catalog-provider";

type Coordinate = Pick<City, "id" | "longitude" | "latitude">;
type Props = {
  cities: readonly City[];
  countryCode?: CatalogCountry;
  city?: City;
  places?: readonly EditorialPlace[];
  selectedPlace?: EditorialPlace | undefined;
  variant?: "discovery" | "index" | "saved" | "detail";
  highlightCitySlug?: string | undefined;
  centerOn?: Coordinate | undefined;
  onSelectCity?: (city: City) => void;
  onSelectPlace?: (place: EditorialPlace) => void;
};
const citySource = "terreno-cities";
const boundsFor=(code:CatalogCountry):[[number,number],[number,number]]=> {const b=countries[code].bounds;return [[b[0][0],b[0][1]],[b[1][0],b[1][1]]];};

export function GeographicMap(props: Props) {
  const { catalog } = useCatalog();
  const country=props.city?.countryCode ?? props.countryCode ?? "IT";
  const cameraCountry=useRef(country);
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<LibreMap | null>(null);
  const latest = useRef(props);
  const markers = useRef<Marker[]>([]);
  const clusters = useRef(new Map<number, Marker>());
  const cityDataKey = useRef("");
  const overviewMode = useRef(!props.city);
  const fitOverview = useRef<(duration?: number) => void>(() => {});
  const refreshMarkers=useRef<()=>void>(()=>{});
  const selection = useRef<string | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [context, setContext] = useState<City | EditorialPlace>();
  const [closed, setClosed] = useState<string>();
  useEffect(() => { latest.current = props; });

  useEffect(() => {
    const clusterMarkers = clusters.current;
    let disposed = false;
    let observer: ResizeObserver | undefined;
    let instance: LibreMap | undefined;
    void import("maplibre-gl").then(lib => {
      if (disposed || !host.current) return;
      lib.setWorkerUrl("/geodata/maplibre-worker.mjs");
      const initial = latest.current.city;
      cameraCountry.current = initial?.countryCode ?? latest.current.countryCode ?? "IT";
      instance = new lib.Map({
        container: host.current,
        style: "/geodata/terreno-style.json",
        center: initial ? [initial.longitude, initial.latitude] : [12.5, 42],
        zoom: initial ? 13 : 5,
        maxZoom: 20,
        minZoom: 2,
        renderWorldCopies: false,
        attributionControl: { compact: true },
      });
      map.current = instance;
      fitOverview.current = (duration = 0) => {
        if (!instance || !host.current?.clientWidth || !host.current.clientHeight) return;
        const { clientWidth: width, clientHeight: height } = host.current;
        instance.fitBounds(boundsFor(cameraCountry.current), {
          padding: { top: Math.min(56, height * .12), bottom: Math.min(76, height * .21),
            left: Math.min(30, width * .06), right: Math.min(30, width * .06) },
          duration,
        });
      };
      if (!initial) fitOverview.current();
      // A gesture relinquishes overview fitting; resize must never undo a user's pan/zoom.
      instance.on("movestart", event => { if (event.originalEvent) overviewMode.current = false; });
      instance.addControl(new lib.NavigationControl({ showCompass: false }), "bottom-right");
      instance.on("error", () => setFailed(true));
      instance.on("idle", () => {
        if (instance?.areTilesLoaded()) setFailed(false);
        if (instance && host.current) {
          const features = instance.queryRenderedFeatures().filter(feature=>feature.source!==citySource);
          host.current.dataset.features = String(features.length);
          host.current.dataset.roads = String(features.filter(feature => feature.sourceLayer === "transportation").length);
          host.current.dataset.regions = String(features.filter(feature => feature.sourceLayer === "boundary").length);
        }
      });
      instance.on("load", () => {
        if (!disposed && instance) {
          instance.addSource(citySource, { type: "geojson", data: {type:"FeatureCollection",features:[]},
            cluster: true, clusterRadius: 50, clusterMaxZoom: 7 });
          // The source is loaded by this transparent layer; accessible HTML markers render its clusters.
          instance.addLayer({id:"terreno-city-source",type:"circle",source:citySource,
            paint:{"circle-radius":1,"circle-opacity":0}});
          setLoaded(true);
        }
      });
      const updateMarkers = () => {
        if (!host.current || !instance) return;
        host.current.dataset.worldCopies=String(instance.getRenderWorldCopies());
        host.current.dataset.zoom = instance.getZoom().toFixed(2);
        host.current.dataset.center = instance.getCenter().toArray().join(",");
        const zoom = instance.getZoom();
        host.current.dataset.detail = zoom < 6 ? "country" : zoom < 11 ? "regions" : "streets";
        if (!instance.getSource(citySource) || !instance.isSourceLoaded(citySource)) return;
        const singles = new Set<string>();
        const activeClusters = new Set<number>();
        for (const feature of instance.querySourceFeatures(citySource)) {
          if (feature.geometry.type !== "Point") continue;
          if (!feature.properties.cluster) { singles.add(String(feature.properties.cityId)); continue; }
          const id = Number(feature.properties.cluster_id);
          if (activeClusters.has(id)) continue; // Source tiles can report the same cluster more than once.
          activeClusters.add(id);
          const [longitude, latitude] = feature.geometry.coordinates as [number, number];
          let marker = clusterMarkers.get(id);
          if (!marker) {
            const element = document.createElement("button");
            element.type = "button"; element.className = "terreno-cluster";
            const count = Number(feature.properties.point_count);
            element.dataset.count = String(count); element.textContent = String(count);
            element.setAttribute("aria-label", `Zoom in to explore ${count} cities`);
            element.addEventListener("click", () => {
              overviewMode.current = false;
              const generation = cityDataKey.current;
              const source = instance?.getSource<GeoJSONSource>(citySource);
              void source?.getClusterExpansionZoom(id).then(zoom => {
                if (!disposed && generation === cityDataKey.current) instance?.easeTo({ center:[longitude,latitude], zoom,
                  duration:matchMedia("(prefers-reduced-motion: reduce)").matches?0:550 });
              }).catch(() => setFailed(true));
            });
            marker = new lib.Marker({element}).setLngLat([longitude,latitude]).addTo(instance);
            clusterMarkers.set(id, marker);
          }
        }
        for (const [id, marker] of clusterMarkers) {
          if (!activeClusters.has(id)) { marker.remove(); clusterMarkers.delete(id); }
        }
        const labels: { x: number; y: number; width:number }[] = [];
        for (const marker of markers.current) {
          const element = marker.getElement();
          const place = element.dataset.kind === "place";
          element.hidden = place ? zoom < 10 : !singles.has(element.dataset.id ?? "");
          if (!place && !element.hidden) {
            const point = instance.project(marker.getLngLat());
            const width=(element.textContent?.length ?? 0)*6+24;
            const crowded = labels.some(label => Math.abs(label.x - point.x) < (label.width+width)/2+8 && Math.abs(label.y - point.y) < 34);
            const showLabel = !crowded && (zoom >= 6 || element.dataset.featured === "true");
            element.classList.toggle("compact-marker", !showLabel);
            if (showLabel) labels.push({...point,width});
          }
        }
      };
      refreshMarkers.current=updateMarkers;
      instance.on("move", updateMarkers);
      instance.on("render", updateMarkers);
      observer = new ResizeObserver(() => {
        instance?.resize();
        if (overviewMode.current) fitOverview.current();
      });
      observer.observe(host.current);
    }).catch(() => setFailed(true));
    return () => {
      disposed = true;
      observer?.disconnect();
      markers.current.forEach(marker => marker.remove());
      clusterMarkers.forEach(marker => marker.remove());
      clusterMarkers.clear();
      instance?.remove();
      map.current = null;
    };
  }, []);

  const places = useMemo(() => props.variant === "saved" || props.city ? props.places ?? [] : catalog.places.filter(p=>p.countryCode===country),
    [props.variant, props.city, props.places, catalog.places,country]);
  useEffect(() => {
    if (!loaded || !map.current) return;
    let disposed = false;
    void import("maplibre-gl").then(lib => {
      if (disposed || !map.current) return;
      const key = props.cities.map(city=>`${city.id}:${city.longitude}:${city.latitude}`).join("|");
      if (cityDataKey.current !== key) {
        cityDataKey.current = key;
        // Clear old-country clusters before the worker publishes the new source generation.
        clusters.current.forEach(marker=>marker.remove()); clusters.current.clear();
        map.current.getSource<GeoJSONSource>(citySource)?.setData({ type:"FeatureCollection",
          features:props.cities.map(city=>({type:"Feature",properties:{cityId:city.id},
            geometry:{type:"Point",coordinates:[city.longitude,city.latitude]}})) });
      }
      const required = new Set([...props.cities, ...places].map(item => item.id));
      markers.current = markers.current.filter(marker => {
        if (required.has(marker.getElement().dataset.id ?? "")) return true;
        marker.remove();
        return false;
      });
      const add = (item: City | EditorialPlace, kind: "city" | "place") => {
        const existing = markers.current.find(marker => marker.getElement().dataset.id === item.id);
        const element = existing?.getElement() ?? document.createElement("button");
        element.setAttribute("type", "button");
        element.classList.add("terreno-marker");
        element.dataset.kind = kind;
        element.dataset.slug = item.slug;
        element.dataset.id = item.id;
        element.dataset.featured = String("featured" in item && item.featured);
        const selected = kind === "place"
          ? item.id === latest.current.selectedPlace?.id
          : item.slug === latest.current.highlightCitySlug;
        element.setAttribute("aria-label", `Show ${item.name} on map`);
        element.setAttribute("aria-pressed", String(selected));
        element.title = item.name;
        element.textContent = kind === "city" ? item.name : "●";
        const zoom = map.current!.getZoom();
        element.hidden = kind === "city" || zoom < 10;
        if (existing) return;
        element.addEventListener("click", () => {
          setContext(item);
          setClosed(undefined);
          if ("citySlug" in item) latest.current.onSelectPlace?.(item);
          else latest.current.onSelectCity?.(item);
        });
        const marker = new lib.Marker({ element }).setLngLat([item.longitude, item.latitude]).addTo(map.current!);
        markers.current.push(marker);
      };
      [...props.cities].sort((a,b) => Number(b.featured) - Number(a.featured)).forEach(item => add(item, "city"));
      places.forEach(item => add(item, "place"));
      refreshMarkers.current();
    });
    return () => { disposed = true; };
  }, [loaded, props.cities, places, props.selectedPlace?.id, props.highlightCitySlug]);

  useEffect(()=>{
    if(!loaded || !map.current || cameraCountry.current===country) return;
    cameraCountry.current=country;
    overviewMode.current = true;
    fitOverview.current(matchMedia("(prefers-reduced-motion: reduce)").matches?0:700);
  },[loaded,country]);
  const target = props.centerOn;
  const targetId = target?.id;
  useEffect(() => {
    if (!loaded || !map.current || !target || targetId === selection.current) return;
    selection.current = targetId;
    overviewMode.current = false;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.current.flyTo({
      center: [target.longitude, target.latitude], zoom: 14,
      duration: reduced ? 0 : 850, essential: false,
    });
  }, [loaded, targetId, target]);

  const preview = props.selectedPlace ?? (context && ("citySlug" in context)
    ? places.find(place => place.id === context.id)
    : context && props.cities.some(c=>c.id===context.id) ? context : undefined);
  return (
    <section id="catalog-map" className="geographic-map continuous-map"
      aria-label={props.city ? `Map of ${props.city.name}` : `Map of ${countries[country].name}`}>
      <div ref={host} className="libre-host" data-testid="map-canvas" aria-label="Interactive geographic map" />
      <button className="italy-reset button" onClick={() => {
        setContext(undefined);
        overviewMode.current = true;
        fitOverview.current(matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 700);
      }}>{countries[country].name} overview</button>
      <LocationControl getMap={()=>map.current} />
      {!loaded || failed ? (
        <p role="status" className="tile-status">
          {failed ? "Some map data is unavailable. Check your connection." : "Loading map…"}
        </p>
      ) : null}
      {preview && closed !== preview.id && (
        <aside className="map-context" aria-live="polite">
          <button aria-label="Close map information" onClick={() => setClosed(preview.id)}>×</button>
          <small>{"citySlug" in preview ? "TERRENO place" : "TERRENO city"}</small>
          <Link href={`/${"citySlug" in preview ? "places" : "cities"}/${preview.slug}`}>{preview.name} ↗</Link>
          <p>{preview.subtitle}</p>
        </aside>
      )}
      <p className="catalog-map-note">Base geography · OpenStreetMap<br />Terracotta markers · TERRENO catalog</p>
    </section>
  );
}
