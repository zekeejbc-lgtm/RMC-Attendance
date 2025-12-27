
import { ref, set, get } from 'firebase/database';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';

export interface TestAccount {
  email: string;
  user: string;
  role: string;
  name: string;
}

export const TEST_ACCOUNTS: TestAccount[] = [
  { email: 'admin@test.com', user: 'admin', role: 'admin', name: 'Regal Admin' },
  { email: 'ssg@test.com', user: 'ssg', role: 'ssg', name: 'Officer Juan' },
  { email: 'mayor@test.com', user: 'mayor', role: 'mayor', name: 'Mayor Maria' },
  { email: 'student@test.com', user: 'student', role: 'student', name: 'Pedro Penduko' },
];

export const seedMockData = async (onProgress: (msg: string) => void) => {
  const pass = 'password123';
  onProgress("Initializing seed process...");

  for (const u of TEST_ACCOUNTS) {
    try {
      // 1. Check if username mapping already exists to avoid redundant auth calls
      const usernameCheck = await get(ref(db, `usernames/${u.user}`));
      if (usernameCheck.exists()) {
        onProgress(`Account '${u.user}' already exists. Skipping.`);
        continue;
      }

      // 2. Create Auth
      const cred = await createUserWithEmailAndPassword(auth, u.email, pass);
      const uid = cred.user.uid;

      // 3. Map Username
      await set(ref(db, `usernames/${u.user}`), u.email);

      // 4. Create Profile
      await set(ref(db, `users/${uid}`), {
        profile: {
          uid,
          name: u.name,
          username: u.user,
          role: u.role,
          student_id: `ID-${Math.floor(Math.random() * 9000) + 1000}`,
          photo_url: `https://i.pravatar.cc/150?u=${uid}`,
          school_data: {
            department: "Senior High",
            track: "STEM",
            section: "Grade 12 - Newton"
          }
        },
        stats: {
          attendance_rate: 95,
          sanctions: u.role === 'student' ? 1 : 0
        }
      });
      onProgress(`Successfully seeded: ${u.role}`);
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') {
        onProgress(`Auth exists for ${u.user}. Mapping database...`);
        // If auth exists but DB might be empty (e.g. partial crash), try to re-map
        // In a real dev scenario, we'd handle UID lookup here, but for mock we skip.
      } else {
        onProgress(`Error seeding ${u.role}: ${e.message}`);
      }
    }
  }

  // Seed one active event if none exists
  const eventsCheck = await get(ref(db, 'events/test-event-001'));
  if (!eventsCheck.exists()) {
    await set(ref(db, 'events/test-event-001'), {
      title: "Morning Convocation",
      status: "active",
      created_by: "system",
      location: {
        lat: 7.0736,
        lng: 125.6126,
        radius_meters: 500
      }
    });
    onProgress("Seeded active event: Morning Convocation");
  }

  onProgress("Seed process complete!");
};
