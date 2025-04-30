/**
 * @fileOverview Defines the port (interface) for interacting with MultiStepAction data storage.
 */

import type { MultiStepAction } from '@/core/domain/MultiStepAction';

export interface IMultiStepActionRepository {
  /**
   * Retrieves a multi-step action by its unique ID.
   * @param id - The ID of the multi-step action.
   * @returns A promise resolving to the MultiStepAction or undefined if not found.
   */
  getById(id: string): Promise<MultiStepAction | undefined>;

  /**
   * Retrieves all multi-step actions associated with a specific space.
   * @param spaceId - The ID of the space.
   * @returns A promise resolving to an array of MultiStepActions.
   */
  getBySpaceId(spaceId: string): Promise<MultiStepAction[]>;

  /**
   * Adds a new multi-step action to the storage.
   * @param action - The multi-step action data to add (ID will be assigned).
   * @returns A promise resolving to the newly added MultiStepAction with its ID.
   */
  add(action: Omit<MultiStepAction, 'id'>): Promise<MultiStepAction>;

  /**
   * Updates an existing multi-step action in the storage.
   * @param action - The multi-step action data to update.
   * @returns A promise resolving when the update is complete.
   */
  update(action: MultiStepAction): Promise<void>;

  /**
   * Deletes a multi-step action from the storage by its ID.
   * @param id - The ID of the multi-step action to delete.
   * @returns A promise resolving when the deletion is complete.
   */
  delete(id: string): Promise<void>;

  /**
   * Deletes all multi-step actions associated with a specific space.
   * @param spaceId - The ID of the space.
   * @returns A promise resolving when the deletion is complete.
   */
  deleteBySpaceId(spaceId: string): Promise<void>;
}
