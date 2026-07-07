import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type SidebarContextType = {
  collapsed: boolean;
  toggle: () => void;
};

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  toggle: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);

  const toggle = () => {
    setCollapsed((prev) => !prev);
  };

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
};
