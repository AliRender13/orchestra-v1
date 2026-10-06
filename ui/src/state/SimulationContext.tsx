import React from 'react';
import { buildInitialSim, simReducer, TICK_SEC } from '../mock/simulation';
import type { SimAction, SimState } from '../mock/simulation';

interface SimContextValue {
  sim: SimState;
  dispatch: React.Dispatch<SimAction>;
}

const SimulationContext = React.createContext<SimContextValue | null>(null);

/**
 * Owns the demo project's mock execution state for the whole app.
 * Ticks every TICK_SEC while the project is active — demo behavior only,
 * clearly labeled DEMO DATA in the UI. The real backend will replace this
 * with a live run feed.
 */
export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [sim, dispatch] = React.useReducer(simReducer, undefined, buildInitialSim);

  React.useEffect(() => {
    if (sim.projectStatus !== 'active') return;
    const id = setInterval(() => dispatch({ type: 'TICK' }), TICK_SEC * 1000);
    return () => clearInterval(id);
  }, [sim.projectStatus]);

  const value = React.useMemo(() => ({ sim, dispatch }), [sim]);
  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSimulation(): SimContextValue {
  const ctx = React.useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulation must be used inside SimulationProvider');
  return ctx;
}
