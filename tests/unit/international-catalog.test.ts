import {expect,it} from 'vitest';
import {italyDemo,collectionSchema,parseCatalogQuery,filterPlaces} from '@/modules/catalog';
it('supports Finland and Switzerland without losing Italy or accepting mismatched geography',()=>{
 for(const code of ['IT','FI','CH'])expect(italyDemo.cities.some(c=>c.countryCode===code)).toBe(true);
 const helsinki=italyDemo.cities.find(c=>c.slug==='helsinki');expect(helsinki).toBeDefined();
 expect(collectionSchema.safeParse(italyDemo).success).toBe(true);
 expect(collectionSchema.safeParse({...italyDemo,cities:[{...helsinki,latitude:41,longitude:12}]}).success).toBe(false);
 expect(parseCatalogQuery(new URLSearchParams('country=FI'))).toMatchObject({country:'FI'});
 expect(()=>parseCatalogQuery(new URLSearchParams('country=KZ'))).toThrow();
 expect(filterPlaces(italyDemo.places,{country:'FI'}).every(p=>p.countryCode==='FI')).toBe(true);
});
