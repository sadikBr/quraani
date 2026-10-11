import { createContext, useContext, type PropsWithChildren } from 'react';

const Context = createContext(false);

/**
 * Marks a page shown inside the home screen's tabs: it then leaves out its own safe area, its
 * navigation row and its title, which the home screen's header and tabs already provide.
 */
export function Embedded({ children }: PropsWithChildren) {
  return <Context.Provider value>{children}</Context.Provider>;
}

export const useEmbedded = () => useContext(Context);
