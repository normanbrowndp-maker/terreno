import {supportedCountryAt} from "@/modules/geography";
import type { City, EditorialCatalog, EditorialPlace } from "./model";
export function distanceKm(lat1:number,lon1:number,lat2:number,lon2:number) {
 const r=Math.PI/180; const a=Math.sin((lat2-lat1)*r/2)**2+Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin((lon2-lon1)*r/2)**2;
 return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)));
}
export type CatalogLocation={status:"inaccurate"}|{status:"unsupported"}|{status:"supported";city:City;places:EditorialPlace[];distance:number};
/** Proximity only, not administrative reverse geocoding. No remote request or persistence. */
export function locateCatalog(catalog:EditorialCatalog,latitude:number,longitude:number,accuracy:number):CatalogLocation {
 if(![latitude,longitude,accuracy].every(Number.isFinite)||Math.abs(latitude)>90||Math.abs(longitude)>180||accuracy<0||accuracy>2000)return {status:"inaccurate"};
 const country=supportedCountryAt(longitude,latitude);
 if(!country)return {status:"unsupported"};
 const ranked=catalog.cities.filter(c=>c.countryCode===country).map(city=>({city,distance:distanceKm(latitude,longitude,city.latitude,city.longitude)})).sort((a,b)=>a.distance-b.distance);
 const nearest=ranked[0];
 if(!nearest||nearest.distance>25)return {status:"unsupported"};
 return {status:"supported",...nearest,places:catalog.places.filter(p=>p.citySlug===nearest.city.slug).sort((a,b)=>distanceKm(latitude,longitude,a.latitude,a.longitude)-distanceKm(latitude,longitude,b.latitude,b.longitude)).slice(0,10)};
}
