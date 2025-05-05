/**
 * @fileOverview Defines the port (interface) for interacting with To-Do Item data storage.
 */

import type { TodoItem } from '@/core/domain/TodoItem';

export interface ITodoRepository {
  /**
   * Retrieves a To-Do item by its unique ID.
   * @param id - The ID of the item.
   * @returns A promise resolving to the TodoItem or undefined if not found.
   */
  getById(id: string): Promise<TodoItem | undefined>;

  /**
   * Retrieves all To-Do items associated with a specific space, sorted by creation date ascending.
   * @param spaceId - The ID of the space.
   * @returns A promise resolving to an array of TodoItems.
   */
  getBySpaceId(spaceId: string): Promise<TodoItem[]>;

  /**
   * Adds a new To-Do item to the storage.
   * @param item - The item data to add (ID will be assigned).
   * @returns A promise resolving to the newly added TodoItem with its ID.
   */
  add(item: Omit<TodoItem, 'id'>): Promise<TodoItem>;

  /**
   * Updates an existing To-Do item in the storage.
   * @param item - The item data to update.
   * @returns A promise resolving when the update is complete.
   */
  update(item: TodoItem): Promise<void>;

  /**
   * Deletes a To-Do item from the storage by its ID.
   * @param id - The ID of the item to delete.
   * @returns A promise resolving when the deletion is complete.
   */
  delete(id: string): Promise<void>;

  /**
   * Deletes all To-Do items associated with a specific space.
   * @param spaceId - The ID of the space.
   * @returns A promise resolving when the deletion is complete.
   */
  deleteBySpaceId(spaceId: string): Promise<void>;
}
