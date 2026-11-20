import {expect,it} from 'vitest';
import {locateCatalog,distanceKm} from '@/modules/catalog/location';
import {italyDemo} from '@/modules/catalog';
it('uses geodesic distance and never assigns unsupported locations to a distant city',()=>{
 expect(distanceKm(60.17,24.94,66.50,25.73)).toBeGreaterThan(700);
 const result=locateCatalog(italyDemo,60.1708,24.9375,25);
 expect(result.status).toBe('supported');
 if(result.status==='supported'){expect(result.city.slug).toBe('helsinki');expect(result.places).toHaveLength(10);}
 expect(locateCatalog(italyDemo,43.24,76.92,50).status).toBe('unsupported');
 expect(locateCatalog(italyDemo,60.17,24.94,50000).status).toBe('inaccurate');
 expect(locateCatalog(italyDemo,NaN,24,10).status).toBe('inaccurate');
});
