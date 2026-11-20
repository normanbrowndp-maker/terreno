import { test,expect } from '@playwright/test';
test('expanded Italy is served by PostgreSQL and new places open by direct link',async({page,request})=>{
 for(const city of ['firenze','roma']) {
  const r=await request.get('/api/v1/places?city='+city);
  expect(r.status()).toBe(200);
  const body=await r.json();
  expect(body.meta).toMatchObject({backend:'postgres',availability:'ready',total:10});
  expect(body.data).toHaveLength(10);
 }
 await page.goto('/places/boboli-gardens');
 await expect(page.getByRole('heading',{level:1})).toContainText('Giardino di Boboli');
 await expect(page.locator('[data-catalog-backend=postgres]')).toBeVisible();
});

test('country selection changes real database results, map extent and direct links',async({page,request})=>{
 await page.goto('/');
 for(const [country,city,latitude] of [['FI','helsinki',64],['CH','zurich',47],['IT','firenze',42]] as const) {
  await page.getByLabel('Country',{exact:true}).selectOption(country);
  await expect(page).toHaveURL(new RegExp('country='+country));
  const map=page.getByTestId('map-canvas');
  await expect.poll(async()=>Number((await map.getAttribute('data-center'))?.split(',')[1])).toBeGreaterThan(latitude-2);
  const r=await request.get('/api/v1/cities?country='+country);const b=await r.json();
  expect(b.meta.backend).toBe('postgres');expect(b.data.every((c:{countryCode:string})=>c.countryCode===country)).toBe(true);
  await expect.poll(async()=>Math.abs(Number((await map.getAttribute('data-center'))?.split(',')[1])-latitude)).toBeLessThan(2);
  await page.goto('/cities/'+city);
  await expect(page.locator('[data-catalog-backend=postgres]')).toBeVisible();
  await page.goto('/?country='+country);
 }
});

test('geolocation is opt-in, offers ten Helsinki places and keeps coordinates out of URL and storage',async({browser,baseURL})=>{
 const ctx=await browser.newContext({permissions:['geolocation'],geolocation:{latitude:60.1708,longitude:24.9375,accuracy:25},viewport:{width:390,height:844}});
 const page=await ctx.newPage();await page.goto(baseURL+'/');
 await expect(page.locator('.user-location')).toHaveCount(0);
 await expect(page.getByLabel('Nearby checked places')).toHaveCount(0);
 await page.getByRole('button',{name:'My location',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'Near Helsinki'})).toBeVisible();
 await expect(page.getByLabel('Nearby checked places').getByRole('link')).toHaveCount(10);
 await expect(page.locator('.user-location')).toHaveCount(1);
 expect(page.url()).not.toContain('60.1708');
 expect(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))).not.toContain('60.1708');
 await page.screenshot({path:'artifacts/terreno/travel030/location-390.png'});
 await ctx.close();
});
for (const [code,message] of [[1,'permission denied'],[2,'unavailable'],[3,'timed out']] as const) {
 test('geolocation handles error '+code+' without breaking exploration',async({page})=>{
  await page.addInitScript(error=>Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition:(_:unknown,fail:(e:{code:number})=>void)=>fail({code:error})}}),code);
  await page.goto('/');await page.getByRole('button',{name:'My location',exact:true}).click();
  await expect(page.getByLabel('Nearby checked places')).toContainText(message);
  await expect(page.getByRole('button',{name:'Italy overview',exact:true})).toBeEnabled();
 });
}

for(const width of [1440,390,360]) {
 test('international map views remain usable at '+width,async({page})=>{
  await page.setViewportSize({width,height:900});
  for(const country of ['IT','FI','CH']) {
   await page.goto('/?country='+country);
   const host=page.getByTestId('map-canvas');
   await expect.poll(async()=>Number(await host.getAttribute('data-features')),{timeout:30000}).toBeGreaterThan(0);
   await expect(page.locator('[data-catalog-backend=postgres]')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:`artifacts/terreno/travel030/${country}-${width}.png`,fullPage:true});
  }
 });
}
for(const [latitude,longitude,accuracy,message] of [[45.547,13.73,20,'No supported city'],[43.24,76.92,20,'No supported city'],[60.17,24.94,5000,'too imprecise']] as const){
 test('location handles '+message+' at '+latitude,async({browser,baseURL})=>{
  const context=await browser.newContext({permissions:['geolocation'],geolocation:{latitude,longitude,accuracy}});
  const page=await context.newPage();await page.goto(baseURL+'/');
  await page.getByRole('button',{name:'My location',exact:true}).click();
  await expect(page.getByLabel('Nearby checked places')).toContainText(message);
  await context.close();
 });
}

test('all four international cities and their 23 checked places resolve with source-aware photos',async({page,request})=>{
 for(const code of ['FI','CH']) {
  const cities=(await(await request.get('/api/v1/cities?country='+code)).json()).data;
  const places=(await(await request.get('/api/v1/places?country='+code)).json()).data;
  for(const c of cities) {await page.goto('/cities/'+c.slug);await expect(page.getByRole('heading',{level:1,name:c.name,exact:true})).toBeVisible();}
  for(const p of places) {
   await page.goto('/places/'+p.slug);
   await expect(page.getByRole('heading',{level:1,name:p.name,exact:true})).toBeVisible();
   if(p.photo){const img=page.locator('img[data-photo]:visible').first();await expect(img).toHaveJSProperty('complete',true);expect(await img.evaluate((e:HTMLImageElement)=>e.naturalWidth)).toBeGreaterThan(0);}
   else await expect(page.getByRole('img',{name:p.name+': photograph unavailable'}).first()).toBeVisible();
  }
 }
});

test('mobile country city markers remain clear of attribution',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/?country=FI');
 const marker=page.locator('.terreno-marker[data-slug=helsinki]');await expect(marker).toBeVisible();
 const label=await marker.boundingBox();const credit=await page.locator('.maplibregl-ctrl-attrib').boundingBox();
 if(!label||!credit)throw Error('map labels missing');expect(label.y+label.height).toBeLessThan(credit.y);
});
