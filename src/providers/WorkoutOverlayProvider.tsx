import React, { createContext, useContext, useState } from 'react';

const InsetContext = createContext(0);
const SetInsetContext = createContext<(height: number) => void>(() => undefined);

/** The measured mini-player height lets content scroll fully above its controls. */
export function WorkoutOverlayProvider({ children }: { children: React.ReactNode }) {
  const [inset, setInset] = useState(0);
  return (
    <SetInsetContext.Provider value={setInset}>
      <InsetContext.Provider value={inset}>{children}</InsetContext.Provider>
    </SetInsetContext.Provider>
  );
}

export const useWorkoutOverlayInset = () => useContext(InsetContext);
export const useSetWorkoutOverlayInset = () => useContext(SetInsetContext);
