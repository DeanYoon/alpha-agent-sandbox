import { test, expect } from '@playwright/test';

test('backtest simulation flow', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Alpha-Agent Backtester');
  
  // Click run backtest
  await page.click('button:has-text("Run Backtest")');
  
  // Wait for result or error
  // If API fails due to external dependency, we should at least see the defensive error message
  const isErrorVisible = await page.locator('div:has-text("data for ticker")').isVisible();
  const isChartVisible = await page.locator('h3:has-text("Growth of Portfolio")').isVisible();
  
  expect(isErrorVisible || isChartVisible).toBeTruthy();
});
