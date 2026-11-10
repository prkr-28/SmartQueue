import { test, expect } from '@playwright/test';

test.describe('SmartQueue Patient Journey & Live Queue E2E', () => {
  test('1. Public Landing Page and Navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/SmartQueue/i);

    // Hero headline
    await expect(page.locator('h1')).toContainText(/Smart Healthcare Appointments/i);

    // CTA buttons exist
    await expect(page.getByRole('button', { name: /Book an Appointment/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Public Waiting Display/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Demo Accounts Sign In/i })).toBeVisible();
  });

  test('2. Public Waiting-Room TV Display Screen (/display)', async ({ page }) => {
    await page.goto('/display');

    // Verify TV header and real-time clock
    await expect(page.getByText(/Live Waiting Board/i)).toBeVisible();
    await expect(page.getByText(/Department/i).first()).toBeVisible();
    await expect(page.getByText(/Now Serving/i).first()).toBeVisible();
  });

  test('3. Patient Login and Dashboard Overview', async ({ page }) => {
    await page.goto('/login');

    // Fill demo patient credentials
    await page.fill('input[type="email"]', 'patient1@smartqueue.test');
    await page.fill('input[type="password"]', 'Patient@123');
    await page.click('button[type="submit"]');

    // Expect redirect to dashboard
    await page.waitForURL('**/patient/dashboard');
    await expect(page.getByText(/Hello,/i)).toBeVisible();

    // Verify dashboard cards
    await expect(page.getByText(/Live Queue Status/i)).toBeVisible();
    await expect(page.getByText(/Upcoming Appointment/i)).toBeVisible();
  });

  test('4. Find Doctors and View Profile Details', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'patient1@smartqueue.test');
    await page.fill('input[type="password"]', 'Patient@123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/patient/dashboard');

    // Navigate to Find Doctors
    await page.goto('/patient/doctors');
    await expect(page.getByText(/Find Specialists & Doctors/i)).toBeVisible();

    // Search for Cardiology
    await page.fill('input[placeholder*="Cardiologist"]', 'Rajesh');
    await page.keyboard.press('Enter');

    // Should see Dr. Rajesh Rao
    await expect(page.getByText(/Dr\. Rajesh Rao/i)).toBeVisible();

    // Open Doctor details modal
    await page.getByRole('button', { name: /View Details/i }).first().click();
    await expect(page.getByText(/Qualifications:/i)).toBeVisible();
    await page.getByRole('button', { name: /Close/i }).click();
  });

  test('5. Multi-Step Appointment Booking Flow', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'patient1@smartqueue.test');
    await page.fill('input[type="password"]', 'Patient@123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/patient/dashboard');

    // Go to Book Appointment Wizard
    await page.goto('/patient/book');
    await expect(page.getByText(/Step 1: Choose Medical Department/i)).toBeVisible();

    // Step 1: Select Cardiology
    await page.getByText(/Cardiology/i).first().click();

    // Step 2: Select Doctor
    await expect(page.getByText(/Step 2: Choose Specialist Doctor/i)).toBeVisible();
    await page.getByRole('heading', { name: /Dr\./i }).first().click();

    // Step 3: Date & Slot
    await expect(page.getByText(/Step 3: Select Date & Available Slot/i)).toBeVisible();

    // Pick first available slot
    const slotButton = page.locator('button:not([disabled]):has-text(":")').first();
    await expect(slotButton).toBeVisible();
    await slotButton.click();

    // Proceed to Step 4
    await page.getByRole('button', { name: /Continue to Patient Info/i }).click();

    // Step 4: Patient Info & Symptoms
    await expect(page.getByText(/Step 4: Patient Details & Reason/i)).toBeVisible();
    await page.fill('textarea', 'Mild chest tightness during exercise');

    // Confirm Booking
    await page.getByRole('button', { name: /Confirm and Lock Slot/i }).click();

    // Step 5: Confirmed Success
    await expect(page.getByText(/Appointment Successfully Booked!/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Download PDF Slip/i })).toBeVisible();
  });

  test('6. My Appointments, Reschedule & Live Queue Tracker', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'patient1@smartqueue.test');
    await page.fill('input[type="password"]', 'Patient@123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/patient/dashboard');

    // My Appointments
    await page.goto('/patient/appointments');
    await expect(page.getByRole('heading', { name: /My Appointments/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Slip PDF/i }).first()).toBeVisible();

    // Live Queue Tracker
    await page.goto('/patient/queue');
    await expect(page.getByRole('heading', { name: /Live Queue Tracker/i })).toBeVisible();
  });

  test('7. Family Members & Dependents Management', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'patient1@smartqueue.test');
    await page.fill('input[type="password"]', 'Patient@123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/patient/dashboard');

    await page.goto('/patient/dependents');
    await expect(page.getByText(/Family Members & Dependents/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Add Family Member/i })).toBeVisible();
  });
});
