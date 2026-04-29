// Playwright-based scraper for Auditorio Telmex's events page.
//
// The page renders three parallel sibling columns (image, text, links) inside
// section.logos > div.baja. Each column contains one element per event in the
// same order, so we extract two arrays and zip them by index.
//
// Returns an array of raw records suitable for downstream LLM extraction:
//   { rawText, imageUrl, sourceUrl }
//
// Polite scraping: realistic User-Agent, single navigation per run,
// no concurrency. The brief is explicit about not over-engineering this.

import { chromium, Browser } from 'playwright';

const PROGRAMACION_URL = 'https://www.auditorio-telmex.com/programacion.php';
const SITE_BASE = 'https://www.auditorio-telmex.com/';

// Realistic UA. Identifies us as a normal Chrome browser, which is what
// Playwright is actually driving. Not a stealth move — just polite.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

// Public shape of one scraped event before LLM extraction runs on it.
export interface ScrapedEvent {
  rawText: string;       // title + dates, joined with newlines, fed to extractEvent()
  imageUrl: string | null;
  sourceUrl: string;     // e.g. https://www.auditorio-telmex.com/evento.php?e=1240
}

export async function scrapeAuditorioTelmex(): Promise<ScrapedEvent[]> {
  // headless: false when SCRAPER_HEADED=1 in the env. Default headless: true.
  // The visible run is a teaching/debug mode, not a production mode.
  const headed = process.env.SCRAPER_HEADED === '1';

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: !headed });
    const context = await browser.newContext({ userAgent: USER_AGENT });
    const page = await context.newPage();

    // Single navigation. waitUntil 'domcontentloaded' is enough — the event
    // markup is server-rendered and present in initial HTML, no JS hydration
    // needed. Using 'networkidle' would be slower for no benefit here.
    await page.goto(PROGRAMACION_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    // Defensive: confirm the structural containers exist before we extract.
    // If the site's layout changes, we want a clear failure here rather than
    // a silent return of zero events.
    await page.waitForSelector('div.moduloImgLogos > div.imgLogo', { timeout: 10_000 });
    await page.waitForSelector('div.moduloTxtLogos > p.txtLogo', { timeout: 10_000 });

    // Pull both columns in a single page.evaluate. Doing it in one round trip
    // is cheaper than two and keeps the zip-by-index correct: both arrays
    // come from the same DOM snapshot.
    const raw = await page.evaluate(() => {
      const imgBlocks = Array.from(
        document.querySelectorAll<HTMLDivElement>('div.moduloImgLogos > div.imgLogo')
      );
      const txtBlocks = Array.from(
        document.querySelectorAll<HTMLParagraphElement>('div.moduloTxtLogos > p.txtLogo')
      );

      const images = imgBlocks.map((div) => {
        const a = div.querySelector('a');
        const img = div.querySelector('img');
        return {
          imageSrc: img?.getAttribute('src') ?? null,
          linkHref: a?.getAttribute('href') ?? null,
        };
      });

      // textContent collapses <br> into '\n' on its own — gives us a clean
      // multiline string per event, which is exactly what extractEvent() wants.
      // Walk children and join with '\n'. We use this instead of textContent
// (which strips <br> entirely) or innerText (which depends on rendered
// layout and is not reliably available outside of rendering).
const texts = txtBlocks.map((p) => {
  const parts: string[] = [];
  p.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.textContent ?? '').trim();
      if (t) parts.push(t);
    } else if (node.nodeName === 'BR') {
      // Skip — the join below will insert the newline between text nodes.
    }
  });
  return parts.join('\n');
});

      return { images, texts };
    });

    if (raw.images.length !== raw.texts.length) {
      throw new Error(
        `Auditorio Telmex column mismatch: ${raw.images.length} images vs ${raw.texts.length} texts. ` +
        `Page layout may have changed.`
      );
    }

    // Zip into ScrapedEvent records. Skip any entry with no link — without
    // the source URL we can't dedup or attribute, so it's not a useful row.
    const events: ScrapedEvent[] = [];
    for (let i = 0; i < raw.images.length; i++) {
      const { imageSrc, linkHref } = raw.images[i];
      const rawText = raw.texts[i];

      if (!linkHref) continue;

      events.push({
        rawText,
        imageUrl: imageSrc ? new URL(imageSrc, SITE_BASE).toString() : null,
        sourceUrl: new URL(linkHref, SITE_BASE).toString(),
      });
    }

    return events;
  } finally {
    // Close the browser whether the scrape succeeded or threw.
    // Forgetting this leaks Chromium processes — the kind of bug that doesn't
    // show up in dev but eats memory on a server.
    if (browser) {
      await browser.close();
    }
  }
}