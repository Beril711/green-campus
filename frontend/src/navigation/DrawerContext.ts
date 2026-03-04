// src/navigation/DrawerContext.ts
import { createContext, useContext } from 'react';

interface DrawerContextType {
    open: () => void;
    close: () => void;
}

export const DrawerContext = createContext<DrawerContextType>({
    open: () => { },
    close: () => { },
});

export function useDrawer() {
    return useContext(DrawerContext);
}
