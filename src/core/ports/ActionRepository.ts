/**
 * @fileOverview Defines the port (interface) for interacting with Action data storage.
 */

import type { Action } from '@/core/domain/Action';

export interface IActionRepository {
  /**
   * Retrieves an action by its unique ID.
   * @param id - The ID of the action.
   * @returns A promise resolving to the Action or undefined if not found.
   */
  getById(id: string): Promise<Action | undefined>;

  /**
   * Retrieves all actions associated with a specific space.
   * @param spaceId - The ID of the space.
   * @returns A promise resolving to an array of Actions.
   */
  getBySpaceId(spaceId: string): Promise<Action[]>;

  /**
   * Adds a new action to the storage.
   * @param action - The action data to add (ID will be assigned).
   * @returns A promise resolving to the newly added Action with its ID.
   */
  add(action: Omit<Action, 'id'>): Promise<Action>;

  /**
   * Updates an existing action in the storage.
   * @param action - The action data to update.
   * @returns A promise resolving when the update is complete.
   */
  update(action: Action): Promise<void>;

  /**
   * Deletes an action from the storage by its ID.
   * @param id - The ID of the action to delete.
   * @returns A promise resolving when the deletion is complete.
   */
  delete(id: string): Promise<void>;

  /**
   * Deletes all actions associated with a specific space.
   * @param spaceId - The ID of the space.
   * @returns A promise resolving when the deletion is complete.
   */
  deleteBySpaceId(spaceId: string): Promise<void>;
}
