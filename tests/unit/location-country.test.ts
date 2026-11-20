import {expect,it} from 'vitest';
import {italyDemo} from '@/modules/catalog';
import {locateCatalog} from '@/modules/catalog/location';
it('does not label nearby foreign locations as supported Italian cities',()=>{
 expect(locateCatalog(italyDemo,45.547,13.73,25).status).toBe('unsupported'); // Koper, Slovenia, near Trieste
 expect(locateCatalog(italyDemo,45.87,8.98,25).status).toBe('unsupported'); // Mendrisio, Switzerland, near Como
});
