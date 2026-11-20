"use client";
import Link from "next/link";
import { useEffect,useRef,useState } from "react";
import type {Map,Marker} from "maplibre-gl";
import {useCatalog} from "./catalog-provider";
import {locateCatalog,type CatalogLocation} from "@/modules/catalog/location";
export function LocationControl({getMap}:{getMap:()=>Map|null}) {
 const {catalog}=useCatalog();const [pending,setPending]=useState(false);
 const [message,setMessage]=useState("");const [result,setResult]=useState<CatalogLocation>();
 const marker=useRef<Marker|undefined>(undefined);const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;marker.current?.remove();};},[]);
 function locate() {
  if(!window.isSecureContext||!navigator.geolocation){setMessage("Location requires HTTPS or localhost and browser support.");return;}
  marker.current?.remove();
  setPending(true);setResult(undefined);setMessage("Finding your location. Coordinates stay on this page only.");
  navigator.geolocation.getCurrentPosition(position=>{
   if(!mounted.current)return;
   setPending(false);
   const {latitude,longitude,accuracy}=position.coords;
   const next=locateCatalog(catalog,latitude,longitude,accuracy);setResult(next);
   if(next.status==='inaccurate'){setMessage("Location is too imprecise. Try again outdoors or choose a country.");return;}
   setMessage(next.status==='unsupported'?"No supported city confirmed here. Choose Italy, Finland or Switzerland.":`Near ${next.city.name} (within ${Math.ceil(next.distance)} km). ${next.places.length} checked places; not live availability.`);
   void import('maplibre-gl').then(lib=>{
    const map=getMap();if(!mounted.current||!map)return;
    marker.current?.remove();
    const dot=document.createElement('div');dot.className='user-location';dot.setAttribute('aria-label','Your approximate location');
    marker.current=new lib.Marker({element:dot}).setLngLat([longitude,latitude]).addTo(map);
    map.flyTo({center:[longitude,latitude],zoom:13,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:700});
   });
  },error=>{
   if(!mounted.current)return;setPending(false);
   setMessage(error.code===1?'Location permission denied. You can keep exploring.':error.code===3?'Location request timed out. Try again or choose a country.':'Location unavailable. Choose a country to keep exploring.');
  },{enableHighAccuracy:false,timeout:10000,maximumAge:0});
 }
 return <div className="location-control">
  <button className="button" disabled={pending} onClick={locate} aria-label="My location">{pending?'Locating…':'My location'}</button>
  {message&&<aside className="location-results" aria-label="Nearby checked places">
   <button className="location-close" aria-label="Close location results" onClick={()=>{setMessage('');setResult(undefined);marker.current?.remove();}}>×</button>
   <p role="status">{message}</p>
   {result?.status==='supported'&&<ul>{result.places.map(p=><li key={p.id}><Link href={'/places/'+p.slug}>{p.name} ↗</Link></li>)}</ul>}
  </aside>}
 </div>;
}
