/**
 * Limits concurrent Puppeteer browser launches to avoid host OOM.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export class PuppeteerSemaphore {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly maxConcurrent: number = 2) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.maxConcurrent) {
      this.active++;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.queue.push(() => {
        this.active++;
        resolve();
      });
    });
  }

  private release(): void {
    this.active--;
    const next = this.queue.shift();
    if (next) next();
  }
}

/** Shared across certificate + staff PDF generation. */
export const pdfSemaphore = new PuppeteerSemaphore(
  Math.max(1, parseInt(process.env.PUPPETEER_MAX_CONCURRENT || '2', 10) || 2),
);

/**
 * Resolve Chrome for Puppeteer. PM2 may inherit a Cursor sandbox
 * PUPPETEER_CACHE_DIR that does not contain Chrome — fall back to the
 * real cache under ~/.cache/puppeteer.
 */
export function resolveChromeExecutable(): string | undefined {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) {
    return fromEnv;
  }

  const cacheRoots = [
    process.env.PUPPETEER_CACHE_DIR,
    path.join(os.homedir(), '.cache', 'puppeteer'),
    '/root/.cache/puppeteer',
  ].filter((p): p is string => Boolean(p));

  for (const root of cacheRoots) {
    const chromeRoot = path.join(root, 'chrome');
    if (!fs.existsSync(chromeRoot)) continue;
    let versions: string[] = [];
    try {
      versions = fs.readdirSync(chromeRoot).sort().reverse();
    } catch {
      continue;
    }
    for (const ver of versions) {
      for (const rel of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
        const candidate = path.join(chromeRoot, ver, rel);
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
    }
  }
  return undefined;
}

export function puppeteerLaunchOptions(
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  const executablePath = resolveChromeExecutable();
  return {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
    ...(executablePath ? { executablePath } : {}),
    ...extra,
  };
}
