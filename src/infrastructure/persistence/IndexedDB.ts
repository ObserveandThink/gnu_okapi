/**
 * @fileOverview Manages the IndexedDB database connection and schema.
 */

export const DB_NAME = 'okapiFlowDB';
export const DB_VERSION = 4; // Increment this when schema changes

// Define object store names
export const STORES = {
  SPACES: 'spaces',
  ACTIONS: 'actions',
  MULTI_STEP_ACTIONS: 'multiStepActions',
  LOG_ENTRIES: 'logEntries',
  WASTE_ENTRIES: 'wasteEntries',
  COMMENTS: 'comments',
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
        // Basic check if connection seems alive. More robust checks might involve a transaction test.
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

       // Optional: Add event listener for version change from other tabs
      dbInstance.onversionchange = () => {
          console.log("IndexedDB version change detected. Closing connection...");
          dbInstance?.close();
          alert("Database has been updated. Please reload the page.");
          // Optionally force reload: window.location.reload();
        };

      resolve(dbInstance);
    };

    request.onblocked = (event) => {
        // If other tabs have the database open with an older version
        console.warn("IndexedDB open request blocked. Please close other tabs using this app.");
        alert("Please close other tabs running this application to update the database.");
        // We don't reject here, as the user needs to take action.
    };

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      console.log("IndexedDB upgrade needed.");
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;
      const transaction = (event.target as IDBOpenDBRequest).transaction; // Use the upgrade transaction

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
           store = transaction.objectStore(storeName); // Get existing store for index creation
        }

        if (indexName && indexKeyPath && !store.indexNames.contains(indexName)) {
          store.createIndex(indexName, indexKeyPath, { unique: false });
          console.log(`Created index '${indexName}' on store '${storeName}'`);
        }
      };

       // --- Schema Definition ---
       // Always check if stores/indexes exist before creating

      // Spaces Store (only needs keyPath 'id')
      createStoreAndIndex(STORES.SPACES, 'id');

      // Stores requiring spaceId index
      createStoreAndIndex(STORES.ACTIONS, 'id', 'spaceIdIndex', 'spaceId');
      createStoreAndIndex(STORES.MULTI_STEP_ACTIONS, 'id', 'spaceIdIndex', 'spaceId');
      createStoreAndIndex(STORES.LOG_ENTRIES, 'id', 'spaceIdIndex', 'spaceId');
      createStoreAndIndex(STORES.WASTE_ENTRIES, 'id', 'spaceIdIndex', 'spaceId');
      createStoreAndIndex(STORES.COMMENTS, 'id', 'spaceIdIndex', 'spaceId');


      // --- Potential Migrations Based on Old Version ---
      // Example: If migrating from version < 2 where 'comments' didn't exist
      // if (oldVersion < 2) {
      //   createStoreAndIndex(STORES.COMMENTS, 'id', 'spaceIdIndex', 'spaceId');
      // }
      // Example: If adding a new index in version 3
      // if (oldVersion < 3 && db.objectStoreNames.contains(STORES.LOG_ENTRIES)) {
      //    const logStore = transaction.objectStore(STORES.LOG_ENTRIES);
      //    if (!logStore.indexNames.contains('timestampIndex')) {
      //        logStore.createIndex('timestampIndex', 'timestamp');
      //        console.log(`Created index 'timestampIndex' on store '${STORES.LOG_ENTRIES}'`);
      //    }
      // }

      console.log("IndexedDB upgrade complete.");
    };
  });
};

// Optional: Function to close the database if needed (e.g., for testing)
export const closeDB = () => {
    if (dbInstance) {
        console.log("Closing IndexedDB connection.");
        dbInstance.close();
        dbInstance = null;
    }
};
