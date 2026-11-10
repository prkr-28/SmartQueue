import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function runBrowserVerification() {
  console.log('🚀 Starting Real-Browser Visual Verification with Playwright Chromium across all roles...');

  const screenshotsDir = path.resolve(process.cwd(), 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  const consoleErrors: string[] = [];
  const recordConsole = (page: any, contextName: string) => {
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore expected favicon or harmless react warnings if any
        console.error(`[${contextName} Browser Error]`, text);
        consoleErrors.push(`[${contextName}] ${text}`);
      }
    });
    page.on('pageerror', (err: any) => {
      console.error(`[${contextName} Page Error]`, err.message);
      consoleErrors.push(`[${contextName}] ${err.message}`);
    });
  };

  try {
    // ==========================================
    // 1. DESKTOP VIEWPORT: PATIENT FLOW
    // ==========================================
    console.log('\n🖥️  Testing Desktop Patient Portal...');
    const patientContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const patientPage = await patientContext.newPage();
    recordConsole(patientPage, 'Desktop-Patient');

    console.log('1. Visiting Landing Page...');
    await patientPage.goto('http://localhost:5173/');
    await patientPage.waitForLoadState('networkidle');
    await patientPage.screenshot({ path: path.join(screenshotsDir, '01-desktop-landing.png'), fullPage: true });

    console.log('2. Visiting Public Waiting-Room Display Board...');
    await patientPage.goto('http://localhost:5173/display');
    await patientPage.waitForTimeout(1500);
    await patientPage.screenshot({ path: path.join(screenshotsDir, '02-desktop-display-board.png'), fullPage: true });

    console.log('3. Patient Sign-In...');
    await patientPage.goto('http://localhost:5173/login');
    await patientPage.waitForLoadState('networkidle');
    await patientPage.screenshot({ path: path.join(screenshotsDir, '03-desktop-login.png') });
    await patientPage.fill('input[type="email"]', 'patient1@smartqueue.test');
    await patientPage.fill('input[type="password"]', 'Patient@123');
    await patientPage.click('button[type="submit"]');
    await patientPage.waitForURL('**/patient/dashboard');
    await patientPage.waitForTimeout(1000);

    console.log('4. Patient Dashboard...');
    await patientPage.screenshot({ path: path.join(screenshotsDir, '04-desktop-dashboard.png'), fullPage: true });

    console.log('5. Patient Live Queue Tracker...');
    await patientPage.goto('http://localhost:5173/patient/queue');
    await patientPage.waitForTimeout(1500);
    await patientPage.screenshot({ path: path.join(screenshotsDir, '10-desktop-live-queue.png'), fullPage: true });

    await patientContext.close();

    // ==========================================
    // 2. DESKTOP VIEWPORT: RECEPTIONIST FLOW
    // ==========================================
    console.log('\n🖥️  Testing Desktop Receptionist Portal...');
    const receptContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const receptPage = await receptContext.newPage();
    recordConsole(receptPage, 'Desktop-Receptionist');

    await receptPage.goto('http://localhost:5173/login');
    await receptPage.fill('input[type="email"]', 'receptionist1@smartqueue.test');
    await receptPage.fill('input[type="password"]', 'Receptionist@123');
    await receptPage.click('button[type="submit"]');
    await receptPage.waitForURL('**/receptionist/dashboard');
    await receptPage.waitForTimeout(1000);

    console.log('6. Receptionist Dashboard...');
    await receptPage.screenshot({ path: path.join(screenshotsDir, '17-desktop-receptionist-dashboard.png'), fullPage: true });

    console.log('7. Receptionist Walk-in Booking Desk...');
    await receptPage.goto('http://localhost:5173/receptionist/walk-in');
    await receptPage.waitForLoadState('networkidle');
    await receptPage.screenshot({ path: path.join(screenshotsDir, '18-desktop-receptionist-walkin.png'), fullPage: true });

    console.log('8. Receptionist Live Queue Manager Board...');
    await receptPage.goto('http://localhost:5173/receptionist/queue');
    await receptPage.waitForTimeout(1500);
    await receptPage.screenshot({ path: path.join(screenshotsDir, '19-desktop-receptionist-queue.png'), fullPage: true });

    console.log('9. Receptionist Billing Desk...');
    await receptPage.goto('http://localhost:5173/receptionist/billing');
    await receptPage.waitForLoadState('networkidle');
    await receptPage.screenshot({ path: path.join(screenshotsDir, '20-desktop-receptionist-billing.png'), fullPage: true });

    await receptContext.close();

    // ==========================================
    // 3. DESKTOP VIEWPORT: DOCTOR FLOW
    // ==========================================
    console.log('\n🖥️  Testing Desktop Doctor Portal...');
    const docContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const docPage = await docContext.newPage();
    recordConsole(docPage, 'Desktop-Doctor');

    await docPage.goto('http://localhost:5173/login');
    await docPage.fill('input[type="email"]', 'doctor1@smartqueue.test');
    await docPage.fill('input[type="password"]', 'Doctor@123');
    await docPage.click('button[type="submit"]');
    await docPage.waitForURL('**/doctor/dashboard');
    await docPage.waitForTimeout(1000);

    console.log('10. Doctor Dashboard...');
    await docPage.screenshot({ path: path.join(screenshotsDir, '21-desktop-doctor-dashboard.png'), fullPage: true });

    console.log('11. Doctor Live Queue Console...');
    await docPage.goto('http://localhost:5173/doctor/queue');
    await docPage.waitForTimeout(1500);
    await docPage.screenshot({ path: path.join(screenshotsDir, '22-desktop-doctor-queue.png'), fullPage: true });

    console.log('12. Doctor Schedule & Leaves Manager...');
    await docPage.goto('http://localhost:5173/doctor/schedule');
    await docPage.waitForLoadState('networkidle');
    await docPage.screenshot({ path: path.join(screenshotsDir, '24-desktop-doctor-schedule.png'), fullPage: true });

    await docContext.close();

    // ==========================================
    // 4. DESKTOP VIEWPORT: ADMIN FLOW
    // ==========================================
    console.log('\n🖥️  Testing Desktop Admin Analytics Portal...');
    const adminContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const adminPage = await adminContext.newPage();
    recordConsole(adminPage, 'Desktop-Admin');

    await adminPage.goto('http://localhost:5173/login');
    await adminPage.fill('input[type="email"]', 'admin@smartqueue.test');
    await adminPage.fill('input[type="password"]', 'Admin@123');
    await adminPage.click('button[type="submit"]');
    await adminPage.waitForURL('**/admin/dashboard');
    await adminPage.waitForTimeout(1500);

    console.log('13. Admin Analytics Dashboard (Recharts)...');
    await adminPage.screenshot({ path: path.join(screenshotsDir, '25-desktop-admin-analytics.png'), fullPage: true });

    console.log('14. Admin Departments Management...');
    await adminPage.goto('http://localhost:5173/admin/departments');
    await adminPage.waitForLoadState('networkidle');
    await adminPage.screenshot({ path: path.join(screenshotsDir, '26-desktop-admin-departments.png'), fullPage: true });

    console.log('15. Admin Staff & Doctors Management...');
    await adminPage.goto('http://localhost:5173/admin/staff');
    await adminPage.waitForLoadState('networkidle');
    await adminPage.screenshot({ path: path.join(screenshotsDir, '27-desktop-admin-staff.png'), fullPage: true });

    console.log('16. Admin Security Audit Logs...');
    await adminPage.goto('http://localhost:5173/admin/audit-logs');
    await adminPage.waitForLoadState('networkidle');
    await adminPage.screenshot({ path: path.join(screenshotsDir, '28-desktop-admin-audit.png'), fullPage: true });

    console.log('17. Admin System Settings...');
    await adminPage.goto('http://localhost:5173/admin/settings');
    await adminPage.waitForLoadState('networkidle');
    await adminPage.screenshot({ path: path.join(screenshotsDir, '29-desktop-admin-settings.png'), fullPage: true });

    await adminContext.close();

    // ==========================================
    // 5. MOBILE VIEWPORT (375 x 667)
    // ==========================================
    console.log('\n📱 Testing Mobile Viewport (375x667)...');
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 },
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    recordConsole(mobilePage, 'Mobile');

    console.log('18. Mobile Landing Page...');
    await mobilePage.goto('http://localhost:5173/');
    await mobilePage.waitForLoadState('networkidle');
    await mobilePage.screenshot({ path: path.join(screenshotsDir, '13-mobile-landing.png'), fullPage: true });

    console.log('19. Mobile Waiting Room Display...');
    await mobilePage.goto('http://localhost:5173/display');
    await mobilePage.waitForTimeout(1500);
    await mobilePage.screenshot({ path: path.join(screenshotsDir, '16-mobile-display.png'), fullPage: true });

    // Login as Receptionist on mobile
    await mobilePage.goto('http://localhost:5173/login');
    await mobilePage.fill('input[type="email"]', 'receptionist1@smartqueue.test');
    await mobilePage.fill('input[type="password"]', 'Receptionist@123');
    await mobilePage.click('button[type="submit"]');
    await mobilePage.waitForURL('**/receptionist/dashboard');
    await mobilePage.waitForTimeout(1000);

    console.log('20. Mobile Receptionist Dashboard...');
    await mobilePage.screenshot({ path: path.join(screenshotsDir, '30-mobile-receptionist-dashboard.png'), fullPage: true });

    await mobileContext.close();

    console.log('\n======================================================');
    console.log('🎉 REAL BROWSER VERIFICATION COMPLETED FOR ALL 4 ROLES!');
    console.log(`📁 Captured Full Page Screenshots saved to: ${screenshotsDir}`);
    console.log(`⚠️  Total Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.warn('Console error messages:', consoleErrors);
    }
    console.log('======================================================\n');
  } catch (error) {
    console.error('Browser verification failed:', error);
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
