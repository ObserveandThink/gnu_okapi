/**
 * @fileOverview Service layer for managing To-Do Items. Encapsulates business logic
 * related to to-dos, interacting with the repository for data persistence.
 */

import type { ITodoRepository } from '@/core/ports/TodoRepository';
import type { TodoItem } from '@/core/domain/TodoItem';

export class TodoService {
  constructor(private todoRepository: ITodoRepository) {}

  /**
   * Creates a new To-Do item for a given space.
   * @param itemData - Data for the new item (spaceId, description, etc.).
   * @returns A promise resolving to the created TodoItem.
   */
  async createTodoItem(itemData: Omit<TodoItem, 'id' | 'dateCreated' | 'completed'>): Promise<TodoItem> {
    if (!itemData.description.trim()) {
      throw new Error("To-Do description cannot be empty.");
    }

    const itemToAdd: Omit<TodoItem, 'id'> = {
      ...itemData,
      completed: false,
      dateCreated: new Date(),
      beforeImage: itemData.beforeImage || null,
      afterImage: itemData.afterImage || null,
    };

    return this.todoRepository.add(itemToAdd);
  }

  /**
   * Retrieves all To-Do items for a specific space.
   * @param spaceId - The ID of the space.
   * @returns A promise resolving to an array of TodoItems sorted by creation date.
   */
  async getTodoItemsForSpace(spaceId: string): Promise<TodoItem[]> {
    return this.todoRepository.getBySpaceId(spaceId); // Repository handles sorting
  }

  /**
   * Updates an existing To-Do item (e.g., mark as complete, add images).
   * @param item - The item with updated data.
   * @returns A promise resolving when the update is complete.
   */
  async updateTodoItem(item: TodoItem): Promise<void> {
    if (!item.description.trim()) {
        throw new Error("To-Do description cannot be empty.");
    }
    // Add validation or business rules for updating if needed.
    return this.todoRepository.update(item);
  }

  /**
   * Deletes a To-Do item.
   * @param id - The ID of the item to delete.
   * @returns A promise resolving when the deletion is complete.
   */
  async deleteTodoItem(id: string): Promise<void> {
    return this.todoRepository.delete(id);
  }

  /**
   * Deletes all To-Do items associated with a specific space.
   * This is typically used when deleting a space.
   * @param spaceId - The ID of the space.
   * @returns A promise resolving when the deletion is complete.
   */
  async deleteTodoItemsForSpace(spaceId: string): Promise<void> {
    return this.todoRepository.deleteBySpaceId(spaceId);
  }
}
