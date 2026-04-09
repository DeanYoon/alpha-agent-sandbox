# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/e2e/test_backtest_flow.spec.ts >> backtest simulation flow
- Location: tests/e2e/test_backtest_flow.spec.ts:3:5

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('backtest simulation flow', async ({ page }) => {
> 4  |   await page.goto('/');
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  5  |   await expect(page.locator('h1')).toContainText('Alpha-Agent Backtester');
  6  |   
  7  |   // Click run backtest
  8  |   await page.click('button:has-text("Run Backtest")');
  9  |   
  10 |   // Wait for result or error
  11 |   // If API fails due to external dependency, we should at least see the defensive error message
  12 |   const isErrorVisible = await page.locator('div:has-text("data for ticker")').isVisible();
  13 |   const isChartVisible = await page.locator('h3:has-text("Growth of Portfolio")').isVisible();
  14 |   
  15 |   expect(isErrorVisible || isChartVisible).toBeTruthy();
  16 | });
  17 | 
```