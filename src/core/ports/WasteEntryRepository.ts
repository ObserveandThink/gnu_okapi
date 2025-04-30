/**
 * @fileOverview Defines the port (interface) for interacting with WasteEntry data storage.
 */

import type { WasteEntry } from '@/core/domain/WasteEntry';

export interface IWasteEntryRepository {
  /**
   * Retrieves a waste entry by its unique ID.
   * @param id - The ID of the waste entry.
   * @returns A promise resolving to the WasteEntry or undefined if not found.
   */
  getById(id: string): Promise<WasteEntry | undefined>;

  /**
   * Retrieves all waste entries associated with a specific space, sorted by timestamp descending.
   * @param spaceId - The ID of the space.
   * @returns A promise resolving to an array of WasteEntries.
   */
  getBySpaceId(spaceId: string): Promise<WasteEntry[]>;

  /**
   * Adds a new waste entry to the storage.
   * @param wasteEntry - The waste entry data to add (ID will be assigned).
   * @returns A promise resolving to the newly added WasteEntry with its ID.
   */
  add(wasteEntry: Omit<WasteEntry, 'id'>): Promise<WasteEntry>;

  /**
   * Updates an existing waste entry in the storage.
   * @param wasteEntry - The waste entry data to update.
   * @returns A promise resolving when the update is complete.
   */
  update(wasteEntry: WasteEntry): Promise<void>;

  /**
   * Deletes a waste entry from the storage by its ID.
   * @param id - The ID of the waste entry to delete.
   * @returns A promise resolving when the deletion is complete.
   */
  delete(id: string): Promise<void>;

  /**
   * Deletes all waste entries associated with a specific space.
   * @param spaceId - The ID of the space.
   * @returns A promise resolving when the deletion is complete.
   */
  deleteBySpaceId(spaceId: string): Promise<void>;
}
