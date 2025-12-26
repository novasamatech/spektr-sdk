import './Theme.css';

import type { PropsWithChildren } from 'react';
import { createContext, useContext } from 'react';

export type ThemeVariant = 'light' | 'dark';

const ThemeContext = createContext<ThemeVariant>('dark');

export const Theme = ({ value, children }: PropsWithChildren<{ value: ThemeVariant }>) => {
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
