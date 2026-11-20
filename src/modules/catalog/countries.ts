export const countries = {
 IT: {name:"Italy", timezone:"Europe/Rome", bounds:[[6.1,35.2],[19,47.5]]},
 FI: {name:"Finland", timezone:"Europe/Helsinki", bounds:[[19,59.5],[32,70.2]]},
 CH: {name:"Switzerland", timezone:"Europe/Zurich", bounds:[[5.9,45.7],[10.6,47.9]]},
} as const;
export type CatalogCountry = keyof typeof countries;
export const countryCodes = ["IT","FI","CH"] as const;
export function countryContains(code: CatalogCountry, longitude:number, latitude:number) {
 const [sw,ne]=countries[code].bounds;
 return longitude>=sw[0] && longitude<=ne[0] && latitude>=sw[1] && latitude<=ne[1];
}
