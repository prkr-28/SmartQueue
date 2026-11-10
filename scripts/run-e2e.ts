import { spawn } from 'child_process';
import http from 'http';
import path from 'path';

function waitForUrl(url: string, timeoutMs = 30000): Promise<void> {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http
        .get(url, (res) => {
          if (res.statusCode && res.statusCode < 500) {
            resolve();
          } else if (Date.now() - startTime > timeoutMs) {
            reject(new Error(`Timeout waiting for ${url} (status: ${res.statusCode})`));
          } else {
            setTimeout(check, 500);
          }
        })
        .on('error', () => {
          if (Date.now() - startTime > timeoutMs) {
            reject(new Error(`Timeout waiting for ${url}`));
          } else {
            setTimeout(check, 500);
          }
        });
    };
    check();
  });
}

function runCommand(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: true,
    });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command ${cmd} ${args.join(' ')} failed with code ${code}`));
    });
  });
}

async function main() {
  console.log('🚀 Starting SmartQueue Backend and Frontend Servers for E2E Verification...');

  // Start Server
  const serverProcess = spawn('node', ['server/dist/index.js'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development', PORT: '5000' },
  });

  // Start Client Preview
  const clientProcess = spawn('npx', ['vite', 'preview', '--port', '5173', '--strictPort'], {
    cwd: path.resolve(process.cwd(), 'client'),
    stdio: 'inherit',
    shell: true,
  });

  const cleanup = () => {
    console.log('\n🛑 Shutting down backend and frontend servers...');
    serverProcess.kill('SIGTERM');
    clientProcess.kill('SIGTERM');
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  try {
    console.log('⏳ Waiting for backend (http://localhost:5000/api/health)...');
    await waitForUrl('http://localhost:5000/api/health', 25000);
    console.log('✅ Backend API is healthy and connected to MongoDB Atlas!');

    console.log('⏳ Waiting for frontend (http://localhost:5173)...');
    await waitForUrl('http://localhost:5173', 15000);
    console.log('✅ Frontend Vite preview server is up!');

    console.log('\n📸 Step 1: Running Real Browser Journey Verification & Screenshot Capture...');
    await runCommand('npx', ['tsx', 'scripts/verify-browser.ts']);

    console.log('\n🧪 Step 2: Running Automated Playwright Test Suite...');
    await runCommand('npx', ['playwright', 'test']);

    console.log('\n🎉 ALL REAL BROWSER CHECKS & PLAYWRIGHT SUITES PASSED 100%!');
  } catch (err) {
    console.error('❌ E2E Verification failed:', err);
    process.exitCode = 1;
  } finally {
    cleanup();
    process.exit(process.exitCode || 0);
  }
}

main();
