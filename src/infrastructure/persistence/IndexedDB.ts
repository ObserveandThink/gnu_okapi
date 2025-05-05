/**
 * @fileOverview Manages the IndexedDB database connection and schema.
 */

export const DB_NAME = 'okapiFlowDB';
export const DB_VERSION = 5; // Incremented version for new store

// Define object store names
export const STORES = {
  SPACES: 'spaces',
  ACTIONS: 'actions',
  MULTI_STEP_ACTIONS: 'multiStepActions',
  LOG_ENTRIES: 'logEntries',
  WASTE_ENTRIES: 'wasteEntries',
  COMMENTS: 'comments',
  TODOS: 'todos', // Added todos store
};

let dbInstance: IDBDatabase | null = null;

/**
 * Opens and initializes the IndexedDB database.
 * Ensures the correct schema and indexes are created.
 * Returns a singleton promise that resolves with the database instance.
 * @returns A promise resolving to the IDBDatabase instance.
 */
export const openDB = (): Promise<IDBDatabase> => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    // If instance exists and connection is open, resolve immediately
    if (dbInstance && dbInstance.objectStoreNames.length > 0) {
      resolve(dbInstance);
      return;
    }

    console.log(`Opening IndexedDB '${DB_NAME}' version ${DB_VERSION}...`);
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB error:', request.error);
      reject(new Error(`IndexedDB error: ${request.error?.message || 'Unknown error'}`));
    };

    request.onsuccess = (event) => {
      console.log("IndexedDB opened successfully.");
      dbInstance = request.result;

      dbInstance.onversionchange = () => {
          console.log("IndexedDB version change detected. Closing connection...");
          dbInstance?.close();
          alert("Database has been updated. Please reload the page.");
        };

      resolve(dbInstance);
    };

    request.onblocked = (event) => {
        console.warn("IndexedDB open request blocked. Please close other tabs using this app.");
        alert("Please close other tabs running this application to update the database.");
    };

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      console.log("IndexedDB upgrade needed.");
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;
      const transaction = (event.target as IDBOpenDBRequest).transaction;

       if (!transaction) {
            console.error("Upgrade transaction is null!");
            reject(new Error("Upgrade transaction failed to start."));
            return;
        }

      console.log(`Upgrading IndexedDB from version ${oldVersion} to ${DB_VERSION}`);

      // Helper function to create store and index if they don't exist
      const createStoreAndIndex = (storeName: string, keyPath: string, indexName?: string, indexKeyPath?: string | string[]) => {
        let store: IDBObjectStore;
        if (!db.objectStoreNames.contains(storeName)) {
          store = db.createObjectStore(storeName, { keyPath: keyPath });
          console.log(`Created object store: ${storeName}`);
        } else {
           store = transaction.objectStore(storeName);
        }

        if (indexName && indexKeyPath && !store.indexNames.contains(indexName)) {
          store.createIndex(indexName, indexKeyPath, { unique: false });
          console.log(`Created index '${indexName}' on store '${storeName}'`);
        }
      };

       // --- Schema Definition ---
       // Always check if stores/indexes exist before creating

      // Spaces Store
      createStoreAndIndex(STORES.SPACES, 'id');

      // Stores requiring spaceId index
      createStoreAndIndex(STORES.ACTIONS, 'id', 'spaceIdIndex', 'spaceId');
      createStoreAndIndex(STORES.MULTI_STEP_ACTIONS, 'id', 'spaceIdIndex', 'spaceId');
      createStoreAndIndex(STORES.LOG_ENTRIES, 'id', 'spaceIdIndex', 'spaceId');
      createStoreAndIndex(STORES.WASTE_ENTRIES, 'id', 'spaceIdIndex', 'spaceId');
      createStoreAndIndex(STORES.COMMENTS, 'id', 'spaceIdIndex', 'spaceId');
      createStoreAndIndex(STORES.TODOS, 'id', 'spaceIdIndex', 'spaceId'); // Create todos store with index


      // --- Potential Migrations Based on Old Version ---
       if (oldVersion < 5) {
          // This block ensures the todos store is created if upgrading from a version before 5
          createStoreAndIndex(STORES.TODOS, 'id', 'spaceIdIndex', 'spaceId');
       }


      console.log("IndexedDB upgrade complete.");
    };
  });
};

// Optional: Function to close the database if needed
export const closeDB = () => {
    if (dbInstance) {
        console.log("Closing IndexedDB connection.");
        dbInstance.close();
        dbInstance = null;
    }
};
