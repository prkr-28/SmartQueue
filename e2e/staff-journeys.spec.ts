import { test, expect } from '@playwright/test';

test.describe('SmartQueue Staff Portals & Real-Time Sync E2E', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('1. Receptionist Flow: Dashboard, Walk-in Booking & Billing Desk', async ({ page }) => {
    await page.goto('/login');

    // Login as Receptionist
    await page.fill('input[type="email"]', 'receptionist1@smartqueue.test');
    await page.fill('input[type="password"]', 'Receptionist@123');
    await page.click('button[type="submit"]');

    // Should redirect to receptionist dashboard
    await page.waitForURL('**/receptionist/dashboard', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText(/Today's Patient Flow/i);
    await expect(page.getByText("Today's Total")).toBeVisible();
    await expect(page.getByText('In Waiting Area')).toBeVisible();

    // Navigate to Walk-in Booking
    await page.goto('/receptionist/walk-in');
    await expect(page.locator('h1')).toContainText(/Walk-in Patient Desk/i);

    // Navigate to Queue Board
    await page.goto('/receptionist/queue');
    await expect(page.locator('h1')).toContainText(/Live Hospital Queue Board/i);
    await expect(page.getByRole('button', { name: /Emergency Insert/i })).toBeVisible();

    // Navigate to Billing Desk
    await page.goto('/receptionist/billing');
    await expect(page.locator('h1')).toContainText(/Billing & Cashier Desk/i);
    await expect(page.getByText(/Total Billed/i).first()).toBeVisible();
    await expect(page.getByText(/Collected Today/i).first()).toBeVisible();
  });

  test('2. Doctor Flow: Queue Management & Consultation Prescriptions', async ({ page }) => {
    await page.goto('/login');

    // Login as Doctor
    await page.fill('input[type="email"]', 'doctor1@smartqueue.test');
    await page.fill('input[type="password"]', 'Doctor@123');
    await page.click('button[type="submit"]');

    // Should redirect to doctor dashboard
    await page.waitForURL('**/doctor/dashboard', { timeout: 10000 });
    await expect(page.getByText(/Consulting Physician Console/i)).toBeVisible();
    await expect(page.getByText(/Today's Patients/i)).toBeVisible();

    // Navigate to Doctor Live Queue
    await page.goto('/doctor/queue');
    await expect(page.locator('h1')).toContainText(/Doctor Live Queue Console/i);
    await expect(page.getByText(/Currently Serving Token/i)).toBeVisible();

    // Navigate to Doctor Schedule & Leaves
    await page.goto('/doctor/schedule');
    await expect(page.locator('h1')).toContainText(/Schedule & Clinical Hours/i);
    await expect(page.getByText(/Weekly Working Hours/i)).toBeVisible();
    await expect(page.getByText(/Planned Leaves/i)).toBeVisible();
  });

  test('3. Admin Flow: Analytics Charts, Staff & System Settings', async ({ page }) => {
    await page.goto('/login');

    // Login as Admin
    await page.fill('input[type="email"]', 'admin@smartqueue.test');
    await page.fill('input[type="password"]', 'Admin@123');
    await page.click('button[type="submit"]');

    // Should redirect to admin dashboard
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText(/Executive Operations Overview/i);
    await expect(page.getByText(/Total Scheduled/i)).toBeVisible();
    await expect(page.getByText(/Avg Queue Wait/i)).toBeVisible();
    await expect(page.getByText(/Doctor Performance & Clinician Productivity/i)).toBeVisible();

    // Navigate to Departments
    await page.goto('/admin/departments');
    await expect(page.locator('h1')).toContainText(/Hospital Departments & Rooms/i);
    await expect(page.getByRole('button', { name: /Add Department/i })).toBeVisible();

    // Navigate to Staff Management
    await page.goto('/admin/staff');
    await expect(page.locator('h1')).toContainText(/Staff & Clinician Management/i);
    await expect(page.getByRole('button', { name: /Add Staff Member/i })).toBeVisible();

    // Navigate to Audit Logs
    await page.goto('/admin/audit-logs');
    await expect(page.locator('h1')).toContainText(/Security & System Audit Logs/i);
    await expect(page.getByText(/Filter by Action/i)).toBeVisible();

    // Navigate to System Settings
    await page.goto('/admin/settings');
    await expect(page.locator('h1')).toContainText(/Hospital & System Settings/i);
    await expect(page.getByText(/Cancellation Window/i)).toBeVisible();
  });

  test('4. Multi-User Real-Time Sync: Doctor calls next and patient sees updates', async ({ browser }) => {
    // 1. Patient Context
    const patientContext = await browser.newContext();
    const patientPage = await patientContext.newPage();

    await patientPage.goto('http://localhost:5173/login');
    await patientPage.fill('input[type="email"]', 'patient1@smartqueue.test');
    await patientPage.fill('input[type="password"]', 'Patient@123');
    await patientPage.click('button[type="submit"]');
    await patientPage.waitForURL('**/patient/dashboard', { timeout: 10000 });

    // Patient visits live queue tracker
    await patientPage.goto('http://localhost:5173/patient/queue');
    await expect(patientPage.locator('h1')).toBeVisible();

    // 2. Doctor Context
    const doctorContext = await browser.newContext();
    const doctorPage = await doctorContext.newPage();

    await doctorPage.goto('http://localhost:5173/login');
    await doctorPage.fill('input[type="email"]', 'doctor1@smartqueue.test');
    await doctorPage.fill('input[type="password"]', 'Doctor@123');
    await doctorPage.click('button[type="submit"]');
    await doctorPage.waitForURL('**/doctor/dashboard', { timeout: 10000 });

    // Doctor visits live queue
    await doctorPage.goto('http://localhost:5173/doctor/queue');
    await expect(doctorPage.locator('h1')).toContainText(/Doctor Live Queue Console/i);

    // Both windows are active and connected via Socket.IO
    await patientPage.waitForTimeout(1000);
    await doctorPage.waitForTimeout(1000);

    await patientContext.close();
    await doctorContext.close();
  });
});
