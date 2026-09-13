
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, db } from '../firebase';
import { UserProfile, UserStats } from '../types';
import { mockAuth, isMockMode } from '../lib/mockBackend';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  stats: UserStats | null;
  loading: boolean;
  isMock: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  stats: null,
  loading: true,
  isMock: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const mockEnabled = isMockMode();

  const syncMock = useCallback(() => {
    const mockUser = mockAuth.getCurrentUser();
    if (mockUser) {
      setUser({ uid: mockUser.profile.uid, email: mockUser.profile.username });
      setProfile(mockUser.profile);
      setStats(mockUser.stats);
    } else {
      const pendingUid = localStorage.getItem('rmc_mock_session');
      setUser(pendingUid ? { uid: pendingUid, email: null } : null);
      setProfile(null);
      setStats(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (mockEnabled) {
      syncMock();
      
      // Listen for both cross-tab storage and same-tab custom events
      const onStorage = (e: StorageEvent) => { if (e.key === 'rmc_mock_session' || e.key === 'rmc_regalia_db') syncMock(); };
      window.addEventListener('storage', onStorage);
      window.addEventListener('rmc_auth_update', syncMock);
      
      return () => {
        window.removeEventListener('rmc_auth_update', syncMock);
        window.removeEventListener('storage', onStorage);
      };
    } else if (auth?.onAuthStateChanged) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser);
        if (firebaseUser) {
          try {
            const userRef = ref(db, `users/${firebaseUser.uid}`);
            onValue(userRef, (snapshot) => {
              const data = snapshot.val();
              if (data) {
                setProfile({ ...data.profile, uid: firebaseUser.uid });
                setStats(data.stats);
              }
              setLoading(false);
            }, () => setLoading(false));
          } catch (e) {
            console.error("Firebase DB error", e);
            setLoading(false);
          }
        } else {
          setProfile(null);
          setStats(null);
          setLoading(false);
        }
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, [mockEnabled, syncMock]);

  return (
    <AuthContext.Provider value={{ user, profile, stats, loading, isMock: mockEnabled }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
