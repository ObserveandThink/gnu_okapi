/**
 * @fileOverview Defines the port (interface) for interacting with Space data storage.
 */

import type { Space } from '@/core/domain/Space';

export interface ISpaceRepository {
  /**
   * Retrieves a space by its unique ID.
   * @param id - The ID of the space.
   * @returns A promise resolving to the Space or undefined if not found.
   */
  getById(id: string): Promise<Space | undefined>;

  /**
   * Retrieves all spaces from the storage.
   * @returns A promise resolving to an array of all Spaces.
   */
  getAll(): Promise<Space[]>;

  /**
   * Adds a new space to the storage.
   * @param space - The space data to add (ID will be assigned).
   * @returns A promise resolving to the newly added Space with its ID.
   */
  add(space: Omit<Space, 'id'>): Promise<Space>;

  /**
   * Updates an existing space in the storage.
   * Also updates the dateModified timestamp.
   * @param space - The space data to update.
   * @returns A promise resolving when the update is complete.
   */
  update(space: Space): Promise<void>;

  /**
   * Deletes a space from the storage by its ID.
   * @param id - The ID of the space to delete.
   * @returns A promise resolving when the deletion is complete.
   */
  delete(id: string): Promise<void>;
}
