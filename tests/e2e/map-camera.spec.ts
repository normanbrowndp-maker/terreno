import {test,expect} from '@playwright/test';
import {countries} from '../../src/modules/catalog/countries';

test('overview refits the actual resized map container, then leaves a manually moved camera alone',async({page})=>{
 await page.setViewportSize({width:390,height:900});await page.goto('/');
 const host=page.getByTestId('map-canvas');await expect.poll(async()=>Number(await host.getAttribute('data-zoom'))).toBeGreaterThan(3);
 await page.setViewportSize({width:1440,height:900});
 await expect.poll(async()=>Number(await host.getAttribute('data-zoom'))).toBeGreaterThan(4.5);
 const box=await host.boundingBox();if(!box)throw Error('Map missing');
 await page.mouse.move(box.x+box.width*.6,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.3,box.y+box.height*.5,{steps:12});await page.mouse.up();
 await page.waitForTimeout(500);
 const center=await host.getAttribute('data-center'),zoom=Number(await host.getAttribute('data-zoom'));
 await page.getByRole('button',{name:'Restaurants',exact:true}).click();
 await expect(host).toHaveAttribute('data-center',center!);
 await page.setViewportSize({width:1200,height:900});
 await expect.poll(async()=>Math.abs(Number(await host.getAttribute('data-zoom'))-zoom)).toBeLessThan(.02);
});

test('distant Italy cities form counted clusters which expand without losing their members',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/');
 const host=page.getByTestId('map-canvas');
 await expect(page.locator('.terreno-cluster').first()).toBeVisible();
 const sum=()=>page.evaluate(()=>[...document.querySelectorAll('.terreno-cluster')].reduce((n,e)=>n+Number((e as HTMLElement).dataset.count),0)+document.querySelectorAll('.terreno-marker[data-kind=city]:not([hidden])').length);
 await expect.poll(sum).toBe(48);
 const cluster=page.locator('.terreno-cluster').first();const node=await cluster.elementHandle();const before=Number(await host.getAttribute('data-zoom'));
 await cluster.click();await expect.poll(async()=>Number(await host.getAttribute('data-zoom'))).toBeGreaterThan(before+.05);
 await expect.poll(async()=>node?.evaluate(e=>e.isConnected)).toBe(false);
 await page.screenshot({path:'artifacts/terreno/travel031/expanded-1440.png'});
 await page.getByRole('button',{name:'Italy overview',exact:true}).click();
 await expect.poll(async()=>Math.abs(Number(await host.getAttribute('data-zoom'))-before)).toBeLessThan(.02);
 await expect.poll(sum).toBe(48);
 await page.screenshot({path:'artifacts/terreno/travel031/clusters-1440.png'});
});

for(const width of [1440,768,390,360]) {
 test(`country camera and clusters stay correct through sequential switches at ${width}px`,async({page,request})=>{
  await page.setViewportSize({width,height:900});await page.goto('/?country=IT');
  const host=page.getByTestId('map-canvas');await expect(host).toHaveAttribute('data-world-copies','false');
  const canvas=await host.locator('canvas').elementHandle();
  for(const [code,latitude,longitude,count] of [['IT',42,12.5,48],['FI',65,25.5,2],['CH',47,8.25,2],['IT',42,12.5,48]] as const) {
   await page.getByLabel('Country',{exact:true}).selectOption(code);
   await expect.poll(async()=>Math.abs(Number((await host.getAttribute('data-center'))?.split(',')[0])-longitude)).toBeLessThan(2);
   await expect.poll(async()=>Math.abs(Number((await host.getAttribute('data-center'))?.split(',')[1])-latitude)).toBeLessThan(2);
   await expect.poll(async()=>{
    const z=Number(await host.getAttribute('data-zoom')); const box=await host.boundingBox();if(!box)return 0;
    const [sw,ne]=countries[code].bounds;
    const mercatorY=(latitude:number)=>Math.log(Math.tan(Math.PI/4+latitude*Math.PI/360));
    const world=512*2**z;
    return Math.max((ne[0]-sw[0])/360*world/box.width,(mercatorY(ne[1])-mercatorY(sw[1]))/(2*Math.PI)*world/box.height);
   }).toBeGreaterThan(.55);
   await expect.poll(()=>page.evaluate(()=>[...document.querySelectorAll('.terreno-cluster')].reduce((n,e)=>n+Number((e as HTMLElement).dataset.count),0)+document.querySelectorAll('.terreno-marker[data-kind=city]:not([hidden])').length)).toBe(count);
   expect(await canvas?.evaluate(e=>e.isConnected)).toBe(true);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   const r=await request.get('/api/v1/cities?country='+code);expect((await r.json()).meta.backend).toBe('postgres');
   await expect.poll(async()=>Number(await host.getAttribute('data-features')),{timeout:30000}).toBeGreaterThan(0);
   await page.screenshot({path:`artifacts/terreno/travel031/${code}-${width}.png`});
  }
 });
}
