import boundaries from "./data/supported-countries.json";

type Geometry={type:string;coordinates:number[][][]|number[][][][]};
function ringContains(longitude:number,latitude:number,ring:number[][]) {
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
  const a=ring[i]!,b=ring[j]!;
  if((a[1]!>latitude)!==(b[1]!>latitude)&&longitude<(b[0]!-a[0]!)*(latitude-a[1]!)/(b[1]!-a[1]!)+a[0]!)inside=!inside;
 }
 return inside;
}
/** Generalized land boundaries: conservative catalog eligibility, not border navigation. */
export function supportedCountryAt(longitude:number,latitude:number) {
 for(const code of Object.keys(boundaries) as (keyof typeof boundaries)[]) {
  const geometry:Geometry=boundaries[code];
  const polygons=geometry.type==='Polygon'?[geometry.coordinates as number[][][]]:geometry.coordinates as number[][][][];
  if(polygons.some(p=>p[0]&&ringContains(longitude,latitude,p[0])&&!p.slice(1).some(h=>ringContains(longitude,latitude,h))))return code;
 }
 return undefined;
}
