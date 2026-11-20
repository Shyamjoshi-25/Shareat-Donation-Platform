import { test, expect } from '@playwright/test';
test('Shareat authentication screen renders and supports switching modes', async ({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Welcome back'})).toBeVisible();
 await page.getByRole('button',{name:'Create account'}).click();
 await expect(page.getByRole('heading',{name:'Create your account'})).toBeVisible();
 await expect(page.getByLabel('Account type')).toBeVisible();
 await page.getByLabel('Account type').selectOption('ngo');
 await expect(page.getByLabel('Organization name')).toBeVisible();
});
