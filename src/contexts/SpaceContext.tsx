'use client';

import React, {
  createContext,
  useCallback,
  useState,
  useEffect,
  useContext,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/hooks/use-toast';

interface SpaceContextProps {
  actions: Action[];
  setActions: React.Dispatch<React.SetStateAction<Action[]>>;
  logEntries: LogEntry[];
  setLogEntries: React.Dispatch<React.SetStateAction<LogEntry[]>>;
  wasteEntries: WasteEntry[];
  setWasteEntries: React.Dispatch<React.SetStateAction<WasteEntry[]>>;
  addAction: (action: Action) => Promise<void>;
  addLogEntry: (logEntry: LogEntry) => Promise<void>;
  addWasteEntry: (wasteEntry: WasteEntry) => Promise<void>;
}

const SpaceContext = createContext<SpaceContextProps | undefined>(undefined);

export const useSpaceContext = () => {
  const context = useContext(SpaceContext);
  if (!context) {
    throw new Error("useSpaceContext must be used within a SpaceProvider");
  }
  return context;
};

interface SpaceProviderProps {
  spaceId: string;
  children: React.ReactNode;
}

interface Action {
  id: string;
  name: string;
  spaceId: string;
  description?: string;
  points: number;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  actionName: string;
  points: number;
}

interface WasteEntry {
  id: string;
  timestamp: Date;
  type: string;
  points: number;
}

// IndexedDB helper functions
const openDB = (dbName: string, version: number) => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName, version);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('actions')) {
        db.createObjectStore('actions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('logEntries')) {
        db.createObjectStore('logEntries', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('wasteEntries')) {
        db.createObjectStore('wasteEntries', { keyPath: 'id' });
      }
    };
  });
};

const addItem = (db: IDBDatabase, storeName: string, item: any) => {
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.add(item);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

const getAllItems = (db: IDBDatabase, storeName: string) => {
  return new Promise<any[]>((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};


export const SpaceProvider = ({ spaceId, children }: SpaceProviderProps) => {
  const [actions, setActions] = useState<Action[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [wasteEntries, setWasteEntries] = useState<WasteEntry[]>([]);
  const [db, setDb] = useState<IDBDatabase | null>(null);

  useEffect(() => {
    const initializeDB = async () => {
      try {
        const newDb = await openDB('okapiFlowDB', 3);
        setDb(newDb);
      } catch (error) {
        console.error("Failed to initialize IndexedDB:", error);
        toast({ title: "Error", description: "Failed to initialize IndexedDB.", variant: "destructive" });
      }
    };
    initializeDB();
  }, []);

  useEffect(() => {
    if (db) {
      const loadActions = async () => {
        try {
          const loadedActions = await getAllItems(db, 'actions') as Action[];
          setActions(loadedActions.filter(action => action.spaceId === spaceId));
        } catch (error) {
          console.error("Failed to load actions:", error);
        }
      };

      const loadLogEntries = async () => {
        try {
          const loadedLogEntries = await getAllItems(db, 'logEntries') as LogEntry[];
          setLogEntries(loadedLogEntries.filter(entry => (entry as any).spaceId === spaceId));
        } catch (error) {
          console.error("Failed to load log entries:", error);
        }
      };

      const loadWasteEntries = async () => {
        try {
          const loadedWasteEntries = await getAllItems(db, 'wasteEntries') as WasteEntry[];
          setWasteEntries(loadedWasteEntries.filter(entry => (entry as any).spaceId === spaceId));
        } catch (error) {
          console.error("Failed to load waste entries:", error);
        }
      };

      loadActions();
      loadLogEntries();
      loadWasteEntries();
    }
  }, [db, spaceId]);

  const addAction = useCallback(async (action: Action) => {
    if (db) {
      try {
        await addItem(db, 'actions', action);
        setActions(prevActions => [...prevActions, action]);
      } catch (error) {
        console.error("Failed to add action:", error);
        toast({ title: "Error", description: "Failed to add action.", variant: "destructive" });
      }
    }
  }, [db]);

  const addLogEntry = useCallback(async (logEntry: LogEntry) => {
    if (db) {
      try {
        await addItem(db, 'logEntries', { ...logEntry, spaceId });
        setLogEntries(prevLogEntries => [logEntry, ...prevLogEntries]);
      } catch (error) {
        console.error("Failed to add log entry:", error);
        toast({ title: "Error", description: "Failed to add log entry.", variant: "destructive" });
      }
    }
  }, [db, spaceId]);

  const addWasteEntry = useCallback(async (wasteEntry: WasteEntry) => {
    if (db) {
      try {
        await addItem(db, 'wasteEntries', { ...wasteEntry, spaceId });
        setWasteEntries(prevWasteEntries => [wasteEntry, ...prevWasteEntries]);
      } catch (error) {
        console.error("Failed to add waste entry:", error);
        toast({ title: "Error", description: "Failed to add waste entry.", variant: "destructive" });
      }
    }
  }, [db, spaceId]);

  return (
    <SpaceContext.Provider value={{ actions, setActions, logEntries, setLogEntries, wasteEntries, setWasteEntries, addAction, addLogEntry, addWasteEntry }}>
      {children}
    </SpaceContext.Provider>
  );
};
