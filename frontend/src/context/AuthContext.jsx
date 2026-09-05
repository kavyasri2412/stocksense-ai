import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('stocksense_user');
    return saved ? JSON.parse(saved) : {
      user_id: 'USR-STORE-01',
      name: 'Retail Manager',
      email: 'manager@retail.local',
      role: 'Store Manager'
    };
  });

  const [activeStore, setActiveStore] = useState(() => {
    return localStorage.getItem('stocksense_store') || 'All Stores';
  });

  const [availableStores, setAvailableStores] = useState(['All Stores']);
  const [evidenceDrawerData, setEvidenceDrawerData] = useState(null);

  useEffect(() => {
    // Dynamically load stores from active database records
    api.getInventory()
      .then(res => {
        if (res.available_stores && res.available_stores.length > 0) {
          setAvailableStores(['All Stores', ...res.available_stores]);
        }
      })
      .catch(() => {});
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('stocksense_user', JSON.stringify(userData));
  };

  const logout = () => {
    localStorage.removeItem('stocksense_user');
    setUser({
      user_id: 'USR-STORE-01',
      name: 'Retail Manager',
      email: 'manager@retail.local',
      role: 'Store Manager'
    });
  };

  const changeStore = (storeName) => {
    setActiveStore(storeName);
    localStorage.setItem('stocksense_store', storeName);
  };

  const openEvidence = (data) => {
    setEvidenceDrawerData(data);
  };

  const closeEvidence = () => {
    setEvidenceDrawerData(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      activeStore,
      changeStore,
      availableStores,
      evidenceDrawerData,
      openEvidence,
      closeEvidence
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
