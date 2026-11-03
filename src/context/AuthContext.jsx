import { useState, useEffect } from 'react';
import api from '../services/api';
import { AuthContext } from './authContextDef';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const res = await api.get('/auth/me');
        if (isMounted) {
          if (res.data?.user && res.data.user.account_status === 'active') {
            const normalizedUser = {
              ...res.data.user,
              role: String(res.data.user.role || '').trim().toLowerCase(),
              account_status: String(res.data.user.account_status || 'active').trim().toLowerCase(),
            };
            setUser(normalizedUser);
          } else {
            setUser(null);
          }
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    const handleUnauthorized = () => {
      setUser(null);
    };

    window.addEventListener('platewise:unauthorized', handleUnauthorized);
    return () => {
      isMounted = false;
      window.removeEventListener('platewise:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email, password, options = null) => {
    const loginAs = typeof options === 'string' ? options : options?.login_as;
    const res = await api.post('/auth/login', {
      email,
      password,
      ...(loginAs ? { login_as: loginAs } : {}),
    });

    if (res.data?.user) {
      const normalizedUser = {
        ...res.data.user,
        role: String(res.data.user.role || '').trim().toLowerCase(),
        account_status: String(res.data.user.account_status || 'active').trim().toLowerCase(),
      };
      setUser(normalizedUser);
      return normalizedUser;
    }
    return null;
  };

  const register = async (fullName, email, password, confirmPassword, accountType = 'student') => {
    const res = await api.post('/auth/register', {
      full_name: fullName,
      email,
      password,
      ...(confirmPassword !== undefined ? { confirm_password: confirmPassword } : {}),
      account_type: accountType,
    });

    if (res.data?.user && res.data.user.account_status === 'active') {
      const normalizedUser = {
        ...res.data.user,
        role: String(res.data.user.role || '').trim().toLowerCase(),
        account_status: 'active',
      };
      setUser(normalizedUser);
    }
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('[Auth] Logout error:', err.message);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
