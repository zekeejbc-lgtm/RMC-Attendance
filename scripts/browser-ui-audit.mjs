import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import puppeteer from 'puppeteer-core';
import { assertResponsiveDataTreatment, denseResponsiveDataRoutes } from './browser-ui-audit-helpers.mjs';

const baseUrl = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:4173';
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const interactionsOnly = process.env.AUDIT_ONLY_INTERACTIONS === '1';
const evidenceDir = path.resolve('.superpowers/browser-task9');
const widths = [320, 375, 768, 1024, 1440];
const heights = { 320: 700, 375: 760, 768: 900, 1024: 768, 1440: 900 };
const routedViews = [
  { path: '/', role: null, ready: 'body' },
  { path: '/login', role: null, ready: '[role="dialog"]' },
  { path: '/register', role: null, ready: 'input' },
  { path: '/register/status', role: 'student', ready: 'button' },
  { path: '/dashboard', role: 'student', ready: 'main' },
  { path: '/student/qr', role: 'student', ready: 'main' },
  { path: '/student/events', role: 'student', ready: 'main' },
  { path: '/student/ceremonies', role: 'student', ready: 'main' },
  { path: '/student/records', role: 'student', ready: 'main' },
  { path: '/student/profile', role: 'student', ready: 'main' },
  { path: '/mayor/scan', role: 'mayor', ready: 'main' },
  { path: '/ssg/panel', role: 'ssg', ready: 'main' },
  { path: '/admin/attendance', role: 'ssg', ready: 'main' },
  { path: '/admin/members', role: 'ssg', ready: 'main' },
  { path: '/ossa/dashboard', role: 'ossa', ready: 'main' },
];

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function setRole(page, role) {
  await page.evaluate((nextRole) => {
    if (nextRole) localStorage.setItem('rmc_mock_session', `mock_uid_${nextRole}`);
    else localStorage.removeItem('rmc_mock_session');
    localStorage.setItem('iars-theme', 'light');
  }, role);
}

async function gotoRoute(page, route, width) {
  await setRole(page, route.role);
  await page.goto('about:blank');
  await page.goto(`${baseUrl}/#${route.path}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  await page.waitForSelector(route.ready, { timeout: 10_000 });
  await delay(route.path.includes('attendance') || route.path.includes('ossa') ? 500 : 150);
  const currentPath = await page.evaluate(() => window.location.hash.slice(1));
  assert(
    currentPath === route.path,
    `${route.path} at ${width}px redirected unexpectedly to ${currentPath}`,
  );
}

async function auditCurrentPage(page, route, width) {
  const dataRequirement = denseResponsiveDataRoutes[route.path] || null;
  const result = await page.evaluate(({ dataRequirement, routePath, viewportWidth }) => {
    const isVisible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const horizontalScrollReachable = (element) => {
      let ancestor = element.parentElement;
      while (ancestor && ancestor !== document.body) {
        const style = getComputedStyle(ancestor);
        if (['auto', 'scroll'].includes(style.overflowX) && ancestor.scrollWidth > ancestor.clientWidth + 1) return true;
        ancestor = ancestor.parentElement;
      }
      return false;
    };
    const horizontallyContained = (element) => {
      let ancestor = element.parentElement;
      while (ancestor && ancestor !== document.body) {
        const overflowX = getComputedStyle(ancestor).overflowX;
        if (['auto', 'scroll', 'hidden', 'clip'].includes(overflowX)) return true;
        ancestor = ancestor.parentElement;
      }
      return false;
    };
    const accessibleName = (element) => {
      const labelledBy = element.getAttribute('aria-labelledby');
      const labelledText = labelledBy
        ? labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' ')
        : '';
      return element.getAttribute('aria-label')
        || labelledText
        || element.getAttribute('title')
        || element.textContent
        || element.querySelector('img')?.getAttribute('alt')
        || '';
    };

    const controls = Array.from(document.querySelectorAll('button, a[href], input, select, textarea'))
      .filter(isVisible);
    const clippedControls = controls.flatMap((control) => {
      const rect = control.getBoundingClientRect();
      if (rect.left >= -1 && rect.right <= viewportWidth + 1) return [];
      if (horizontalScrollReachable(control)) return [];
      return [{
        name: accessibleName(control).trim().slice(0, 80),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        tag: control.tagName.toLowerCase(),
      }];
    });
    const unnamedButtons = controls
      .filter((control) => control.tagName === 'BUTTON' && !accessibleName(control).trim())
      .map((button) => button.outerHTML.slice(0, 160));
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"]')).filter(isVisible).map((dialog) => {
      const rect = dialog.getBoundingClientRect();
      const children = Array.from(dialog.children);
      const body = children[1];
      return {
        bottom: Math.round(rect.bottom),
        bodyClientHeight: body?.clientHeight || 0,
        bodyOverflowY: body ? getComputedStyle(body).overflowY : '',
        bodyScrollHeight: body?.scrollHeight || 0,
        hasBody: Boolean(body),
        hasHeader: Boolean(children[0]),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        top: Math.round(rect.top),
      };
    });
    const tables = dataRequirement ? Array.from(document.querySelectorAll(dataRequirement.tableSelector)) : [];
    const cards = dataRequirement ? Array.from(document.querySelectorAll(dataRequirement.cardSelector)) : [];
    const dataTreatment = dataRequirement ? {
      cardCount: cards.length,
      cardVisible: cards.some(isVisible),
      tableCount: tables.length,
      tableVisible: tables.some(isVisible),
    } : null;
    const charts = Array.from(document.querySelectorAll('[role="region"][aria-label*="chart" i], [role="region"][aria-label="Attendance visualization"]'))
      .filter(isVisible)
      .map((chart) => {
        const rect = Array.from(chart.querySelectorAll('svg'))
          .map((svg) => svg.getBoundingClientRect())
          .sort((first, second) => first.width * first.height - second.width * second.height)
          .at(-1);
        return { label: chart.getAttribute('aria-label'), width: Math.round(rect?.width || 0), height: Math.round(rect?.height || 0) };
      });
    const overflowElements = Array.from(document.querySelectorAll('body *'))
      .filter(isVisible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const ancestors = [];
        let ancestor = element.parentElement;
        while (ancestor && ancestors.length < 5) {
          const ancestorRect = ancestor.getBoundingClientRect();
          const ancestorStyle = getComputedStyle(ancestor);
          ancestors.push({
            className: typeof ancestor.className === 'string' ? ancestor.className.slice(0, 80) : '',
            clientWidth: ancestor.clientWidth,
            overflowX: ancestorStyle.overflowX,
            scrollWidth: ancestor.scrollWidth,
            tag: ancestor.tagName.toLowerCase(),
            width: Math.round(ancestorRect.width),
          });
          ancestor = ancestor.parentElement;
        }
        return {
          ancestors,
          className: typeof element.className === 'string' ? element.className.slice(0, 140) : '',
          contained: horizontallyContained(element),
          right: Math.round(rect.right),
          tag: element.tagName.toLowerCase(),
          text: (element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60),
          width: Math.round(rect.width),
        };
      })
      .filter((element) => element.right > viewportWidth + 1 || element.width > viewportWidth + 1)
      .filter((element) => !element.contained)
      .sort((first, second) => second.right - first.right)
      .slice(0, 8);
    const bodyOverflowX = getComputedStyle(document.body).overflowX;
    const htmlOverflowX = getComputedStyle(document.documentElement).overflowX;
    const pageHasHorizontalScrollbar = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      && !['hidden', 'clip'].includes(bodyOverflowX)
      && !['hidden', 'clip'].includes(htmlOverflowX);

    return {
      charts,
      clippedControls,
      controlCount: controls.length,
      dataTreatment,
      dialogs,
      documentWidth: document.documentElement.scrollWidth,
      overflowElements,
      pageHasHorizontalScrollbar,
      routePath,
      unnamedButtons,
      viewportWidth: document.documentElement.clientWidth,
    };
  }, { dataRequirement, routePath: route.path, viewportWidth: width });

  assert(
    !result.pageHasHorizontalScrollbar && result.overflowElements.length === 0,
    `${route.path} at ${width}px has full-page horizontal overflow; document ${result.documentWidth}px > viewport ${result.viewportWidth}px; offenders: ${JSON.stringify(result.overflowElements)}`,
  );
  assert(
    result.clippedControls.length === 0,
    `${route.path} at ${width}px has horizontally unreachable controls: ${JSON.stringify(result.clippedControls)}`,
  );
  assert(
    result.unnamedButtons.length === 0,
    `${route.path} at ${width}px has unnamed buttons: ${JSON.stringify(result.unnamedButtons)}`,
  );
  result.dialogs.forEach((dialog) => {
    assert(
      dialog.left >= -1 && dialog.right <= width + 1 && dialog.top >= -1 && dialog.bottom <= heights[width] + 1,
      `${route.path} at ${width}px has a dialog outside the viewport: ${JSON.stringify(dialog)}`,
    );
    assert(dialog.hasHeader && dialog.hasBody, `${route.path} at ${width}px has an incomplete modal header/body shell`);
    assert(
      dialog.bodyScrollHeight <= dialog.bodyClientHeight + 1 || ['auto', 'scroll'].includes(dialog.bodyOverflowY),
      `${route.path} at ${width}px has a non-scrollable overflowing modal body`,
    );
  });
  assertResponsiveDataTreatment(route.path, width, result.dataTreatment);
  result.charts.forEach((chart) => {
    assert(chart.width > 100 && chart.height > 100, `${route.path} at ${width}px has a zero-size or collapsed chart: ${JSON.stringify(chart)}`);
  });
  return result;
}

async function clickNamed(page, selector, name) {
  const found = await page.$$eval(selector, (elements, targetName) => {
    const target = elements.find((element) => {
      const label = element.getAttribute('aria-label') || element.textContent || '';
      return label.trim().toLowerCase().includes(targetName.toLowerCase());
    });
    if (!target) return false;
    target.focus();
    target.click();
    return true;
  }, name);
  assert(found, `Could not find ${selector} named ${name}`);
  await delay(100);
}

async function setThemeThroughUi(page, theme) {
  const currentTheme = await page.$$eval('button[aria-label^="Current theme:"]', (buttons) => {
    const visible = buttons.find((button) => {
      const rect = button.getBoundingClientRect();
      const style = getComputedStyle(button);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    });
    return visible?.getAttribute('aria-label') || '';
  });
  assert(currentTheme, `No visible theme control was available while setting ${theme}`);

  if (!currentTheme.toLowerCase().startsWith(`current theme: ${theme} mode.`)) {
    const clicked = await page.$$eval('button[aria-label^="Current theme:"]', (buttons) => {
      const visible = buttons.find((button) => {
        const rect = button.getBoundingClientRect();
        const style = getComputedStyle(button);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      });
      visible?.click();
      return Boolean(visible);
    });
    assert(clicked, `Could not activate a visible theme control for ${theme}`);
  }

  await delay(150);
  const appliedTheme = await page.evaluate(() => ({
    darkClass: document.documentElement.classList.contains('dark'),
    stored: localStorage.getItem('iars-theme'),
    toggles: Array.from(document.querySelectorAll('button[aria-label^="Current theme:"]'))
      .map((button) => button.getAttribute('aria-label')),
  }));
  assert(
    appliedTheme.stored === theme && appliedTheme.darkClass === (theme === 'dark'),
    `Theme control did not apply ${theme} through the provider: ${JSON.stringify(appliedTheme)}`,
  );
}

async function openEventDetails(page) {
  await clickNamed(page, 'main button', 'View Details & Map');
  await page.waitForFunction(() => Array.from(document.querySelectorAll('[role="dialog"]'))
    .some((dialog) => (dialog.textContent || '').includes('Geofence Verification Zone')));
}

async function verifyDrawerKeyboard(page) {
  await page.setViewport({ width: 320, height: heights[320], deviceScaleFactor: 1 });
  await gotoRoute(page, routedViews.find((route) => route.path === '/dashboard'), 320);
  const trigger = await page.$('button[aria-label="Open navigation"]');
  assert(trigger, 'Mobile drawer trigger is missing');
  await trigger.click();
  await page.waitForSelector('[role="dialog"][aria-label="Main navigation"]');
  assert(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Close navigation'), 'Drawer did not focus its first control');
  await page.keyboard.press('Tab');
  assert(await page.evaluate(() => (
    document.querySelector('[role="dialog"][aria-label="Main navigation"]')?.contains(document.activeElement)
      && (document.activeElement?.textContent || '').trim() === 'Home'
  )), 'Forward Tab did not move from the drawer close control to the first navigation item');
  await page.keyboard.down('Shift');
  await page.keyboard.press('Tab');
  await page.keyboard.up('Shift');
  assert(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Close navigation'), 'Shift+Tab did not return to the preceding drawer control');
  await page.keyboard.down('Shift');
  await page.keyboard.press('Tab');
  await page.keyboard.up('Shift');
  assert(await page.evaluate(() => (document.activeElement?.textContent || '').trim() === 'Sign Out'), 'Shift+Tab did not wrap to the drawer last control');
  await page.keyboard.press('Tab');
  assert(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Close navigation'), 'Forward Tab did not wrap to the drawer first control');
  await page.keyboard.press('Escape');
  await page.waitForSelector('[role="dialog"][aria-label="Main navigation"]', { hidden: true });
  assert(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Open navigation'), 'Drawer did not return focus to its trigger');
}

async function verifyDialogKeyboard(page) {
  await page.setViewport({ width: 375, height: heights[375], deviceScaleFactor: 1 });
  await gotoRoute(page, routedViews[0], 375);
  await clickNamed(page, 'button', 'Student Enrollment');
  await page.waitForSelector('[role="dialog"]');
  assert(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Close dialog'), 'Dialog did not focus its close control');
  await page.keyboard.press('Tab');
  assert(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Upload profile photo'), 'Forward Tab did not move to the dialog first body control');
  await page.keyboard.down('Shift');
  await page.keyboard.press('Tab');
  await page.keyboard.up('Shift');
  assert(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Close dialog'), 'Shift+Tab did not return to the dialog close control');
  await page.keyboard.down('Shift');
  await page.keyboard.press('Tab');
  await page.keyboard.up('Shift');
  assert(await page.evaluate(() => (document.activeElement?.textContent || '').includes('Next Phase')), 'Shift+Tab did not wrap to the dialog last control');
  await page.keyboard.press('Tab');
  assert(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Close dialog'), 'Forward Tab did not wrap to the dialog first control');
  await page.keyboard.press('Escape');
  await delay(250);
  const remainingDialogs = await page.$$eval('[role="dialog"]', (dialogs) => dialogs.map((dialog) => ({
    name: dialog.getAttribute('aria-labelledby')
      ? document.getElementById(dialog.getAttribute('aria-labelledby'))?.textContent
      : dialog.getAttribute('aria-label'),
    visible: Boolean(dialog.getBoundingClientRect().width && dialog.getBoundingClientRect().height),
  })));
  assert(remainingDialogs.length === 0, `Escape did not close the dialog: ${JSON.stringify(remainingDialogs)}`);
  assert(await page.evaluate(() => (document.activeElement?.textContent || '').includes('Student Enrollment')), 'Dialog did not return focus to its trigger');
}

async function verifyProtectedConfirmation(page) {
  await page.setViewport({ width: 1024, height: heights[1024], deviceScaleFactor: 1 });
  const route = routedViews.find((candidate) => candidate.path === '/ssg/panel');
  await gotoRoute(page, route, 1024);
  await clickNamed(page, 'button', 'Rizal Memorial Colleges');
  await clickNamed(page, 'button', 'Senior High School');
  await clickNamed(page, 'button', 'Academic Track');
  await clickNamed(page, 'button', 'STEM');
  await clickNamed(page, 'button', 'Grade 12');
  await clickNamed(page, 'button', 'Newton');
  await clickNamed(page, 'main button', 'Manage Pedro');
  await clickNamed(page, 'button', 'Add one sanction hour');
  await page.waitForFunction(() => Array.from(document.querySelectorAll('[role="dialog"]'))
    .some((dialog) => (dialog.textContent || '').toLowerCase().includes('confirm sanction change')));
  await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="modal-backdrop"]')).at(-1)?.click());
  assert(await page.evaluate(() => Array.from(document.querySelectorAll('[role="dialog"]'))
    .some((dialog) => (dialog.textContent || '').toLowerCase().includes('confirm sanction change'))), 'Protected confirmation closed on backdrop click');
  await page.keyboard.press('Escape');
}

async function verifyEventModalViewport(page) {
  const results = [];
  const route = routedViews.find((candidate) => candidate.path === '/student/events');
  for (const width of widths) {
    await page.setViewport({ width, height: heights[width], deviceScaleFactor: 1 });
    await gotoRoute(page, route, width);
    await openEventDetails(page);
    const result = await auditCurrentPage(page, route, width);
    assert(result.dialogs.length === 1, `/student/events at ${width}px did not expose exactly one event dialog`);
    results.push({ width, dialogs: result.dialogs.length });
    await page.keyboard.press('Escape');
    await page.waitForSelector('[role="dialog"]', { hidden: true });
  }
  return results;
}

async function verifyFocusRing(page) {
  const results = [];
  const route = routedViews.find((candidate) => candidate.path === '/register');
  for (const theme of ['light', 'dark']) {
    await page.setViewport({ width: 375, height: heights[375], deviceScaleFactor: 1 });
    await gotoRoute(page, route, 375);
    await setThemeThroughUi(page, theme);
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement)) return null;
      const style = getComputedStyle(active);
      return {
        focusVisible: active.matches(':focus-visible'),
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        tag: active.tagName.toLowerCase(),
      };
    });
    assert(
      focus?.focusVisible && focus.outlineStyle !== 'none' && Number.parseFloat(focus.outlineWidth) >= 3,
      `${theme} theme keyboard focus ring was not visibly styled: ${JSON.stringify(focus)}`,
    );
    results.push({ theme, ...focus });
  }
  return results;
}

async function captureThemeEvidence(page) {
  const shots = [
    { path: '/', role: null, width: 375, name: 'public' },
    { path: '/register', role: null, width: 375, name: 'registration-form' },
    { path: '/login', role: null, width: 375, name: 'login-modal', modal: true },
    { path: '/student/records', role: 'student', width: 375, name: 'student-records-mobile' },
    { path: '/student/records', role: 'student', width: 1440, name: 'student-records-desktop' },
    { path: '/admin/attendance', role: 'ssg', width: 1440, name: 'attendance-charts' },
    { path: '/ossa/dashboard', role: 'ossa', width: 375, name: 'ossa-mobile' },
    { path: '/student/events', role: 'student', width: 375, name: 'student-event-modal', modal: true, openEvent: true },
  ];
  for (const shot of shots) {
    for (const theme of ['light', 'dark']) {
      const route = routedViews.find((candidate) => candidate.path === shot.path);
      await page.setViewport({ width: shot.width, height: heights[shot.width], deviceScaleFactor: 1 });
      await gotoRoute(page, { ...route, role: shot.role }, shot.width);
      await setThemeThroughUi(page, theme);
      if (shot.openEvent) await openEventDetails(page);
      await delay(650);
      await page.screenshot({ path: path.join(evidenceDir, `${shot.name}-${shot.width}-${theme}.png`), fullPage: !shot.modal });
    }
  }
  return shots.length * 2;
}

await fs.mkdir(evidenceDir, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--force-device-scale-factor=1'],
});
const page = await browser.newPage();
const browserMessages = [];
page.on('console', (message) => {
  if (['error', 'warn', 'warning'].includes(message.type())) browserMessages.push({ type: message.type(), text: message.text() });
});
page.on('pageerror', (error) => browserMessages.push({ type: 'pageerror', text: error.message }));

const matrix = [];
try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  await page.waitForSelector('body');
  await delay(300);

  if (!interactionsOnly) {
    for (const width of widths) {
      await page.setViewport({ width, height: heights[width], deviceScaleFactor: 1 });
      for (const route of routedViews) {
        await gotoRoute(page, route, width);
        matrix.push(await auditCurrentPage(page, route, width));
      }
    }
  }

  await verifyDrawerKeyboard(page);
  await verifyDialogKeyboard(page);
  await verifyProtectedConfirmation(page);
  const eventModalChecks = await verifyEventModalViewport(page);
  const focusRings = await verifyFocusRing(page);
  const screenshotCount = interactionsOnly ? 0 : await captureThemeEvidence(page);

  const actionableMessages = browserMessages.filter(({ text }) =>
    !text.includes('Failed to load resource')
    && !text.includes('Download the React DevTools')
    && !text.includes('cdn.tailwindcss.com should not be used in production')
    && !text.includes('Firebase: Using placeholder keys'));
  assert(actionableMessages.length === 0, `Browser console errors/warnings: ${JSON.stringify(actionableMessages)}`);

  const report = {
    browser: await browser.version(),
    checks: matrix.length,
    consoleMessages: actionableMessages,
    eventModalChecks,
    focusRings,
    interactions: ['drawer forward/reverse Tab order, containment, Escape, focus return', 'dialog forward/reverse Tab order, containment, Escape, focus return', 'protected confirmation backdrop'],
    matrix: matrix.map(({ routePath, viewportWidth, controlCount, charts, dataTreatment, dialogs }) => ({
      routePath, viewportWidth, controlCount, charts, dataTreatment, dialogCount: dialogs.length,
    })),
    screenshots: screenshotCount,
    viewports: widths,
  };
  await fs.writeFile(path.join(evidenceDir, 'audit.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`PASS ${matrix.length} routed viewport checks; ${report.screenshots} theme screenshots; keyboard/protected-dialog interactions passed.`);
} finally {
  await browser.close();
}
