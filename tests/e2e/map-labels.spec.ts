import {test,expect} from '@playwright/test';
test('initial Italy overview resolves label collisions before any user gesture',async({page})=>{
 await page.goto('/');
 await expect(page.locator('.terreno-marker[data-kind=city]')).toHaveCount(48);
 await expect(page.getByTestId('map-canvas')).toHaveAttribute('data-world-copies','false');
 await expect.poll(()=>page.locator('.terreno-marker[data-kind=city]:not([hidden]):not(.compact-marker)').count()).toBeLessThanOrEqual(5);
 const host=page.getByTestId('map-canvas');
 for(let i=0;i<6;i++){
  const zoom=Number(await host.getAttribute('data-zoom'));if(zoom<=2.02)break;
  await page.getByRole('button',{name:'Zoom out',exact:true}).click();
  await expect.poll(async()=>Math.abs(Number(await host.getAttribute('data-zoom'))-Math.max(2,zoom-1))).toBeLessThan(.02);
 }
 await expect.poll(async()=>Number(await page.getByTestId('map-canvas').getAttribute('data-zoom'))).toBeLessThanOrEqual(2.1);
 await expect(page.locator('.terreno-marker[data-kind=city]')).toHaveCount(48);
 await expect(page.locator('.terreno-cluster[data-count="48"]')).toBeVisible();
 await page.screenshot({path:'artifacts/terreno/travel031/single-world.png'});
});
