/**
 * @fileOverview Utility functions for common IndexedDB operations.
 */

/**
 * Adds or updates an item in the specified object store.
 * @param db - The IDBDatabase instance.
 * @param storeName - The name of the object store.
 * @param item - The item to add or update (must have an 'id' property).
 * @returns A promise resolving with the added/updated item.
 */
export const addItem = <T extends { id: string }>(db: IDBDatabase, storeName: string, item: T): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item); // Use put for add or update

    request.onerror = () => {
      console.error(`Error adding/updating item in ${storeName}:`, request.error);
      reject(request.error);
    };
    // Use transaction.oncomplete for reliability? No, request.onsuccess is fine for put.
    request.onsuccess = () => {
       resolve(item); // Return the potentially modified item (if ID was generated etc., though we do it before)
    };
    transaction.onerror = () => { // Catch transaction errors too
        console.error(`Transaction error adding/updating item in ${storeName}:`, transaction.error);
        reject(transaction.error);
    };
  });
};

/**
 * Retrieves an item by its ID from the specified object store.
 * @param db - The IDBDatabase instance.
 * @param storeName - The name of the object store.
 * @param id - The ID of the item to retrieve.
 * @returns A promise resolving to the item or undefined if not found.
 */
export const getById = <T>(db: IDBDatabase, storeName: string, id: string): Promise<T | undefined> => {
  return new Promise<T | undefined>((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onerror = () => {
      console.error(`Error getting item ${id} from ${storeName}:`, request.error);
      reject(request.error);
    };
    request.onsuccess = () => {
        // Ensure result is returned, even if undefined
      resolve(request.result as T | undefined);
    };
     transaction.onerror = () => { // Catch transaction errors
        console.error(`Transaction error getting item ${id} from ${storeName}:`, transaction.error);
        reject(transaction.error);
    };
  });
};

/**
 * Retrieves all items from the specified object store.
 * @param db - The IDBDatabase instance.
 * @param storeName - The name of the object store.
 * @returns A promise resolving to an array of all items in the store.
 */
export const getAll = <T>(db: IDBDatabase, storeName: string): Promise<T[]> => {
  return new Promise<T[]>((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => {
      console.error(`Error getting all items from ${storeName}:`, request.error);
      reject(request.error);
    };
    request.onsuccess = () => {
      resolve(request.result as T[]);
    };
    transaction.onerror = () => { // Catch transaction errors
        console.error(`Transaction error getting all items from ${storeName}:`, transaction.error);
        reject(transaction.error);
    };
  });
};

/**
 * Retrieves items from the specified object store using an index.
 * @param db - The IDBDatabase instance.
 * @param storeName - The name of the object store.
 * @param indexName - The name of the index to use.
 * @param query - The value to query the index with.
 * @returns A promise resolving to an array of matching items.
 */
export const getByIndex = <T>(db: IDBDatabase, storeName: string, indexName: string, query: IDBValidKey | IDBKeyRange): Promise<T[]> => {
    return new Promise<T[]>((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      try {
        const index = store.index(indexName);
        const request = index.getAll(query);

        request.onerror = () => {
          console.error(`Error getting items by index ${indexName} from ${storeName} with query ${query}:`, request.error);
          reject(request.error);
        };
        request.onsuccess = () => {
          resolve(request.result as T[]);
        };
         transaction.onerror = () => { // Catch transaction errors
            console.error(`Transaction error getting items by index from ${storeName}:`, transaction.error);
            reject(transaction.error);
        };
      } catch (error) {
        console.error(`Error accessing index '${indexName}' on store ${storeName}:`, error);
        reject(error); // Reject if the index doesn't exist
      }
    });
  };


/**
 * Updates an existing item in the specified object store.
 * Note: This is functionally the same as addItem due to using 'put'.
 * Kept for semantic clarity.
 * @param db - The IDBDatabase instance.
 * @param storeName - The name of the object store.
 * @param item - The item with updated data.
 * @returns A promise resolving when the update is complete.
 */
export const updateItem = <T extends { id: string }>(db: IDBDatabase, storeName: string, item: T): Promise<void> => {
    // Since addItem uses 'put', it inherently handles updates.
    // We wrap it to return void as expected by update operations.
    return addItem(db, storeName, item).then(() => {}); // Discard the returned item
};


/**
 * Deletes an item by its ID from the specified object store.
 * @param db - The IDBDatabase instance.
 * @param storeName - The name of the object store.
 * @param id - The ID of the item to delete.
 * @returns A promise resolving when the deletion is complete.
 */
export const deleteItem = (db: IDBDatabase, storeName: string, id: string): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onerror = () => {
      console.error(`Error deleting item ${id} from ${storeName}:`, request.error);
      reject(request.error);
    };
    request.onsuccess = () => {
      resolve();
    };
     transaction.onerror = () => { // Catch transaction errors
        console.error(`Transaction error deleting item ${id} from ${storeName}:`, transaction.error);
        reject(transaction.error);
    };
    transaction.oncomplete = () => { // Can sometimes help catch issues if request.onsuccess fires too early
        resolve();
    };
  });
};


/**
 * Deletes items from the specified object store using an index.
 * @param db - The IDBDatabase instance.
 * @param storeName - The name of the object store.
 * @param indexName - The name of the index to use.
 * @param query - The value to query the index with.
 * @returns A promise resolving when all matching items are deleted.
 */
export const deleteByIndex = (db: IDBDatabase, storeName: string, indexName: string, query: IDBValidKey | IDBKeyRange): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      try {
          const index = store.index(indexName);
          const request = index.openCursor(query); // Use a cursor to iterate and delete

          request.onerror = () => {
              console.error(`Error opening cursor for deletion on index ${indexName} in ${storeName}:`, request.error);
              reject(request.error);
          };

          request.onsuccess = (event) => {
              const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
              if (cursor) {
                  const deleteRequest = cursor.delete(); // Delete the item at the cursor's position
                  deleteRequest.onerror = () => {
                     console.error(`Error deleting item via cursor in ${storeName}:`, deleteRequest.error);
                     // Don't necessarily reject immediately, let the transaction handle final state
                  };
                  // deleteRequest.onsuccess is not strictly needed here
                  cursor.continue(); // Move to the next item
              } else {
                  // No more items match the query
                  // Resolve is implicitly handled by transaction.oncomplete
              }
          };

          transaction.oncomplete = () => {
              resolve(); // Transaction completed successfully
          };
          transaction.onerror = () => {
              console.error(`Transaction error during indexed deletion in ${storeName}:`, transaction.error);
              reject(transaction.error);
          };

      } catch (error) {
        console.error(`Error accessing index '${indexName}' for deletion on store ${storeName}:`, error);
        reject(error);
      }
    });
};
