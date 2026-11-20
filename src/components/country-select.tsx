"use client";
import { useRouter, usePathname } from "next/navigation";
import { countries, countryCodes, type CatalogCountry } from "@/modules/catalog";
import {useCatalog} from "./catalog-provider";
import { useQueryValue } from "./query-state";
export function useCatalogCountry() {
 const [code]=useQueryValue("country","IT",countryCodes);
 const path=usePathname(); const {catalog}=useCatalog();
 const place=catalog.places.find(p=>path==='/places/'+p.slug);
 const city=catalog.cities.find(c=>path==='/cities/'+c.slug);
 return place?.countryCode ?? city?.countryCode ?? code as CatalogCountry;
}
export function CountrySelect() {
 const country=useCatalogCountry(); const router=useRouter(); const path=usePathname();
 return <label className="country-select">Country
  <select aria-label="Country" value={country} onChange={e=>router.push(`${path==='/cities'?'/cities':'/'}?country=${e.target.value}`)}>
   {countryCodes.map(c=><option key={c} value={c}>{countries[c].name}</option>)}
  </select>
 </label>;
}
