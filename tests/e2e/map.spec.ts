import { test, expect } from "@playwright/test";

test("wheel reveals vector geography without panel selection and camera stays free", async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const host = page.getByTestId("map-canvas");
  await expect(page.locator(".terreno-marker:visible, .terreno-cluster:visible").first()).toBeVisible({ timeout: 20000 });
  await expect.poll(async () => Number(await host.getAttribute("data-features")), { timeout: 30000 }).toBeGreaterThan(0);
  await page.screenshot({ path: "artifacts/terreno/travel030/country.png" });
  const box = await host.boundingBox();
  if (!box) throw Error("Map bounds unavailable");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let index = 0; index < 6; index++) {
    await page.mouse.wheel(0, -500);
    await page.waitForTimeout(200);
  }
  await expect.poll(async () => Number(await host.getAttribute("data-zoom"))).toBeGreaterThan(6);
  await expect(page).toHaveURL(/\/$/);
  await page.screenshot({ path: "artifacts/terreno/travel030/regions.png" });
  for (let index = 0; index < 8; index++) {
    await page.mouse.wheel(0, -500);
    await page.waitForTimeout(200);
  }
  await expect(host).toHaveAttribute("data-detail", "streets");
  await expect.poll(async () => Number(await host.getAttribute("data-features")), { timeout: 30000 }).toBeGreaterThan(0);
  await page.screenshot({ path: "artifacts/terreno/travel030/streets.png" });
  const before = await host.getAttribute("data-center");
  await page.mouse.move(box.x + box.width * .6, box.y + box.height * .5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .2, box.y + box.height * .6, { steps: 12 });
  await page.mouse.up();
  await expect(host).not.toHaveAttribute("data-center", before!);
  const zoom = Number(await host.getAttribute("data-zoom"));
  await page.getByRole("button", { name: "Restaurants", exact: true }).click();
  await expect.poll(async () => Number(await host.getAttribute("data-zoom"))).toBeGreaterThan(zoom - .1);
  await page.getByRole("button", { name: "Italy overview" }).click();
  await expect.poll(async () => Number(await host.getAttribute("data-zoom"))).toBeLessThan(6);
  await expect(page.getByText("Open now", { exact: true })).toHaveCount(0);
});

test("two finger Chromium touch events zoom the geographic map", async ({browser,baseURL})=>{
 if(!baseURL)throw Error("base URL");
 const context=await browser.newContext({baseURL,hasTouch:true,isMobile:true,viewport:{width:390,height:844}});
 try{
  const page=await context.newPage();
  await page.goto("/");
  await expect(page.locator(".terreno-marker:visible, .terreno-cluster:visible").first()).toBeVisible({timeout:20000});
  const host=page.getByTestId("map-canvas");
  const box=await host.boundingBox(); if(!box)throw Error("map bounds");
  const before=Number(await host.getAttribute("data-zoom"));
  const cdp=await context.newCDPSession(page);
  const x=box.x+box.width/2,y=box.y+box.height/2;
  await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:x-25,y,id:0},{x:x+25,y,id:1}]});
  for(let i=1;i<=8;i++){
   await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:x-25-i*10,y,id:0},{x:x+25+i*10,y,id:1}]});
   await page.waitForTimeout(30);
  }
  await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
  await expect.poll(async()=>Number(await host.getAttribute("data-zoom"))).toBeGreaterThan(before+.5);
  await page.screenshot({path:"artifacts/terreno/travel030/mobile-pinch.png"});
 }finally{await context.close();}
});
