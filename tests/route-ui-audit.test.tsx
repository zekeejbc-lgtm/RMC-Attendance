import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '../components/ThemeContext';
import LandingPage from '../views/LandingPage';
import Login from '../views/Login';
import Register from '../views/Register';
import RegisterStatus from '../views/RegisterStatus';
import Dashboard from '../views/Dashboard';
import StudentQR from '../views/StudentQR';
import StudentRecords from '../views/StudentRecords';
import StudentProfile from '../views/StudentProfile';
import StudentEvents from '../views/StudentEvents';
import StudentCeremonies from '../views/StudentCeremonies';
import MayorScanner from '../views/MayorScanner';
import ManageMembers from '../views/ManageMembers';
import SSGPanel from '../views/SSGPanel';
import AttendanceDashboard from '../views/AttendanceDashboard';
import OSSADashboard from '../views/OSSADashboard';

const studentProfile = {
  uid: 'student-1',
  name: 'Juan Dela Cruz',
  username: 'juan.delacruz',
  role: 'student',
  student_id: 'RMC-2026-0001',
  photo_url: '',
  email: 'juan.delacruz@example.edu',
  school_data: {
    type: 'High School',
    level: 'Grade 12',
    section: 'Newton',
    department: 'Senior High School',
    school_id: 'school_rmc',
  },
};

const routeState = vi.hoisted(() => ({
  applications: [] as Array<Record<string, unknown>>,
  auth: {
    isMock: false,
    loading: false,
    profile: null as typeof studentProfile | null,
    stats: null as { attendance_rate: number; sanction_hours: number; events_attended: number; events_missed: number } | null,
    user: null as { uid: string } | null,
  } as {
    isMock: boolean;
    loading?: boolean;
    profile: typeof studentProfile | null;
    stats: { attendance_rate: number; sanction_hours: number; events_attended: number; events_missed: number } | null;
    user: { uid: string } | null;
  },
}));

const backendState = vi.hoisted(() => ({
  db: { school_structure: [{}], users: {} } as Record<string, any>,
  ensureMockReferenceData: vi.fn(),
  mockSeed: vi.fn(),
}));

const staffState = vi.hoisted(() => ({
  applications: [] as Array<Record<string, any>>,
  excuses: [] as Array<Record<string, any>>,
  events: [] as Array<Record<string, any>>,
  schoolStructure: [] as Array<Record<string, any>>,
  students: [] as Array<Record<string, any>>,
  addSchoolNode: vi.fn(),
  adjustSanctionHours: vi.fn(),
  approveApplication: vi.fn(),
  assignRole: vi.fn(),
  createEvent: vi.fn(),
  createUser: vi.fn(),
  logAttendance: vi.fn(),
  resolveStudentSanctions: vi.fn(),
  reviewExcuseApplication: vi.fn(),
}));

const scannerState = vi.hoisted(() => ({
  decoded: null as null | ((value: string) => void),
  startPromise: Promise.resolve() as Promise<void>,
  pause: vi.fn(),
  resume: vi.fn(),
  start: vi.fn((_camera: unknown, _config: unknown, onSuccess: (value: string) => void) => {
    scannerState.decoded = onSuccess;
    return scannerState.startPromise;
  }),
  stop: vi.fn(() => Promise.resolve()),
}));

vi.mock('../components/AuthContext', () => ({
  useAuth: () => routeState.auth,
}));

vi.mock('../firebase', () => ({ auth: { signOut: vi.fn() }, db: {} }));

vi.mock('../lib/mockBackend', () => ({
  ensureMockReferenceData: backendState.ensureMockReferenceData,
  getDB: () => backendState.db,
  mockAuth: { signIn: vi.fn(), signOut: vi.fn() },
  mockData: {
    addSchoolNode: staffState.addSchoolNode,
    adjustSanctionHours: staffState.adjustSanctionHours,
    approveApplication: staffState.approveApplication,
    assignRole: staffState.assignRole,
    createEvent: staffState.createEvent,
    createUser: staffState.createUser,
    getApplications: () => staffState.applications.length ? staffState.applications : routeState.applications,
    getAllStudents: () => staffState.students,
    getEvents: () => staffState.events,
    getExcuseApplications: () => staffState.excuses,
    getSchoolStructure: () => staffState.schoolStructure,
    getStudentsBySection: () => staffState.students,
    getUserDetail: (uid: string) => {
      const student = staffState.students.find((candidate) => candidate.uid === uid);
      return student ? { profile: student, stats: student.stats } : null;
    },
    getUserProfile: (identifier: string) => staffState.students.find(
      (candidate) => candidate.uid === identifier || candidate.student_id === identifier,
    ),
    logAttendance: staffState.logAttendance,
    resolveStudentSanctions: staffState.resolveStudentSanctions,
    reviewExcuseApplication: staffState.reviewExcuseApplication,
    submitApplication: vi.fn(),
  },
  mockSeed: backendState.mockSeed,
}));

vi.mock('html5-qrcode', () => ({
  Html5Qrcode: class {
    pause = scannerState.pause;
    resume = scannerState.resume;
    start = scannerState.start;
    stop = scannerState.stop;
  },
}));

function renderRoute(element: React.ReactElement) {
  return render(
    <ThemeProvider>
      <MemoryRouter>{element}</MemoryRouter>
    </ThemeProvider>,
  );
}

afterEach(() => {
  cleanup();
  routeState.applications = [];
  routeState.auth = { isMock: false, loading: false, profile: null, stats: null, user: null };
  staffState.applications = [];
  staffState.excuses = [];
  staffState.events = [];
  staffState.schoolStructure = [];
  staffState.students = [];
  staffState.addSchoolNode.mockReset();
  staffState.adjustSanctionHours.mockReset();
  staffState.approveApplication.mockReset();
  staffState.assignRole.mockReset();
  staffState.createEvent.mockReset();
  staffState.createUser.mockReset();
  staffState.logAttendance.mockReset();
  staffState.resolveStudentSanctions.mockReset();
  staffState.reviewExcuseApplication.mockReset();
  scannerState.decoded = null;
  scannerState.startPromise = Promise.resolve();
  scannerState.pause.mockReset();
  scannerState.resume.mockReset();
  scannerState.start.mockClear();
  scannerState.stop.mockClear();
  backendState.db = { school_structure: [{}], users: {} };
  backendState.ensureMockReferenceData.mockReset();
  backendState.mockSeed.mockReset();
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

const useStaff = () => {
  routeState.auth = {
    isMock: true,
    profile: { ...studentProfile, uid: 'staff-1', name: 'SSG President', role: 'ssg' } as typeof studentProfile,
    stats: null,
    user: { uid: 'staff-1' },
  };
};

const seedStaffDirectory = () => {
  const section = { id: 'section-newton', name: 'Newton', type: 'section', children: [] };
  const department = { id: 'department-shs', name: 'Senior High School', type: 'department', children: [section] };
  staffState.schoolStructure = [{ id: 'school-rmc', name: 'RMC Campus', type: 'school', children: [department] }];
  staffState.students = [{
    ...studentProfile,
    name: `Juan ${'Dela Cruz '.repeat(12)}`,
    email: `juan.${'long-address.'.repeat(10)}@example.edu`,
    stats: { attendance_rate: 94, sanction_hours: 2, events_attended: 12, events_missed: 1 },
  }];
};

const seedCollegeDirectory = () => {
  const section = { id: 'section-cs1a', name: 'CS-1A', type: 'section', children: [] };
  const program = { id: 'program-bscs', name: 'BS Computer Science', type: 'strand', children: [section] };
  const college = { id: 'college-cas', name: 'College of Arts and Sciences', type: 'track', children: [program] };
  const department = { id: 'department-college', name: 'College', type: 'department', children: [college] };
  staffState.schoolStructure = [{ id: 'school-rmc', name: 'RMC Campus', type: 'school', children: [department] }];
  staffState.students = [];
};

const useStudentRoute = () => {
  routeState.auth = {
    isMock: false,
    profile: studentProfile,
    stats: { attendance_rate: 94, sanction_hours: 2, events_attended: 12, events_missed: 1 },
    user: { uid: studentProfile.uid },
  };
};

describe('public route UI behavior', () => {
  it('requests a non-destructive reference-data merge on first-run mock databases', async () => {
    backendState.db = { school_structure: [], users: { mock_uid_student: {} } };
    routeState.auth = { isMock: true, loading: false, profile: null, stats: null, user: null };

    renderRoute(<LandingPage />);

    await waitFor(() => expect(backendState.ensureMockReferenceData).toHaveBeenCalledOnce());
    expect(backendState.mockSeed).not.toHaveBeenCalled();
  });

  it('keeps both landing authentication dialogs named, operable, and keyboard dismissible', async () => {
    const user = userEvent.setup();
    renderRoute(<LandingPage defaultOpenLogin />);

    expect(screen.getByRole('dialog', { name: /portal login/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /asset identifier/i })).toBeInTheDocument();
    const landingPassword = screen.getByLabelText(/security key/i);
    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(landingPassword).toHaveAttribute('type', 'text');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /portal login/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /student enrollment/i }));
    expect(screen.getByRole('dialog', { name: /system enrollment/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close dialog/i })).toHaveFocus();
    expect(screen.getByRole('textbox', { name: /legal full name/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /next phase/i }));
    await user.click(screen.getByRole('button', { name: /capture student id front/i }));
    await user.click(screen.getByRole('button', { name: /capture student id back/i }));
    expect(screen.getByRole('img', { name: /student id front/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /student id back/i })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /system enrollment/i })).not.toBeInTheDocument();
  });

  it('gives the login form programmatic labels and an operable password disclosure', async () => {
    const user = userEvent.setup();
    renderRoute(<Login />);

    expect(screen.getByRole('textbox', { name: /asset identifier/i })).toBeInTheDocument();
    const password = screen.getByLabelText(/security key/i);
    expect(password).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();
  });

  it('makes the registration identity inputs and profile action accessible by name', async () => {
    const user = userEvent.setup();
    renderRoute(<Register />);

    await user.type(screen.getByRole('textbox', { name: /legal full name/i }), 'Juan Dela Cruz');
    expect(screen.getByRole('textbox', { name: /legal full name/i })).toHaveValue('Juan Dela Cruz');
    expect(screen.getByRole('button', { name: /upload profile photo/i })).toBeInTheDocument();
  });

  it('exposes accessible student ID capture actions in registration phase two', async () => {
    const user = userEvent.setup();
    renderRoute(<Register />);

    await user.click(screen.getByRole('button', { name: /proceed to phase ii/i }));
    expect(screen.getByRole('textbox', { name: /official student id/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /capture student id front/i }));
    await user.click(screen.getByRole('button', { name: /capture student id back/i }));
    expect(screen.getByRole('img', { name: /student id front/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /student id back/i })).toBeInTheDocument();
  });

  it.each([
    ['login', <Login />, /institution attendance & records system/i, /asset identifier/i],
    ['registration', <Register />, /system enrollment/i, /legal full name/i],
  ])('keeps the standalone %s card readable when dark mode is selected', async (_name, element, headingName, inputName) => {
    const user = userEvent.setup();
    localStorage.setItem('iars-theme', 'light');
    renderRoute(element);

    await user.click(screen.getByRole('button', { name: /current theme: light mode/i }));
    expect(document.documentElement).toHaveClass('dark');

    const card = screen.getByRole('heading', { name: headingName }).closest('.bg-white');
    expect(card).toHaveClass('dark:bg-slate-900', 'dark:border-slate-800');
    expect(screen.getByRole('textbox', { name: inputName })).toHaveClass('dark:bg-slate-800', 'dark:text-white');
  });

  it('renders a long rejected registration status with wrapping and accessible actions', async () => {
    const rejectionReason = `REVIEW-${'X'.repeat(256)}`;
    localStorage.setItem('iars-theme', 'dark');
    routeState.auth = { isMock: true, profile: null, stats: null, user: { uid: 'applicant-1' } };
    routeState.applications = [{
      id: 'applicant-1',
      rejection_count: 1,
      rejection_reason: rejectionReason,
      status: 'rejected',
    }];

    renderRoute(<RegisterStatus />);

    expect(await screen.findByRole('heading', { name: /application rejected/i })).toBeInTheDocument();
    expect(screen.getByText(rejectionReason)).toHaveClass('[overflow-wrap:anywhere]');
    expect(screen.getByRole('button', { name: /re-apply \(trial 2\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /current theme: dark mode/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /application rejected/i }).closest('.bg-white')).toHaveClass('dark:bg-slate-900');
  });

  it('does not redirect registration status while authentication is still initializing', async () => {
    routeState.auth = { isMock: true, loading: true, profile: null, stats: null, user: null };

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/register/status']}>
          <Routes>
            <Route element={<RegisterStatus />} path="/register/status" />
            <Route element={<h1>Login destination</h1>} path="/login" />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(screen.getByRole('status', { name: /loading application status/i })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('heading', { name: /login destination/i })).not.toBeInTheDocument();
  });
});

describe('student route UI behavior', () => {
  const useStudent = useStudentRoute;

  it('renders the student dashboard as a named page with stable metric hierarchy', () => {
    useStudent();
    renderRoute(<Dashboard />);

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /welcome back, juan dela cruz/i })).toBeInTheDocument();
    expect(screen.getByText('94%')).toBeInTheDocument();
    expect(screen.getByText('2h')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /my qr passport/i })).toBeInTheDocument();
  });

  it('exposes a bounded, named student QR and its download action', () => {
    useStudent();
    renderRoute(<StudentQR />);

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /student qr passport/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /student qr code/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download card as png/i })).toBeInTheDocument();
    expect(screen.getByText(/linked to student record/i)).toHaveClass('[overflow-wrap:anywhere]');
  });

  it('renders accessible record filters and equivalent mobile and desktop ledgers', async () => {
    const user = userEvent.setup();
    useStudent();
    renderRoute(<StudentRecords />);

    expect(screen.getByRole('main')).toBeInTheDocument();
    const search = screen.getByRole('searchbox', { name: /search attendance records/i });
    expect(screen.getByRole('combobox', { name: /filter by category/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /filter by status/i })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /attendance ledger/i })).toBeInTheDocument();
    expect(screen.getAllByRole('article', { name: /weekly institutional flag raising ceremony/i })).toHaveLength(1);

    await user.type(search, 'Disaster Risk');
    expect(screen.queryByRole('article', { name: /weekly institutional flag raising ceremony/i })).not.toBeInTheDocument();
    expect(screen.getByRole('article', { name: /disaster risk & safety drill/i })).toBeInTheDocument();
  });

  it('labels profile, password, two-factor, and session controls', async () => {
    const user = userEvent.setup();
    useStudent();
    renderRoute(<StudentProfile />);

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /student mobile contact/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /parent \/ guardian name/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enable two-factor authentication/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /change password/i }).parentElement).toHaveClass(
      'flex-col', 'lg:flex-row',
    );

    await user.click(screen.getByRole('button', { name: /change password/i }));
    const currentPassword = screen.getByLabelText(/^current password$/i);
    expect(currentPassword).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: /show current password/i }));
    expect(currentPassword).toHaveAttribute('type', 'text');
    const newPassword = screen.getByLabelText(/^new password$/i);
    const confirmPassword = screen.getByLabelText(/confirm new password/i);
    await user.click(screen.getByRole('button', { name: /show new password/i }));
    await user.click(screen.getByRole('button', { name: /show password confirmation/i }));
    expect(newPassword).toHaveAttribute('type', 'text');
    expect(confirmPassword).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /sign out of portal/i })).toBeInTheDocument();
  });

  it('keeps event details and excuse filing as named, stacked modal workflows', async () => {
    const user = userEvent.setup();
    useStudent();
    renderRoute(<StudentEvents />);

    expect(screen.getByRole('main')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /university midyear leadership convocation/i }));
    expect(screen.getByRole('dialog', { name: /university midyear leadership convocation/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /file for excuse/i }));
    expect(screen.getAllByRole('dialog')).toHaveLength(2);
    expect(screen.getByRole('dialog', { name: /file excuse application.*university midyear leadership convocation/i })).toBeInTheDocument();
    const details = screen.getByRole('textbox', { name: /detailed explanation/i });
    expect(details).toBeRequired();
    await user.click(screen.getByRole('button', { name: /submit formal excuse/i }));
    expect(screen.queryByText(/excuse letter submitted/i)).not.toBeInTheDocument();
    await user.type(details, 'Recovering from a documented medical condition.');
    await user.type(screen.getByRole('textbox', { name: /guardian \/ contact mobile number/i }), '0917 123 4567');
    await user.upload(
      screen.getByLabelText(/attach excuse letter \/ medical certificate/i),
      new File(['proof'], 'medical-certificate.pdf', { type: 'application/pdf' }),
    );
    expect(screen.getByText('medical-certificate.pdf')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /submit formal excuse/i }));
    expect(screen.getByText(/excuse letter submitted/i)).toBeInTheDocument();
    await user.click(screen.getAllByTestId('modal-backdrop').at(-1)!);
    expect(screen.getByRole('dialog', { name: /file excuse application.*university midyear leadership convocation/i })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /file excuse application/i })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: /university midyear leadership convocation/i })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body).not.toHaveClass('app-scroll-lock');
  });

  it('keeps ceremony details and response filing as named, stacked modal workflows', async () => {
    const user = userEvent.setup();
    useStudent();
    renderRoute(<StudentCeremonies />);

    expect(screen.getByRole('main')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /weekly institutional flag raising ceremony/i }));
    expect(screen.getByRole('dialog', { name: /weekly institutional flag raising ceremony/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /file for excuse/i }));
    expect(screen.getAllByRole('dialog')).toHaveLength(2);
    expect(screen.getByRole('dialog', { name: /excuse letter submission.*weekly institutional flag raising ceremony/i })).toBeInTheDocument();
    const details = screen.getByRole('textbox', { name: /detailed justification/i });
    expect(details).toBeRequired();
    await user.click(screen.getByRole('button', { name: /transmit exemption letter/i }));
    expect(screen.queryByText(/exemption form transmitted/i)).not.toBeInTheDocument();
    await user.type(details, 'Representing the school at an official academic competition.');
    await user.upload(
      screen.getByLabelText(/upload supporting document \/ excuse letter/i),
      new File(['proof'], 'competition-letter.pdf', { type: 'application/pdf' }),
    );
    expect(screen.getByText('competition-letter.pdf')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /transmit exemption letter/i }));
    expect(screen.getByText(/exemption form transmitted/i)).toBeInTheDocument();
    await user.click(screen.getAllByTestId('modal-backdrop').at(-1)!);
    expect(screen.getByRole('dialog', { name: /excuse letter submission.*weekly institutional flag raising ceremony/i })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /excuse letter submission/i })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: /weekly institutional flag raising ceremony/i })).toBeInTheDocument();
  });
});

describe('complete routed view render matrix', () => {
  const publicRoute = () => undefined;
  const applicantRoute = () => {
    routeState.auth = { isMock: true, profile: null, stats: null, user: { uid: 'applicant-1' } };
    routeState.applications = [{ id: 'applicant-1', status: 'pending' }];
  };
  const staffRoute = () => {
    useStaff();
    seedStaffDirectory();
    staffState.events = [{ id: 'event-1', title: 'Institutional Assembly', status: 'active' }];
  };

  const routedViews: Array<{
    path: string;
    file: string;
    element: React.ReactElement;
    setup: () => void;
    usesPage: boolean;
  }> = [
    { path: '/', file: 'views/LandingPage.tsx', element: <LandingPage />, setup: publicRoute, usesPage: false },
    { path: '/login', file: 'views/LandingPage.tsx', element: <LandingPage defaultOpenLogin />, setup: publicRoute, usesPage: false },
    { path: '/register', file: 'views/Register.tsx', element: <Register />, setup: publicRoute, usesPage: false },
    { path: '/register/status', file: 'views/RegisterStatus.tsx', element: <RegisterStatus />, setup: applicantRoute, usesPage: false },
    { path: '/dashboard', file: 'views/Dashboard.tsx', element: <Dashboard />, setup: useStudentRoute, usesPage: true },
    { path: '/student/qr', file: 'views/StudentQR.tsx', element: <StudentQR />, setup: useStudentRoute, usesPage: true },
    { path: '/student/events', file: 'views/StudentEvents.tsx', element: <StudentEvents />, setup: useStudentRoute, usesPage: true },
    { path: '/student/ceremonies', file: 'views/StudentCeremonies.tsx', element: <StudentCeremonies />, setup: useStudentRoute, usesPage: true },
    { path: '/student/records', file: 'views/StudentRecords.tsx', element: <StudentRecords />, setup: useStudentRoute, usesPage: true },
    { path: '/student/profile', file: 'views/StudentProfile.tsx', element: <StudentProfile />, setup: useStudentRoute, usesPage: true },
    { path: '/mayor/scan', file: 'views/MayorScanner.tsx', element: <MayorScanner />, setup: staffRoute, usesPage: true },
    { path: '/ssg/panel', file: 'views/SSGPanel.tsx', element: <SSGPanel />, setup: staffRoute, usesPage: true },
    { path: '/admin/attendance', file: 'views/AttendanceDashboard.tsx', element: <AttendanceDashboard />, setup: staffRoute, usesPage: true },
    { path: '/admin/members', file: 'views/ManageMembers.tsx', element: <ManageMembers />, setup: staffRoute, usesPage: true },
    { path: '/ossa/dashboard', file: 'views/OSSADashboard.tsx', element: <OSSADashboard />, setup: staffRoute, usesPage: true },
  ];

  it.each(routedViews)('$path ($file) renders with page containment and named controls', async ({
    element, file, setup, usesPage,
  }) => {
    setup();
    const { container } = renderRoute(element);

    if (usesPage) {
      expect(
        screen.getByRole('main'),
        `${file}: routed view must render through the shared Page containment component`,
      ).toHaveClass('app-page');
    } else {
      expect(container.firstElementChild, `${file}: routed view must render a bounded root`).toBeInTheDocument();
    }

    Array.from(container.querySelectorAll('button')).forEach((button) => {
      expect(
        button,
        `${file}: every rendered button, including icon-only controls, must have an accessible name`,
      ).toHaveAccessibleName();
    });

    const dialog = screen.queryByRole('dialog');
    if (dialog) {
      expect(
        dialog.closest('[data-modal-root="true"]'),
        `${file}: rendered dialogs must use the shared viewport-safe modal shell`,
      ).toBeInTheDocument();
    }
  });
});

describe('staff route UI behavior', () => {
  it('initializes responsive charts without invalid-dimension warnings', () => {
    const consoleWarning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      useStaff();
      seedStaffDirectory();
      const attendance = renderRoute(<AttendanceDashboard />);
      attendance.unmount();
      renderRoute(<OSSADashboard />);

      expect(consoleWarning.mock.calls.flat().join(' ')).not.toMatch(/width\(-1\).*height\(-1\)/i);
    } finally {
      consoleWarning.mockRestore();
    }
  });

  it('keeps scanner controls operable while scan outcomes use named dialogs', async () => {
    const user = userEvent.setup();
    useStaff();
    seedStaffDirectory();
    staffState.events = [{
      id: 'event-1',
      title: 'Institutional Assembly',
      status: 'active',
      location: { lat: 7, lng: 125, radius_meters: 100 },
    }];

    renderRoute(<MayorScanner />);

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /camera selection/i })).toHaveValue('environment');
    const start = screen.getByRole('button', { name: /initiate optical scan/i });
    expect(start).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /institutional assembly/i }));
    await user.click(start);

    expect(await screen.findByRole('region', { name: /camera scanner/i })).toHaveClass(
      'aspect-square',
      'sm:aspect-video',
      'max-w-2xl',
      'overflow-hidden',
    );
    expect(screen.getByRole('button', { name: /stop scanner/i })).toBeInTheDocument();
    await waitFor(() => expect(scannerState.start).toHaveBeenCalledTimes(1));

    scannerState.decoded?.('student-1');
    expect(await screen.findByRole('dialog', { name: /confirm attendance scan/i })).toBeInTheDocument();
    expect(screen.getByText(studentProfile.student_id)).toHaveClass('[overflow-wrap:anywhere]');
    await user.click(screen.getByRole('button', { name: /authorize attendance/i }));
    expect(staffState.logAttendance).toHaveBeenCalledWith('event-1', 'student-1', 'staff-1', 'SSG President');

    await waitFor(
      () => expect(screen.queryByRole('dialog', { name: /confirm attendance scan/i })).not.toBeInTheDocument(),
      { timeout: 2500 },
    );
    await waitFor(() => expect(document.body).not.toHaveClass('app-scroll-lock'));
    await user.click(screen.getByRole('button', { name: /stop scanner/i }));
    await waitFor(() => expect(scannerState.stop).toHaveBeenCalledTimes(1));
  });

  it('renders a disabled loading action until asynchronous scanner startup completes', async () => {
    const user = userEvent.setup();
    useStaff();
    staffState.events = [{ id: 'event-1', title: 'Institutional Assembly', status: 'active' }];
    let resolveStart!: () => void;
    scannerState.startPromise = new Promise<void>((resolve) => { resolveStart = resolve; });
    renderRoute(<MayorScanner />);

    await user.click(screen.getByRole('button', { name: /institutional assembly/i }));
    await user.click(screen.getByRole('button', { name: /initiate optical scan/i }));

    const loadingAction = screen.getByRole('button', { name: /initiate optical scan/i });
    expect(loadingAction).toBeDisabled();
    expect(loadingAction).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('region', { name: /camera scanner/i })).not.toBeInTheDocument();

    resolveStart();
    expect(await screen.findByRole('region', { name: /camera scanner/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stop scanner/i })).toBeEnabled();
  });

  it('keeps the restricted sanctions callback reachable and visibly labeled', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    routeState.auth = {
      isMock: true,
      profile: { ...studentProfile, uid: 'mayor-1', name: 'Section Mayor', role: 'mayor' } as typeof studentProfile,
      stats: null,
      user: { uid: 'mayor-1' },
    };
    renderRoute(<MayorScanner />);

    const restricted = screen.getByRole('button', { name: /sanction clear.*restricted to ssg president/i });
    expect(restricted).not.toBeDisabled();
    await user.click(restricted);
    expect(alertSpy).toHaveBeenCalledWith('Restricted to SSG President Authorization');
    expect(screen.getByRole('button', { name: /attendance/i })).toHaveAttribute('aria-pressed', 'true');
    alertSpy.mockRestore();
  });

  it('reports invalid QR passports in a named scanner error dialog', async () => {
    const user = userEvent.setup();
    useStaff();
    staffState.events = [{ id: 'event-1', title: 'Institutional Assembly', status: 'active' }];
    renderRoute(<MayorScanner />);

    await user.click(screen.getByRole('button', { name: /institutional assembly/i }));
    await user.click(screen.getByRole('button', { name: /initiate optical scan/i }));
    await waitFor(() => expect(scannerState.decoded).toBeTypeOf('function'));
    scannerState.decoded?.('not-a-student');

    const errorDialog = await screen.findByRole('dialog', { name: /scan unsuccessful/i });
    expect(within(errorDialog).getByText(/unauthorized or invalid asset qr/i)).toHaveClass('[overflow-wrap:anywhere]');
    await user.click(within(errorDialog).getByRole('button', { name: /return to scanner/i }));
    expect(screen.queryByRole('dialog', { name: /scan unsuccessful/i })).not.toBeInTheDocument();
  });

  it('renders section members as equivalent searchable desktop rows and labeled mobile cards', async () => {
    const user = userEvent.setup();
    useStaff();
    seedStaffDirectory();
    renderRoute(<ManageMembers />);

    expect(await screen.findByRole('main')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /senior high school/i }));
    await user.click(screen.getByRole('button', { name: /^newton/i }));

    expect(screen.getByRole('searchbox', { name: /search section members/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /filter members by role/i })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /newton member registry/i })).toBeInTheDocument();
    const memberCard = screen.getByRole('article', { name: /juan dela cruz/i });
    expect(memberCard).toHaveClass('mobile-data-card');
    expect(within(memberCard).getByText(/long-address/i)).toBeInTheDocument();
    expect(within(memberCard).getByText(studentProfile.student_id)).toBeInTheDocument();
    expect(within(memberCard).getByText('student')).toBeInTheDocument();
    expect(screen.getAllByText(studentProfile.student_id)).toHaveLength(2);
    expect(screen.getAllByText(/long-address/i)[0]).toHaveClass('[overflow-wrap:anywhere]');
    expect(screen.queryByText(/^active$/i)).not.toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: /search section members/i }), 'missing member');
    expect(screen.queryByRole('article', { name: /juan dela cruz/i })).not.toBeInTheDocument();
    expect(screen.getByText(/no members match/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add member/i }));
    const memberForm = screen.getByRole('dialog', { name: /add member to newton/i });
    expect(within(memberForm).getByRole('textbox', { name: /legal full name/i })).toBeRequired();
    expect(within(memberForm).getByRole('textbox', { name: /email address/i })).toBeRequired();
    await user.click(screen.getByTestId('modal-backdrop'));
    expect(screen.getByRole('dialog', { name: /add member to newton/i })).toBeInTheDocument();
  });

  it('submits a college member with school data derived from the selected directory branch', async () => {
    const user = userEvent.setup();
    useStaff();
    seedCollegeDirectory();
    renderRoute(<ManageMembers />);

    await user.click(await screen.findByRole('button', { name: /^college/i }));
    await user.click(screen.getByRole('button', { name: /college of arts and sciences/i }));
    await user.click(screen.getByRole('button', { name: /bs computer science/i }));
    await user.click(screen.getByRole('button', { name: /^cs-1a/i }));
    await user.click(screen.getByRole('button', { name: /add member/i }));

    const form = screen.getByRole('dialog', { name: /add member to cs-1a/i });
    await user.type(within(form).getByRole('textbox', { name: /legal full name/i }), 'Ada Lovelace');
    await user.type(within(form).getByRole('textbox', { name: /email address/i }), 'ada@rmc.edu.ph');
    await user.type(within(form).getByRole('textbox', { name: /username/i }), 'ada.lovelace');
    await user.type(within(form).getByRole('textbox', { name: /student id/i }), 'RMC-COL-1001');
    await user.click(within(form).getByRole('button', { name: /create member/i }));

    expect(staffState.createUser).toHaveBeenCalledWith({
      name: 'Ada Lovelace',
      email: 'ada@rmc.edu.ph',
      username: 'ada.lovelace',
      role: 'student',
      student_id: 'RMC-COL-1001',
      school_data: {
        type: 'College',
        level: '',
        section: 'CS-1A',
        department: 'College of Arts and Sciences',
        program: 'BS Computer Science',
        school_id: 'school-rmc',
      },
    });
  });

  it('keeps SSG unit and event creation in named, operable dialogs', async () => {
    const user = userEvent.setup();
    useStaff();
    seedStaffDirectory();
    renderRoute(<SSGPanel />);

    await user.click(screen.getByRole('button', { name: /add unit/i }));
    const unitDialog = screen.getByRole('dialog', { name: /establish unit/i });
    await user.type(within(unitDialog).getByRole('textbox', { name: /unit designation/i }), 'New College Division');
    await user.click(within(unitDialog).getByRole('button', { name: /establish unit/i }));
    expect(staffState.addSchoolNode).toHaveBeenCalledWith(null, {
      id: expect.stringMatching(/^node_/),
      name: 'New College Division',
      type: 'department',
      children: [],
    });

    await user.click(screen.getByRole('button', { name: /^events$/i }));
    await user.click(screen.getByRole('button', { name: /create event/i }));
    const eventDialog = screen.getByRole('dialog', { name: /strategic deployment/i });
    await user.type(within(eventDialog).getByRole('textbox', { name: /deployment title/i }), 'College General Assembly');
    await user.type(within(eventDialog).getByRole('textbox', { name: /administrative description/i }), 'Required institutional assembly.');
    fireEvent.change(within(eventDialog).getByLabelText(/window open/i), { target: { value: '2026-08-10T08:00' } });
    fireEvent.change(within(eventDialog).getByLabelText(/window close/i), { target: { value: '2026-08-10T10:00' } });
    await user.click(within(eventDialog).getByText(/^global institutional$/i));
    await user.click(within(eventDialog).getByRole('option', { name: /manual asset uids/i }));
    await user.type(within(eventDialog).getByRole('textbox', { name: /asset id registry/i }), 'RMC-COL-1001');
    await user.click(within(eventDialog).getByRole('button', { name: /add id/i }));
    expect(within(eventDialog).getByRole('button', { name: /remove asset rmc-col-1001/i })).toBeInTheDocument();
    await user.click(within(eventDialog).getByRole('button', { name: /authorize deployment protocol/i }));

    expect(staffState.createEvent).toHaveBeenCalledWith({
      title: 'College General Assembly',
      description: 'Required institutional assembly.',
      status: 'active',
      created_by: 'SSG President',
      startTime: new Date('2026-08-10T08:00').getTime(),
      endTime: new Date('2026-08-10T10:00').getTime(),
      penaltyValue: 1,
      penaltyUnit: 'hours',
      participantsType: 'specific',
      targetValue: 'All Students',
      specificParticipants: ['RMC-COL-1001'],
      target: { all: false },
      location: { lat: 7.0736, lng: 125.6126, radius_meters: 100 },
      timestamp: expect.any(Number),
    });
  });

  it('executes the preserved applicant approval action from the rendered SSG panel', async () => {
    const user = userEvent.setup();
    useStaff();
    seedStaffDirectory();
    staffState.applications = [{
      id: 'application-1',
      status: 'pending',
      submission_date: Date.now(),
      rejection_count: 0,
      form_data: { ...studentProfile, name: 'Pending Applicant' },
    }];
    renderRoute(<SSGPanel />);

    await user.click(screen.getByRole('button', { name: /^applicants$/i }));
    await user.click(screen.getByRole('button', { name: /^verify$/i }));
    expect(staffState.approveApplication).toHaveBeenCalledWith('application-1', 'student');
  });

  it('renders equivalent attendance records and operable report and date-range dialogs', async () => {
    const user = userEvent.setup();
    useStaff();
    staffState.events = [
      { id: 'event-1', title: 'Institutional Assembly' },
      { id: 'event-2', title: 'Campus Safety Drill' },
    ];
    renderRoute(<AttendanceDashboard />);

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /attendance dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /attendance filters/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /event scope.*all events/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /education level.*all levels/i })).toBeInTheDocument();

    const eventScope = screen.getByRole('button', { name: /event scope.*all events/i });
    await user.click(eventScope);
    const eventOptions = screen.getByRole('listbox', { name: /event scope options/i });
    await user.click(within(eventOptions).getByRole('option', { name: /select all/i }));
    expect(eventScope).toHaveAccessibleName(/event scope.*all selected/i);
    expect(within(eventOptions).getByRole('option', { name: /institutional assembly/i })).toHaveAttribute('aria-selected', 'true');
    expect(within(eventOptions).getByRole('option', { name: /campus safety drill/i })).toHaveAttribute('aria-selected', 'true');

    await user.click(within(eventOptions).getByRole('option', { name: /select all/i }));
    expect(eventScope).toHaveAccessibleName(/event scope.*all events/i);
    expect(within(eventOptions).getByRole('option', { name: /institutional assembly/i })).toHaveAttribute('aria-selected', 'false');
    expect(within(eventOptions).getByRole('option', { name: /campus safety drill/i })).toHaveAttribute('aria-selected', 'false');

    const chart = screen.getByRole('region', { name: /attendance visualization/i });
    expect(chart).toHaveClass('h-64', 'sm:h-72');
    const ledger = screen.getByRole('table', { name: /attendance records/i });
    const mobileRecord = screen.getByRole('article', { name: /student 1 attendance record/i });
    expect(mobileRecord).toHaveClass('mobile-data-card');
    expect(within(ledger).getByText('ID-1000')).toBeInTheDocument();
    expect(within(mobileRecord).getByText('ID-1000')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /export report/i }));
    const exportDialog = screen.getByRole('dialog', { name: /export configuration/i });
    expect(within(exportDialog).getByRole('combobox', { name: /group data by/i })).toBeInTheDocument();
    expect(within(exportDialog).getByRole('checkbox', { name: /include visualizations/i })).toBeChecked();
    expect(within(exportDialog).getByRole('button', { name: /generate pdf report/i })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /export configuration/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /time period.*all time/i }));
    await user.click(screen.getByRole('option', { name: /custom range/i }));
    const dateDialog = screen.getByRole('dialog', { name: /select date range/i });
    fireEvent.change(within(dateDialog).getByLabelText(/start date/i), { target: { value: '2026-08-01' } });
    fireEvent.change(within(dateDialog).getByLabelText(/end date/i), { target: { value: '2026-08-08' } });
    await user.click(within(dateDialog).getByRole('button', { name: /apply range/i }));
    expect(screen.queryByRole('dialog', { name: /select date range/i })).not.toBeInTheDocument();
  });

  it('keeps OSSA analytics, filters, dense records, and sanction actions accessible', async () => {
    const user = userEvent.setup();
    useStaff();
    seedStaffDirectory();
    renderRoute(<OSSADashboard />);

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /ossa student affairs & sanctions hub/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /sanction status chart/i })).toHaveClass('h-64', 'sm:h-72');
    expect(screen.getByRole('region', { name: /department sanction hours chart/i })).toHaveClass('h-64', 'sm:h-72');
    expect(screen.getByRole('searchbox', { name: /search student sanctions/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /filter by department/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^all \(/i })).toHaveAttribute('aria-pressed', 'true');

    const roster = screen.getByRole('table', { name: /student sanction roster/i });
    const mobileRecord = screen.getByRole('article', { name: /juan dela cruz/i });
    expect(mobileRecord).toHaveClass('mobile-data-card');
    expect(within(roster).getByText(studentProfile.student_id)).toBeInTheDocument();
    expect(within(mobileRecord).getByText(studentProfile.student_id)).toBeInTheDocument();
    expect(within(mobileRecord).getByText(/senior high school/i)).toHaveClass('[overflow-wrap:anywhere]');

    await user.click(screen.getAllByRole('button', { name: /manage juan dela cruz/i })[0]);
    const recordDialog = screen.getByRole('dialog', { name: /student full record.*juan dela cruz/i });
    await user.click(within(recordDialog).getByRole('button', { name: /add penalty/i }));
    const hours = within(recordDialog).getByRole('spinbutton', { name: /hours to add/i });
    await user.clear(hours);
    await user.type(hours, '3');
    await user.type(within(recordDialog).getByRole('textbox', { name: /official reason.*ossa note/i }), 'Unexcused institutional absence');
    await user.click(within(recordDialog).getByRole('button', { name: /confirm adjustment/i }));
    expect(staffState.adjustSanctionHours).toHaveBeenCalledWith(
      'student-1',
      3,
      'Unexcused institutional absence',
    );
    await user.click(within(recordDialog).getByRole('button', { name: /close full record/i }));

    await user.click(screen.getByRole('button', { name: /cleared \(0\)/i }));
    expect(screen.getByText(/no matching student records found/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^all \(1\)/i }));
    await user.type(screen.getByRole('searchbox', { name: /search student sanctions/i }), 'missing student');
    expect(screen.getByText(/no matching student records found/i)).toBeInTheDocument();
  });

  it('reviews an OSSA excuse through the standardized dialog without changing the mutation payload', async () => {
    const user = userEvent.setup();
    useStaff();
    staffState.excuses = [{
      id: 'excuse-1',
      student_uid: 'student-1',
      student_name: 'Juan Dela Cruz',
      student_id: studentProfile.student_id,
      department: 'Senior High School',
      section: 'Newton',
      event_title: 'Institutional Assembly',
      category: 'medical',
      reason: 'Documented illness',
      submission_date: Date.now(),
      status: 'pending',
    }];
    renderRoute(<OSSADashboard />);

    await user.click(screen.getByRole('tab', { name: /excuse applications/i }));
    await user.click(screen.getByRole('button', { name: /review & decide excuse/i }));
    const dialog = screen.getByRole('dialog', { name: /review excuse submission/i });
    const waiveHours = within(dialog).getByRole('spinbutton', { name: /sanction hours to waive/i });
    await user.clear(waiveHours);
    await user.type(waiveHours, '4');
    await user.type(within(dialog).getByRole('textbox', { name: /director's decision note/i }), 'Medical certificate verified.');
    await user.click(within(dialog).getByRole('button', { name: /approve & waive hours/i }));

    expect(staffState.reviewExcuseApplication).toHaveBeenCalledWith(
      'excuse-1',
      'approved',
      'Medical certificate verified.',
      4,
    );
    expect(screen.queryByRole('dialog', { name: /review excuse submission/i })).not.toBeInTheDocument();
  });

  it('keeps OSSA excuse categories and decisions visually distinct in light and dark themes', async () => {
    const user = userEvent.setup();
    useStaff();
    staffState.excuses = [
      {
        id: 'medical-pending', student_uid: 'student-1', student_name: 'Medical Pending',
        student_id: 'RMC-1', department: 'SHS', section: 'Newton', event_title: 'Assembly',
        category: 'medical', reason: 'Illness', submission_date: Date.now(), status: 'pending',
      },
      {
        id: 'personal-approved', student_uid: 'student-2', student_name: 'Personal Approved',
        student_id: 'RMC-2', department: 'SHS', section: 'Newton', event_title: 'Assembly',
        category: 'personal', reason: 'Family matter', submission_date: Date.now(), status: 'approved',
      },
      {
        id: 'emergency-rejected', student_uid: 'student-3', student_name: 'Emergency Rejected',
        student_id: 'RMC-3', department: 'SHS', section: 'Newton', event_title: 'Assembly',
        category: 'emergency', reason: 'Emergency', submission_date: Date.now(), status: 'rejected',
      },
      {
        id: 'institutional-approved', student_uid: 'student-4', student_name: 'Institutional Approved',
        student_id: 'RMC-4', department: 'SHS', section: 'Newton', event_title: 'Assembly',
        category: 'institutional', reason: 'Official duty', submission_date: Date.now(), status: 'approved',
      },
    ];
    renderRoute(<OSSADashboard />);

    await user.click(screen.getByRole('tab', { name: /excuse applications/i }));

    expect(screen.getByText('medical Excuse')).toHaveClass(
      'bg-blue-100', 'text-blue-700', 'dark:bg-blue-950', 'dark:text-blue-300',
    );
    expect(screen.getByText('personal Excuse')).toHaveClass(
      'bg-purple-100', 'text-purple-700', 'dark:bg-purple-950', 'dark:text-purple-300',
    );
    expect(screen.getByText('institutional Excuse')).toHaveClass(
      'bg-indigo-100', 'text-indigo-700', 'dark:bg-indigo-950', 'dark:text-indigo-300',
    );
    expect(screen.getByText('emergency Excuse')).toHaveClass(
      'bg-rose-100', 'text-rose-700', 'dark:bg-rose-950', 'dark:text-rose-300',
    );
    expect(screen.getByText('pending')).toHaveClass(
      'bg-amber-100', 'text-amber-800', 'dark:bg-amber-950', 'dark:text-amber-300',
    );
    expect(screen.getByText('rejected')).toHaveClass(
      'bg-red-100', 'text-red-700', 'dark:bg-red-950', 'dark:text-red-300',
    );
    screen.getAllByText('approved').forEach((status) => {
      expect(status).toHaveClass(
        'bg-emerald-100', 'text-emerald-700', 'dark:bg-emerald-950', 'dark:text-emerald-300',
      );
    });
  });

  it('uses named SSG dialogs, mobile registry cards, and protected confirmation for sanction changes', async () => {
    const user = userEvent.setup();
    useStaff();
    seedStaffDirectory();
    renderRoute(<SSGPanel />);

    expect(screen.getByRole('main')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /rmc campus/i }));
    await user.click(screen.getByRole('button', { name: /senior high school/i }));
    await user.click(screen.getByRole('button', { name: /^newton/i }));
    expect(screen.getByRole('table', { name: /newton personnel registry/i })).toBeInTheDocument();
    const studentCard = screen.getByRole('article', { name: /juan dela cruz/i });
    expect(within(studentCard).getByText(/long-address/i)).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /manage juan dela cruz/i })[0]);

    const memberDialog = screen.getByRole('dialog', { name: /member details.*juan dela cruz/i });
    expect(memberDialog).toBeInTheDocument();
    expect(within(memberDialog).getByText(/long-address/i)).toHaveClass('[overflow-wrap:anywhere]');
    await user.click(screen.getByRole('button', { name: /add one sanction hour/i }));
    expect(screen.getByRole('dialog', { name: /confirm sanction change/i })).toBeInTheDocument();
    await user.click(screen.getAllByTestId('modal-backdrop').at(-1)!);
    expect(screen.getByRole('dialog', { name: /confirm sanction change/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /confirm add hour/i }));
    expect(staffState.adjustSanctionHours).toHaveBeenCalledWith(
      'student-1',
      1,
      'Administrative Adjustment: SSG President',
    );
    await user.click(within(memberDialog).getByRole('button', { name: /^mayor$/i }));
    expect(staffState.assignRole).toHaveBeenCalledWith('student-1', 'mayor');
  });
});
