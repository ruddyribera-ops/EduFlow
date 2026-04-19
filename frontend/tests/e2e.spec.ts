// EduFlow E2E Tests — Next.js frontend
// Run with: npx playwright test
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

test.describe('EduFlow Authentication', () => {
  test('login page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page).toHaveTitle(/EduFlow/i);
  });

  test('login form submits with valid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel(/email/i).fill('admin@eduflow.com');
    await page.getByLabel(/password/i).fill('password');
    await page.getByRole('button', { name: /sign in/i }).click();
    // Adjust expectation based on actual post-login redirect
    await expect(page).not.toHaveURL(/\/login$/);
  });
});

test.describe('EduFlow Dashboard', () => {
  test('dashboard page loads for authenticated user', async ({ page }) => {
    // Adjust URL and auth flow based on your Next.js middleware
    await page.goto(`${BASE_URL}/`);
    // Should redirect to login or show dashboard
    await expect(page).toHaveTitle(/EduFlow/i);
  });
});

test.describe('EduFlow Students', () => {
  test('students list page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/students`);
    await expect(page).toHaveTitle(/Students/i);
  });
});

test.describe('EduFlow Admissions', () => {
  test('admissions page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admissions`);
    await expect(page).toHaveTitle(/Admissions/i);
  });
});
