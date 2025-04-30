/**
 * @fileOverview Service layer for managing Multi-Step Actions. Encapsulates business logic
 * related to multi-step actions, interacting with the repository for data persistence.
 */

import { v4 as uuidv4 } from 'uuid';
import type { IMultiStepActionRepository } from '@/core/ports/MultiStepActionRepository';
import type { MultiStepAction, ActionStep } from '@/core/domain/MultiStepAction';

export class MultiStepActionService {
  constructor(private multiStepActionRepository: IMultiStepActionRepository) {}

  /**
   * Creates a new multi-step action for a given space.
   * Assigns IDs to steps and sets initial state.
   * @param actionData - Data for the new action (spaceId, name, pointsPerStep, steps, description).
   * @returns A promise resolving to the created MultiStepAction.
   */
  async createMultiStepAction(actionData: Omit<MultiStepAction, 'id' | 'currentStepIndex' | 'steps'> & { steps: Omit<ActionStep, 'id' | 'completed'>[] }): Promise<MultiStepAction> {
    if (!actionData.name) {
      throw new Error("Multi-step action name cannot be empty.");
    }
    if (!actionData.steps || actionData.steps.length === 0) {
        throw new Error("Multi-step action must have at least one step.");
    }
    if (actionData.pointsPerStep <= 0) {
      console.warn("Multi-step action points per step are non-positive. Setting to 1.");
      actionData.pointsPerStep = 1;
    }

    const newAction: Omit<MultiStepAction, 'id'> = {
        ...actionData,
        currentStepIndex: 0,
        steps: actionData.steps.map(step => ({
            ...step,
            id: uuidv4(), // Assign unique ID to each step
            completed: false,
        })),
    };

    return this.multiStepActionRepository.add(newAction);
  }

  /**
   * Retrieves all multi-step actions for a specific space.
   * @param spaceId - The ID of the space.
   * @returns A promise resolving to an array of MultiStepActions.
   */
  async getMultiStepActionsForSpace(spaceId: string): Promise<MultiStepAction[]> {
    return this.multiStepActionRepository.getBySpaceId(spaceId);
  }

  /**
   * Updates an existing multi-step action.
   * Typically used when a step is completed or details are edited.
   * @param action - The action with updated data.
   * @returns A promise resolving when the update is complete.
   */
  async updateMultiStepAction(action: MultiStepAction): Promise<void> {
     // Add validation or business rules for updating if needed.
     // Ensure currentStepIndex is within bounds, etc.
     if (action.currentStepIndex < 0 || action.currentStepIndex > action.steps.length) {
         throw new Error("Invalid current step index.");
     }
    return this.multiStepActionRepository.update(action);
  }

   /**
   * Marks the current step of a multi-step action as complete and advances to the next.
   * @param actionId - The ID of the multi-step action.
   * @returns A promise resolving to the updated MultiStepAction, or undefined if not found or already completed.
   */
   async completeCurrentStep(actionId: string): Promise<MultiStepAction | undefined> {
    const action = await this.multiStepActionRepository.getById(actionId);
    if (!action) {
        console.error(`Multi-step action with ID ${actionId} not found.`);
        return undefined;
    }

    if (action.currentStepIndex >= action.steps.length) {
        console.warn(`Multi-step action ${actionId} is already completed.`);
        return action; // Return the completed action
    }

    // Mark current step as complete
    action.steps[action.currentStepIndex].completed = true;
    // Advance to the next step
    action.currentStepIndex += 1;

    await this.updateMultiStepAction(action);
    return action; // Return the updated action
   }


  /**
   * Deletes a multi-step action.
   * @param id - The ID of the action to delete.
   * @returns A promise resolving when the deletion is complete.
   */
  async deleteMultiStepAction(id: string): Promise<void> {
    return this.multiStepActionRepository.delete(id);
  }

  /**
   * Deletes all multi-step actions associated with a specific space.
   * This is typically used when deleting a space.
   * @param spaceId - The ID of the space.
   * @returns A promise resolving when the deletion is complete.
   */
  async deleteMultiStepActionsForSpace(spaceId: string): Promise<void> {
    return this.multiStepActionRepository.deleteBySpaceId(spaceId);
  }
}
