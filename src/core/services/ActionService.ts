/**
 * @fileOverview Service layer for managing Actions. Encapsulates business logic
 * related to actions, interacting with the repository for data persistence.
 */

import type { IActionRepository } from '@/core/ports/ActionRepository';
import type { Action } from '@/core/domain/Action';

export class ActionService {
  constructor(private actionRepository: IActionRepository) {}

  /**
   * Creates a new action for a given space.
   * @param actionData - Data for the new action (spaceId, name, points, description).
   * @returns A promise resolving to the created Action.
   */
  async createAction(actionData: Omit<Action, 'id'>): Promise<Action> {
    if (!actionData.name) {
      throw new Error("Action name cannot be empty.");
    }
    if (actionData.points <= 0) {
        // Or handle default/minimum points logic here
      console.warn("Action points are non-positive. Setting to 1.");
      actionData.points = 1;
    }
    // Additional validation or business rules can be added here.
    return this.actionRepository.add(actionData);
  }

  /**
   * Retrieves all actions for a specific space.
   * @param spaceId - The ID of the space.
   * @returns A promise resolving to an array of Actions.
   */
  async getActionsForSpace(spaceId: string): Promise<Action[]> {
    return this.actionRepository.getBySpaceId(spaceId);
  }

  /**
   * Updates an existing action.
   * @param action - The action with updated data.
   * @returns A promise resolving when the update is complete.
   */
  async updateAction(action: Action): Promise<void> {
    // Add validation or business rules for updating if needed.
    return this.actionRepository.update(action);
  }

  /**
   * Deletes an action.
   * @param id - The ID of the action to delete.
   * @returns A promise resolving when the deletion is complete.
   */
  async deleteAction(id: string): Promise<void> {
    return this.actionRepository.delete(id);
  }

    /**
   * Deletes all actions associated with a specific space.
   * This is typically used when deleting a space.
   * @param spaceId - The ID of the space.
   * @returns A promise resolving when the deletion is complete.
   */
    async deleteActionsForSpace(spaceId: string): Promise<void> {
        return this.actionRepository.deleteBySpaceId(spaceId);
    }
}
