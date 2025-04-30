'use client';

import type React from 'react';
import {
  createContext,
  useCallback,
  useState,
  useEffect,
  useContext,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/hooks/use-toast';

// --- Interfaces ---

interface Space {
  id: string;
  name: string;
  description?: string;
  goal?: string;
  beforeImage?: string | null;
  afterImage?: string | null;
  dateCreated: Date;
  dateModified: Date;
  totalClockedInTime: number; // in minutes
}

interface Action {
  id: string;
  name: string;
  spaceId: string;
  description?: string;
  points: number;
}

interface MultiStepAction {
  id: string;
  name: string;
  spaceId: string;
  description?: string;
  pointsPerStep: number;
  steps: { id: string; name: string; completed: boolean }[];
  currentStepIndex: number;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  actionName: string;
  points: number;
  type: 'action' | 'multiStepAction' | 'clockIn' | 'clockOut';
  multiStepActionId?: string;
  stepIndex?: number;
  clockInTime?: Date;
  clockOutTime?: Date;
  minutesClockedIn?: number;
  spaceId: string;
}

interface WasteEntry {
  id: string;
  timestamp: Date;
  type: string; // TIMWOODS category name
  points: number;
  spaceId: string;
}

interface Comment {
  id: string;
  text: string;
  imageUrl?: string | null;
  timestamp: Date;
  spaceId: string;
}

interface SpaceContextProps {
  spaces: Space[];
  actions: Action[];
  multiStepActions: MultiStepAction[];
  logEntries: LogEntry[];
  wasteEntries: WasteEntry[];
  comments: Comment[];
  db: IDBDatabase | null;
  setActions: React.Dispatch<React.SetStateAction<Action[]>>;
  setMultiStepActions: React.Dispatch<React.SetStateAction<MultiStepAction[]>>;
  setLogEntries: React.Dispatch<React.SetStateAction<LogEntry[]>>;
  setWasteEntries: React.Dispatch<React.SetStateAction<WasteEntry[]>>;
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
  addSpace: (space: Omit<Space, 'id' | 'dateCreated' | 'dateModified' | 'totalClockedInTime'>) => Promise<Space | undefined>;
  updateSpace: (space: Space) => Promise<void>;
  deleteSpace: (spaceId: string) => Promise<void>;
  addAction: (action: Omit<Action, 'id'>) => Promise<Action | undefined>;
  addMultiStepAction: (action: Omit<MultiStepAction, 'id' | 'currentStepIndex'>) => Promise<MultiStepAction | undefined>;
  updateMultiStepAction: (action: MultiStepAction) => Promise<void>;
  addLogEntry: (logEntry: Omit<LogEntry, 'id'>) => Promise<LogEntry | undefined>;
  addWasteEntry: (wasteEntry: Omit<WasteEntry, 'id'>) => Promise<WasteEntry | undefined>;
  addComment: (comment: Omit<Comment, 'id'>) => Promise<Comment | undefined>;
  loadDataForSpace: (spaceId: string) => Promise<void>;
  loadSpaces: () => Promise<void>;
}

const DB_NAME = 'okapiFlowDB';
const DB_VERSION = 4; // Incremented version
const STORES = {
  SPACES: 'spaces',
  ACTIONS: 'actions',
  MULTI_STEP_ACTIONS: 'multiStepActions',
  LOG_ENTRIES: 'logEntries',
  WASTE_ENTRIES: 'wasteEntries',
  COMMENTS: 'comments',
};

// --- IndexedDB Helper Functions ---

const openDB = (dbName: string, version: number) => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName, version);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(request.error);
    };
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;
      console.log(`Upgrading IndexedDB from version ${oldVersion} to ${version}`);

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.SPACES)) {
        db.createObjectStore(STORES.SPACES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.ACTIONS)) {
        const actionsStore = db.createObjectStore(STORES.ACTIONS, { keyPath: 'id' });
        // Create index for spaceId if it doesn't exist (needed in new version)
        if (!actionsStore.indexNames.contains('spaceIdIndex')) {
          actionsStore.createIndex('spaceIdIndex', 'spaceId', { unique: false });
          console.log(`Created index 'spaceIdIndex' on store '${STORES.ACTIONS}'`);
        }
      }
      if (!db.objectStoreNames.contains(STORES.MULTI_STEP_ACTIONS)) {
        const multiStepActionsStore = db.createObjectStore(STORES.MULTI_STEP_ACTIONS, { keyPath: 'id' });
         // Create index for spaceId if it doesn't exist (needed in new version)
        if (!multiStepActionsStore.indexNames.contains('spaceIdIndex')) {
            multiStepActionsStore.createIndex('spaceIdIndex', 'spaceId', { unique: false });
            console.log(`Created index 'spaceIdIndex' on store '${STORES.MULTI_STEP_ACTIONS}'`);
        }
      }
      if (!db.objectStoreNames.contains(STORES.LOG_ENTRIES)) {
        const logEntriesStore = db.createObjectStore(STORES.LOG_ENTRIES, { keyPath: 'id' });
         // Create index for spaceId if it doesn't exist (needed in new version)
         if (!logEntriesStore.indexNames.contains('spaceIdIndex')) {
            logEntriesStore.createIndex('spaceIdIndex', 'spaceId', { unique: false });
            console.log(`Created index 'spaceIdIndex' on store '${STORES.LOG_ENTRIES}'`);
        }
      }
      if (!db.objectStoreNames.contains(STORES.WASTE_ENTRIES)) {
        const wasteEntriesStore = db.createObjectStore(STORES.WASTE_ENTRIES, { keyPath: 'id' });
         // Create index for spaceId if it doesn't exist (needed in new version)
        if (!wasteEntriesStore.indexNames.contains('spaceIdIndex')) {
            wasteEntriesStore.createIndex('spaceIdIndex', 'spaceId', { unique: false });
            console.log(`Created index 'spaceIdIndex' on store '${STORES.WASTE_ENTRIES}'`);
        }
      }
      if (!db.objectStoreNames.contains(STORES.COMMENTS)) {
         const commentsStore = db.createObjectStore(STORES.COMMENTS, { keyPath: 'id' });
         // Create index for spaceId if it doesn't exist (needed in new version)
         if (!commentsStore.indexNames.contains('spaceIdIndex')) {
             commentsStore.createIndex('spaceIdIndex', 'spaceId', { unique: false });
             console.log(`Created index 'spaceIdIndex' on store '${STORES.COMMENTS}'`);
         }
      }

      // Handle specific version upgrades if necessary
      if (oldVersion < 4) {
         // Ensure indexes exist for stores created in previous versions
         const storesWithIndex = [STORES.ACTIONS, STORES.MULTI_STEP_ACTIONS, STORES.LOG_ENTRIES, STORES.WASTE_ENTRIES, STORES.COMMENTS];
         const transaction = (event.target as IDBOpenDBRequest).transaction;
         if (transaction) {
            storesWithIndex.forEach(storeName => {
                if (db.objectStoreNames.contains(storeName)) {
                    const store = transaction.objectStore(storeName);
                    if (!store.indexNames.contains('spaceIdIndex')) {
                        store.createIndex('spaceIdIndex', 'spaceId', { unique: false });
                         console.log(`Created index 'spaceIdIndex' on store '${storeName}' during upgrade`);
                    }
                }
            });
         } else {
            console.error("Transaction not available during upgrade needed");
         }
      }
    };
  });
};


const addItem = <T extends { id: string }>(db: IDBDatabase, storeName: string, item: T) => {
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item); // Use put to add or update

    request.onerror = () => {
        console.error(`Error adding/updating item in ${storeName}:`, request.error);
        reject(request.error)
    };
    request.onsuccess = () => resolve(item); // Resolve with the added/updated item
  });
};

const getItem = <T>(db: IDBDatabase, storeName: string, id: string) => {
  return new Promise<T | undefined>((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onerror = () => {
        console.error(`Error getting item ${id} from ${storeName}:`, request.error);
        reject(request.error);
    }
    request.onsuccess = () => resolve(request.result as T | undefined);
  });
};


const getAllItems = <T>(db: IDBDatabase, storeName: string) => {
  return new Promise<T[]>((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => {
        console.error(`Error getting all items from ${storeName}:`, request.error);
        reject(request.error);
    }
    request.onsuccess = () => resolve(request.result as T[]);
  });
};

const getItemsBySpaceId = <T>(db: IDBDatabase, storeName: string, spaceId: string) => {
  return new Promise<T[]>((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    try {
      const index = store.index('spaceIdIndex'); // Use the created index
      const request = index.getAll(spaceId);

      request.onerror = () => {
        console.error(`Error getting items by spaceId ${spaceId} from ${storeName}:`, request.error);
        reject(request.error);
      };
      request.onsuccess = () => resolve(request.result as T[]);
    } catch (error) {
       console.error(`Error accessing index 'spaceIdIndex' on store ${storeName}:`, error);
       reject(error);
    }
  });
};

const deleteItem = (db: IDBDatabase, storeName: string, id: string) => {
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onerror = () => {
        console.error(`Error deleting item ${id} from ${storeName}:`, request.error);
        reject(request.error);
    }
    request.onsuccess = () => resolve();
  });
};

const deleteItemsBySpaceId = (db: IDBDatabase, storeName: string, spaceId: string) => {
  return new Promise<void>(async (resolve, reject) => {
      try {
          const itemsToDelete = await getItemsBySpaceId<any>(db, storeName, spaceId);
          if (itemsToDelete.length === 0) {
              resolve();
              return;
          }

          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          let deleteCount = 0;

          itemsToDelete.forEach(item => {
              const request = store.delete(item.id);
              request.onsuccess = () => {
                  deleteCount++;
                  if (deleteCount === itemsToDelete.length) {
                      resolve();
                  }
              };
              request.onerror = () => {
                  console.error(`Error deleting item ${item.id} from ${storeName} by spaceId ${spaceId}:`, request.error);
                  // Continue trying to delete others, but report the first error
                  if (deleteCount < itemsToDelete.length) {
                      reject(request.error);
                      deleteCount = itemsToDelete.length; // Prevent resolving successfully
                  }
              };
          });

          transaction.onerror = () => {
              console.error(`Transaction error deleting items from ${storeName} by spaceId ${spaceId}:`, transaction.error);
              reject(transaction.error);
          };

      } catch (error) {
          console.error(`Error fetching items to delete from ${storeName} by spaceId ${spaceId}:`, error);
          reject(error);
      }
  });
};


// --- Context ---

const SpaceContext = createContext<SpaceContextProps | undefined>(undefined);

export const useSpaceContext = () => {
  const context = useContext(SpaceContext);
  if (!context) {
    throw new Error("useSpaceContext must be used within a SpaceProvider");
  }
  return context;
};

// --- Provider ---

interface SpaceProviderProps {
  children: React.ReactNode;
}

export const SpaceProvider = ({ children }: SpaceProviderProps) => {
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  // State specific to the currently viewed space
  const [actions, setActions] = useState<Action[]>([]);
  const [multiStepActions, setMultiStepActions] = useState<MultiStepAction[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [wasteEntries, setWasteEntries] = useState<WasteEntry[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);

  // --- Database Initialization ---
  useEffect(() => {
    const initializeDB = async () => {
      try {
        console.log("Initializing IndexedDB...");
        const newDb = await openDB(DB_NAME, DB_VERSION);
        console.log("IndexedDB initialized successfully.");
        setDb(newDb);
        // Load all spaces initially
        await loadSpaces(newDb);
      } catch (error) {
        console.error("Failed to initialize IndexedDB:", error);
        toast({ title: "Error", description: "Failed to initialize database.", variant: "destructive" });
      }
    };
    initializeDB();
  }, []);

  // --- Data Loading Functions ---
 const loadSpaces = useCallback(async (database = db) => {
    if (database) {
      try {
        const loadedSpaces = await getAllItems<Space>(database, STORES.SPACES);
        setSpaces(loadedSpaces.map(s => ({ // Ensure dates are Date objects
            ...s,
            dateCreated: new Date(s.dateCreated),
            dateModified: new Date(s.dateModified),
        })));
      } catch (error) {
        console.error("Failed to load spaces:", error);
        toast({ title: "Error", description: "Failed to load spaces.", variant: "destructive" });
      }
    }
  }, [db]);


  const loadDataForSpace = useCallback(async (spaceId: string) => {
    if (db) {
      console.log(`Loading data for space: ${spaceId}`);
      try {
        const [
          loadedActions,
          loadedMultiStepActions,
          loadedLogEntries,
          loadedWasteEntries,
          loadedComments
        ] = await Promise.all([
          getItemsBySpaceId<Action>(db, STORES.ACTIONS, spaceId),
          getItemsBySpaceId<MultiStepAction>(db, STORES.MULTI_STEP_ACTIONS, spaceId),
          getItemsBySpaceId<LogEntry>(db, STORES.LOG_ENTRIES, spaceId),
          getItemsBySpaceId<WasteEntry>(db, STORES.WASTE_ENTRIES, spaceId),
          getItemsBySpaceId<Comment>(db, STORES.COMMENTS, spaceId),
        ]);

        // Sort log entries and waste entries by timestamp descending
        loadedLogEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        loadedWasteEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        loadedComments.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());


        setActions(loadedActions);
        setMultiStepActions(loadedMultiStepActions);
        setLogEntries(loadedLogEntries.map(l => ({ // Ensure dates are Date objects
            ...l,
            timestamp: new Date(l.timestamp),
            clockInTime: l.clockInTime ? new Date(l.clockInTime) : undefined,
            clockOutTime: l.clockOutTime ? new Date(l.clockOutTime) : undefined,
        })));
        setWasteEntries(loadedWasteEntries.map(w => ({ ...w, timestamp: new Date(w.timestamp)}))); // Ensure dates
        setComments(loadedComments.map(c => ({ ...c, timestamp: new Date(c.timestamp) }))); // Ensure dates
        console.log(`Data loaded for space ${spaceId}:`, { loadedActions, loadedMultiStepActions, loadedLogEntries, loadedWasteEntries, loadedComments });

      } catch (error) {
        console.error(`Failed to load data for space ${spaceId}:`, error);
        toast({ title: "Error", description: `Failed to load data for space ${spaceId}.`, variant: "destructive" });
         // Clear existing data on error?
         setActions([]);
         setMultiStepActions([]);
         setLogEntries([]);
         setWasteEntries([]);
         setComments([]);
      }
    } else {
        console.warn("Attempted to load data before DB was initialized.");
    }
  }, [db]); // Depend only on db


  // --- Data Modification Functions ---

  const addSpace = useCallback(async (spaceData: Omit<Space, 'id' | 'dateCreated' | 'dateModified' | 'totalClockedInTime'>) => {
    if (!db) {
      toast({ title: "Error", description: "Database not ready.", variant: "destructive" });
      return undefined;
    }
    const newSpace: Space = {
      ...spaceData,
      id: uuidv4(),
      dateCreated: new Date(),
      dateModified: new Date(),
      totalClockedInTime: 0,
    };
    try {
      await addItem(db, STORES.SPACES, newSpace);
      setSpaces(prev => [...prev, newSpace]);
      return newSpace;
    } catch (error) {
      console.error("Failed to add space:", error);
      toast({ title: "Error", description: "Failed to save space.", variant: "destructive" });
      return undefined;
    }
  }, [db]);

  const updateSpace = useCallback(async (space: Space) => {
    if (!db) {
      toast({ title: "Error", description: "Database not ready.", variant: "destructive" });
      return;
    }
    const updatedSpace = { ...space, dateModified: new Date() };
    try {
      await addItem(db, STORES.SPACES, updatedSpace); // addItem also updates
      setSpaces(prevSpaces => prevSpaces.map(s => s.id === updatedSpace.id ? updatedSpace : s));
       // Also update the state if the change happened to the currently viewed space's data?
       // This might be complex if editing from the list view.
       // For now, relying on reload when entering the space.
    } catch (error) {
      console.error("Failed to update space:", error);
      toast({ title: "Error", description: "Failed to update space.", variant: "destructive" });
    }
  }, [db]);

   const deleteSpace = useCallback(async (spaceId: string) => {
    if (!db) {
      toast({ title: "Error", description: "Database not ready.", variant: "destructive" });
      return;
    }
    try {
      // Delete the space itself
      await deleteItem(db, STORES.SPACES, spaceId);

      // Delete all related items from other stores
      await Promise.all([
        deleteItemsBySpaceId(db, STORES.ACTIONS, spaceId),
        deleteItemsBySpaceId(db, STORES.MULTI_STEP_ACTIONS, spaceId),
        deleteItemsBySpaceId(db, STORES.LOG_ENTRIES, spaceId),
        deleteItemsBySpaceId(db, STORES.WASTE_ENTRIES, spaceId),
        deleteItemsBySpaceId(db, STORES.COMMENTS, spaceId),
      ]);

      // Update local state
      setSpaces(prevSpaces => prevSpaces.filter(s => s.id !== spaceId));

      // If the deleted space was the one being viewed, clear the detailed state
      // (This part might need adjustment based on how navigation works)
       setActions([]);
       setMultiStepActions([]);
       setLogEntries([]);
       setWasteEntries([]);
       setComments([]);


      toast({ title: "Space Deleted", description: "Space and all associated data removed." });
    } catch (error) {
      console.error("Failed to delete space:", error);
      toast({ title: "Error", description: "Failed to delete space.", variant: "destructive" });
    }
  }, [db]);

  const addAction = useCallback(async (actionData: Omit<Action, 'id'>) => {
    if (!db) {
      toast({ title: "Error", description: "Database not ready.", variant: "destructive" });
      return undefined;
    }
    const newAction: Action = { ...actionData, id: uuidv4() };
    try {
      await addItem(db, STORES.ACTIONS, newAction);
      setActions(prev => [...prev, newAction]);
      return newAction;
    } catch (error) {
      console.error("Failed to add action:", error);
      toast({ title: "Error", description: "Failed to save action.", variant: "destructive" });
      return undefined;
    }
  }, [db]);

  const addMultiStepAction = useCallback(async (actionData: Omit<MultiStepAction, 'id' | 'currentStepIndex'>) => {
    if (!db) {
      toast({ title: "Error", description: "Database not ready.", variant: "destructive" });
      return undefined;
    }
    const newAction: MultiStepAction = {
      ...actionData,
      id: uuidv4(),
      currentStepIndex: 0,
      steps: actionData.steps.map(step => ({ ...step, id: uuidv4(), completed: false })) // Assign IDs to steps
    };
    try {
      await addItem(db, STORES.MULTI_STEP_ACTIONS, newAction);
      setMultiStepActions(prev => [...prev, newAction]);
      return newAction;
    } catch (error) {
      console.error("Failed to add multi-step action:", error);
      toast({ title: "Error", description: "Failed to save multi-step action.", variant: "destructive" });
      return undefined;
    }
  }, [db]);

  const updateMultiStepAction = useCallback(async (action: MultiStepAction) => {
    if (!db) {
       toast({ title: "Error", description: "Database not ready.", variant: "destructive" });
       return;
     }
     try {
       await addItem(db, STORES.MULTI_STEP_ACTIONS, action); // addItem updates
       setMultiStepActions(prevActions => prevActions.map(a => a.id === action.id ? action : a));
     } catch (error) {
       console.error("Failed to update multi-step action:", error);
       toast({ title: "Error", description: "Failed to update multi-step action.", variant: "destructive" });
     }
   }, [db]);

  const addLogEntry = useCallback(async (logEntryData: Omit<LogEntry, 'id'>) => {
    if (!db) {
      toast({ title: "Error", description: "Database not ready.", variant: "destructive" });
      return undefined;
    }
     const newLogEntry: LogEntry = {
        ...logEntryData,
        id: uuidv4(),
        // Ensure dates are correctly handled if passed as strings
        timestamp: new Date(logEntryData.timestamp),
        clockInTime: logEntryData.clockInTime ? new Date(logEntryData.clockInTime) : undefined,
        clockOutTime: logEntryData.clockOutTime ? new Date(logEntryData.clockOutTime) : undefined,
    };
    try {
      await addItem(db, STORES.LOG_ENTRIES, newLogEntry);
      // Add to the beginning and ensure sorted order (though loadDataForSpace handles sorting on load)
      setLogEntries(prev => [newLogEntry, ...prev].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      return newLogEntry;
    } catch (error) {
      console.error("Failed to add log entry:", error);
      toast({ title: "Error", description: "Failed to save log entry.", variant: "destructive" });
      return undefined;
    }
  }, [db]);

  const addWasteEntry = useCallback(async (wasteEntryData: Omit<WasteEntry, 'id'>) => {
    if (!db) {
      toast({ title: "Error", description: "Database not ready.", variant: "destructive" });
      return undefined;
    }
    const newWasteEntry: WasteEntry = {
        ...wasteEntryData,
         id: uuidv4(),
         timestamp: new Date(wasteEntryData.timestamp) // Ensure date
        };
    try {
      await addItem(db, STORES.WASTE_ENTRIES, newWasteEntry);
       // Add to the beginning and ensure sorted order
      setWasteEntries(prev => [newWasteEntry, ...prev].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      return newWasteEntry;
    } catch (error) {
      console.error("Failed to add waste entry:", error);
      toast({ title: "Error", description: "Failed to save waste entry.", variant: "destructive" });
      return undefined;
    }
  }, [db]);

  const addComment = useCallback(async (commentData: Omit<Comment, 'id'>) => {
    if (!db) {
      toast({ title: "Error", description: "Database not ready.", variant: "destructive" });
      return undefined;
    }
     const newComment: Comment = {
        ...commentData,
        id: uuidv4(),
        timestamp: new Date(commentData.timestamp) // Ensure date
    };
    try {
      await addItem(db, STORES.COMMENTS, newComment);
      // Add to the beginning and ensure sorted order
      setComments(prev => [newComment, ...prev].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      return newComment;
    } catch (error) {
      console.error("Failed to add comment:", error);
      toast({ title: "Error", description: "Failed to save comment.", variant: "destructive" });
      return undefined;
    }
  }, [db]);

  // --- Context Value ---
  const contextValue = {
    spaces,
    actions,
    multiStepActions,
    logEntries,
    wasteEntries,
    comments,
    db,
    setActions, // Primarily for use within the context/provider if needed
    setMultiStepActions,
    setLogEntries,
    setWasteEntries,
    setComments,
    addSpace,
    updateSpace,
    deleteSpace,
    addAction,
    addMultiStepAction,
    updateMultiStepAction,
    addLogEntry,
    addWasteEntry,
    addComment,
    loadDataForSpace, // Expose function to load data for a specific space
    loadSpaces, // Expose function to reload all spaces
  };

  return (
    <SpaceContext.Provider value={contextValue}>
      {children}
    </SpaceContext.Provider>
  );
};

    