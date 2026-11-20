import {test,expect} from '@playwright/test';
test('global Enter search finds an international city in its country index',async({page})=>{
 await page.goto('/');await page.getByRole('combobox',{name:'Search cities and places'}).fill('Helsinki');
 await page.getByRole('combobox',{name:'Search cities and places'}).press('Enter');
 await expect(page.getByTestId('city-row')).toHaveCount(1);
 await expect(page.getByTestId('city-row')).toContainText('Helsinki');
 await expect(page.getByLabel('Country',{exact:true})).toHaveValue('FI');
});
