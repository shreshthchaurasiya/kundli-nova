import React, { createContext, useContext, useMemo } from 'react';
import { Repositories, createRepositories } from './createRepositories';

const RepositoryContext = createContext<Repositories | undefined>(undefined);

export const RepositoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const repositories = useMemo(() => createRepositories(), []);

  return (
    <RepositoryContext.Provider value={repositories}>
      {children}
    </RepositoryContext.Provider>
  );
};

export const useRepositories = () => {
  const context = useContext(RepositoryContext);
  if (context === undefined) {
    throw new Error('useRepositories must be used within a RepositoryProvider');
  }
  return context;
};
