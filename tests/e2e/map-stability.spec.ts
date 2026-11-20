import { test, expect } from "@playwright/test";

test("world overview and repeated pans retain the same catalog markers", async ({page})=>{
 await page.setViewportSize({width:1440,height:1000});
 await page.goto("/cities/firenze");
 const host=page.getByTestId("map-canvas");
 await expect(page.locator('.terreno-marker[data-kind="city"]')).toHaveCount(48);
 const marker=page.locator('.terreno-marker[data-slug="firenze"]');
 const node=await marker.elementHandle();
 for(let i=0;i<4;i++)await page.getByRole("button",{name:"Zoom out",exact:true}).click();
 await page.getByRole("button",{name:"Italy overview"}).click();
 await expect.poll(async()=>Number(await host.getAttribute("data-zoom"))).toBeLessThan(6);
 const box=await host.boundingBox();if(!box)throw Error("map missing");
 for(let i=0;i<3;i++){
  await page.mouse.move(box.x+box.width*.7,box.y+box.height*.6);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width*.25,box.y+box.height*.6,{steps:10});
  await page.mouse.up();
 }
 await expect(page.locator('.terreno-marker[data-kind="city"]')).toHaveCount(48);
 expect(await node?.evaluate(element=>element.isConnected)).toBe(true);
 await page.getByRole("button",{name:"Gardens",exact:true}).click();
 await expect(page.locator('.terreno-marker[data-kind="place"]')).toHaveCount(2);
 await expect(marker).toHaveClass(/maplibregl-marker/);
 await expect(marker).toHaveCSS("position","absolute");
 await page.getByRole("button",{name:"All",exact:true}).click();
 expect(await node?.evaluate(element=>element.isConnected)).toBe(true);
 await page.screenshot({path:"artifacts/terreno/travel030/free-pan.png"});
});
