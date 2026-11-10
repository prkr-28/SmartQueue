import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function runBrowserVerification() {
  console.log('🚀 Starting Real-Browser Visual Verification with Playwright Chromium...');

  const screenshotsDir = path.resolve(process.cwd(), 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  const consoleErrors: string[] = [];
  const recordConsole = (page: any, contextName: string) => {
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') {
        console.error(`[${contextName} Browser Error]`, msg.text());
        consoleErrors.push(`[${contextName}] ${msg.text()}`);
      }
    });
    page.on('pageerror', (err: any) => {
      console.error(`[${contextName} Page Error]`, err.message);
      consoleErrors.push(`[${contextName}] ${err.message}`);
    });
  };

  try {
    // ==========================================
    // 1. DESKTOP VIEWPORT (1280 x 800)
    // ==========================================
    console.log('\n🖥️  Testing Desktop Viewport (1280x800)...');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });
    const desktopPage = await desktopContext.newPage();
    recordConsole(desktopPage, 'Desktop');

    // A. Landing Page
    console.log('1. Visiting Landing Page...');
    await desktopPage.goto('http://localhost:5173/');
    await desktopPage.waitForLoadState('networkidle');
    await desktopPage.screenshot({ path: path.join(screenshotsDir, '01-desktop-landing.png'), fullPage: true });

    // B. Public TV Display Screen
    console.log('2. Visiting Public Waiting-Room Display Board...');
    await desktopPage.goto('http://localhost:5173/display');
    await desktopPage.waitForTimeout(2000);
    await desktopPage.screenshot({ path: path.join(screenshotsDir, '02-desktop-display-board.png'), fullPage: true });

    // C. Login Page
    console.log('3. Visiting Login Page & Signing in...');
    await desktopPage.goto('http://localhost:5173/login');
    await desktopPage.waitForLoadState('networkidle');
    await desktopPage.screenshot({ path: path.join(screenshotsDir, '03-desktop-login.png') });

    // Fill credentials
    await desktopPage.fill('input[type="email"]', 'patient1@smartqueue.test');
    await desktopPage.fill('input[type="password"]', 'Patient@123');
    await desktopPage.click('button[type="submit"]');
    await desktopPage.waitForURL('**/patient/dashboard');
    await desktopPage.waitForTimeout(1000);

    // D. Patient Dashboard
    console.log('4. Visiting Patient Dashboard...');
    await desktopPage.screenshot({ path: path.join(screenshotsDir, '04-desktop-dashboard.png'), fullPage: true });

    // E. Find Doctors Page
    console.log('5. Visiting Find Doctors Page...');
    await desktopPage.goto('http://localhost:5173/patient/doctors');
    await desktopPage.waitForLoadState('networkidle');
    await desktopPage.screenshot({ path: path.join(screenshotsDir, '05-desktop-doctors.png'), fullPage: true });

    // F. Book Appointment Wizard
    console.log('6. Testing Book Appointment Wizard...');
    await desktopPage.goto('http://localhost:5173/patient/book');
    await desktopPage.waitForLoadState('networkidle');
    await desktopPage.screenshot({ path: path.join(screenshotsDir, '06-desktop-book-step1.png'), fullPage: true });

    // Select Department
    await desktopPage.getByText('Cardiology').first().click();
    await desktopPage.waitForTimeout(500);
    // Select Doctor
    await desktopPage.getByRole('heading', { name: /Dr\./i }).first().click();
    await desktopPage.waitForTimeout(1000);
    await desktopPage.screenshot({ path: path.join(screenshotsDir, '07-desktop-book-slots.png'), fullPage: true });

    // Select first slot
    const slotBtn = desktopPage.locator('button:not([disabled]):has-text(":")').first();
    if (await slotBtn.isVisible()) {
      await slotBtn.click();
      await desktopPage.getByRole('button', { name: /Continue to Patient Info/i }).click();
      await desktopPage.waitForTimeout(500);
      await desktopPage.screenshot({ path: path.join(screenshotsDir, '08-desktop-book-reason.png'), fullPage: true });
    }

    // G. My Appointments
    console.log('7. Visiting My Appointments...');
    await desktopPage.goto('http://localhost:5173/patient/appointments');
    await desktopPage.waitForLoadState('networkidle');
    await desktopPage.screenshot({ path: path.join(screenshotsDir, '09-desktop-my-appointments.png'), fullPage: true });

    // H. Live Queue Tracker
    console.log('8. Visiting Live Queue Tracker...');
    await desktopPage.goto('http://localhost:5173/patient/queue');
    await desktopPage.waitForTimeout(1500);
    await desktopPage.screenshot({ path: path.join(screenshotsDir, '10-desktop-live-queue.png'), fullPage: true });

    // I. Family Dependents
    console.log('9. Visiting Family Members...');
    await desktopPage.goto('http://localhost:5173/patient/dependents');
    await desktopPage.waitForLoadState('networkidle');
    await desktopPage.screenshot({ path: path.join(screenshotsDir, '11-desktop-dependents.png'), fullPage: true });

    // J. Profile
    console.log('10. Visiting Profile & Settings...');
    await desktopPage.goto('http://localhost:5173/patient/profile');
    await desktopPage.waitForLoadState('networkidle');
    await desktopPage.screenshot({ path: path.join(screenshotsDir, '12-desktop-profile.png'), fullPage: true });

    await desktopContext.close();

    // ==========================================
    // 2. MOBILE VIEWPORT (375 x 667 - Mobile First)
    // ==========================================
    console.log('\n📱 Testing Mobile Viewport (375x667)...');
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 },
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    recordConsole(mobilePage, 'Mobile');

    // Mobile Landing Page
    console.log('1. Visiting Mobile Landing Page...');
    await mobilePage.goto('http://localhost:5173/');
    await mobilePage.waitForLoadState('networkidle');
    await mobilePage.screenshot({ path: path.join(screenshotsDir, '13-mobile-landing.png'), fullPage: true });

    // Mobile Login
    console.log('2. Visiting Mobile Login...');
    await mobilePage.goto('http://localhost:5173/login');
    await mobilePage.fill('input[type="email"]', 'patient1@smartqueue.test');
    await mobilePage.fill('input[type="password"]', 'Patient@123');
    await mobilePage.click('button[type="submit"]');
    await mobilePage.waitForURL('**/patient/dashboard');
    await mobilePage.waitForTimeout(1000);

    // Mobile Dashboard
    console.log('3. Visiting Mobile Dashboard...');
    await mobilePage.screenshot({ path: path.join(screenshotsDir, '14-mobile-dashboard.png'), fullPage: true });

    // Mobile Live Queue
    console.log('4. Visiting Mobile Live Queue...');
    await mobilePage.goto('http://localhost:5173/patient/queue');
    await mobilePage.waitForTimeout(1500);
    await mobilePage.screenshot({ path: path.join(screenshotsDir, '15-mobile-live-queue.png'), fullPage: true });

    // Mobile TV Board
    console.log('5. Visiting Mobile TV Display...');
    await mobilePage.goto('http://localhost:5173/display');
    await mobilePage.waitForTimeout(1500);
    await mobilePage.screenshot({ path: path.join(screenshotsDir, '16-mobile-display.png'), fullPage: true });

    await mobileContext.close();

    console.log('\n======================================================');
    console.log('🎉 REAL BROWSER VERIFICATION COMPLETED!');
    console.log(`📁 16 Full Page Screenshots saved to: ${screenshotsDir}`);
    console.log(`⚠️  Total Browser Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.error('Console errors:', consoleErrors);
    }
    console.log('======================================================\n');
  } catch (error) {
    console.error('Verification failed with error:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

runBrowserVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
