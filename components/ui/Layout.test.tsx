import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import Layout from './Layout';
import { ThemeProvider } from '../ThemeContext';

const authMocks = vi.hoisted(() => ({
  firebaseSignOut: vi.fn(),
  mockSignOut: vi.fn(),
}));

const layoutAuth = vi.hoisted(() => ({
  role: 'student',
}));

let restoreMatchMedia: (() => void) | undefined;

function installViewportController() {
  const originalMatchMedia = window.matchMedia;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  let matches = false;
  const mediaQuery = {
    get matches() { return matches; },
    media: '(min-width: 768px)',
    onchange: null,
    addEventListener: (_type: 'change', listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
    removeEventListener: (_type: 'change', listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
    addListener: (listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
    removeListener: (listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
    dispatchEvent: () => true,
  } as MediaQueryList;

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => mediaQuery),
  });
  restoreMatchMedia = () => Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: originalMatchMedia,
  });

  return {
    setDesktop(matchesDesktop: boolean) {
      matches = matchesDesktop;
      listeners.forEach((listener) => listener({ matches, media: mediaQuery.media } as MediaQueryListEvent));
    },
  };
}

vi.mock('../AuthContext', () => ({
  useAuth: () => ({
    profile: {
      name: 'Test Student',
      role: layoutAuth.role,
      student_id: '2024-0001',
      photo_url: '',
    },
    isMock: true,
  }),
}));


vi.mock('../../lib/backend', () => ({
  appAuth: { signOut: authMocks.mockSignOut },
  documentUrl: vi.fn(async (path: string) => path),
  appData: {
    getPaymentInfo: () => ({ reminders: [] }),
    getSystemFreezeStatus: () => ({ isFrozen: false, reason: '' }),
    isUserScopeFrozen: () => false,
  },
}));

afterEach(() => {
  cleanup();
  document.body.classList.remove('app-scroll-lock');
  restoreMatchMedia?.();
  restoreMatchMedia = undefined;
  vi.clearAllMocks();
  layoutAuth.role = 'student';
});

it('opens and closes the mobile navigation drawer accessibly', async () => {
  const user = userEvent.setup();

  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Layout><p>Dashboard content</p></Layout>
      </MemoryRouter>
    </ThemeProvider>,
  );

  expect(screen.getByRole('main')).toBeVisible();
  const menuButton = screen.getByRole('button', { name: /open navigation/i });
  expect(menuButton).toHaveAttribute('aria-expanded', 'false');

  await user.click(menuButton);

  expect(screen.getByRole('dialog', { name: /main navigation/i })).toBeVisible();
  expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  expect(document.body).toHaveClass('app-scroll-lock');

  await user.keyboard('{Escape}');

  expect(screen.queryByRole('dialog', { name: /main navigation/i })).not.toBeInTheDocument();
  expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  expect(document.body).not.toHaveClass('app-scroll-lock');
});

it('closes the drawer when the route changes outside its navigation controls', async () => {
  const user = userEvent.setup();

  function RouteChanger() {
    const navigate = useNavigate();
    return <button type="button" onClick={() => navigate('/student/events')}>Change page</button>;
  }

  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Layout><RouteChanger /></Layout>
      </MemoryRouter>
    </ThemeProvider>,
  );

  await user.click(screen.getByRole('button', { name: /open navigation/i }));
  expect(screen.getByRole('dialog', { name: /main navigation/i })).toBeVisible();

  await user.click(screen.getByRole('button', { name: 'Change page' }));

  expect(screen.queryByRole('dialog', { name: /main navigation/i })).not.toBeInTheDocument();
  expect(document.body).not.toHaveClass('app-scroll-lock');
});

it('closes and cleans up the drawer when the viewport becomes desktop-sized', async () => {
  const viewport = installViewportController();
  const user = userEvent.setup();

  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Layout><p>Dashboard content</p></Layout>
      </MemoryRouter>
    </ThemeProvider>,
  );

  await user.click(screen.getByRole('button', { name: /open navigation/i }));
  expect(document.body).toHaveClass('app-scroll-lock');

  viewport.setDesktop(true);

  await waitFor(() => expect(screen.queryByRole('dialog', { name: /main navigation/i })).not.toBeInTheDocument());
  expect(document.body).not.toHaveClass('app-scroll-lock');
});

it('keeps focus in the drawer and restores it to the opener when closed', async () => {
  const user = userEvent.setup();

  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Layout><p>Dashboard content</p></Layout>
      </MemoryRouter>
    </ThemeProvider>,
  );

  const menuButton = screen.getByRole('button', { name: /open navigation/i });
  await user.click(menuButton);

  const drawer = screen.getByRole('dialog', { name: /main navigation/i });
  const closeButton = within(drawer).getByRole('button', { name: 'Close navigation' });
  expect(closeButton).toHaveFocus();

  await user.tab({ shift: true });
  expect(within(drawer).getByRole('button', { name: 'View profile' })).toHaveFocus();
  await user.tab();
  expect(closeButton).toHaveFocus();

  await user.keyboard('{Escape}');
  expect(menuButton).toHaveFocus();
});

it('closes the drawer when its backdrop is clicked', async () => {
  const user = userEvent.setup();

  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Layout><p>Dashboard content</p></Layout>
      </MemoryRouter>
    </ThemeProvider>,
  );

  await user.click(screen.getByRole('button', { name: /open navigation/i }));
  await user.click(screen.getByRole('button', { name: 'Close navigation backdrop' }));

  expect(screen.queryByRole('dialog', { name: /main navigation/i })).not.toBeInTheDocument();
});

it('shows the merged SSG hierarchy without duplicate member or attendance administration links', async () => {
  const user = userEvent.setup();
  layoutAuth.role = 'ssg';

  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/ssg/panel']}>
        <Layout><p>SSG content</p></Layout>
      </MemoryRouter>
    </ThemeProvider>,
  );

  const navigation = screen.getByRole('navigation', { name: /desktop navigation/i });
  expect(within(navigation).getByRole('button', { name: /attendance scanner/i })).toBeInTheDocument();
  expect(within(navigation).getByRole('button', { name: /event management/i })).toBeInTheDocument();
  expect(within(navigation).queryByRole('button', { name: /mayor hub/i })).not.toBeInTheDocument();
  expect(within(navigation).queryByText(/^admin$/i)).not.toBeInTheDocument();
  expect(within(navigation).queryByRole('button', { name: /attendance dashboard/i })).not.toBeInTheDocument();
  expect(within(navigation).queryByRole('button', { name: /manage members/i })).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /collapse sidebar/i }));
  expect(within(navigation).getByRole('button', { name: /attendance dashboard/i })).toBeInTheDocument();
  expect(within(navigation).queryByRole('button', { name: /manage members/i })).not.toBeInTheDocument();
});

it('uses OSSA-specific naming for the shared control panel', () => {
  layoutAuth.role = 'ossa';

  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/ssg/panel']}>
        <Layout><p>OSSA content</p></Layout>
      </MemoryRouter>
    </ThemeProvider>,
  );

  const navigation = screen.getByRole('navigation', { name: /desktop navigation/i });
  expect(within(navigation).getByRole('button', { name: /ossa hierarchy/i })).toBeInTheDocument();
  expect(within(navigation).queryByRole('button', { name: /ssg panel/i })).not.toBeInTheDocument();
});

it('moves logout to the profile page and expands from the arrow beside the logo', async () => {
  const user = userEvent.setup();

  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Layout><p>Dashboard content</p></Layout>
      </MemoryRouter>
    </ThemeProvider>,
  );

  expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /collapse sidebar/i }));

  const expandButton = screen.getByRole('button', { name: /expand sidebar/i });
  expect(expandButton).toHaveClass('absolute', 'right-0', 'top-1/2');
  expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();

  await user.click(expandButton);
  expect(screen.getByRole('button', { name: /collapse sidebar/i })).toBeInTheDocument();
});
