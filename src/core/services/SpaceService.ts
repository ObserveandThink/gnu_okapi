/**
 * @fileOverview Service layer for managing Spaces. Encapsulates business logic
 * related to spaces, interacting with the repository for data persistence.
 */
import { v4 as uuidv4 } from 'uuid';
import type { ISpaceRepository } from '@/core/ports/SpaceRepository';
import type { Space } from '@/core/domain/Space';
import type { Action } from '@/core/domain/Action';
import type { MultiStepAction, ActionStep } from '@/core/domain/MultiStepAction';

// Import other service types to handle cascading deletes and duplication
import type { ActionService } from './ActionService';
import type { MultiStepActionService } from './MultiStepActionService';
import type { LogEntryService } from './LogEntryService';
import type { WasteEntryService } from './WasteEntryService';
import type { CommentService } from './CommentService';
import type { TodoService } from './TodoService'; // Import TodoService type

export class SpaceService {
  // Allow injecting other services for dependency management (like cascading deletes)
  constructor(
    private spaceRepository: ISpaceRepository,
    private actionService: ActionService, // Assume it's always provided for duplication
    private multiStepActionService: MultiStepActionService, // Assume it's always provided for duplication
    private logEntryService?: LogEntryService, // Optional for delete
    private wasteEntryService?: WasteEntryService, // Optional for delete
    private commentService?: CommentService, // Optional for delete
    private todoService?: TodoService, // Optional for delete
    ) {}

  /**
   * Creates a new space.
   * Sets initial creation/modification dates and total clocked time.
   * @param spaceData - Data for the new space (name, description, goal, images).
   * @returns A promise resolving to the created Space.
   */
  async createSpace(spaceData: Omit<Space, 'id' | 'dateCreated' | 'dateModified' | 'totalClockedInTime'>): Promise<Space> {
    if (!spaceData.name) {
      throw new Error("Space name cannot be empty.");
    }

    const now = new Date();
    const newSpace: Omit<Space, 'id'> = {
      ...spaceData,
      dateCreated: now,
      dateModified: now,
      totalClockedInTime: 0,
      isClockedIn: false, // Default clock state
      clockInStartTime: null, // Default clock state
    };

    return this.spaceRepository.add(newSpace);
  }

  /**
   * Retrieves a specific space by its ID.
   * @param id - The ID of the space.
   * @returns A promise resolving to the Space or undefined if not found.
   */
  async getSpace(id: string): Promise<Space | undefined> {
     return this.spaceRepository.getById(id); // Repository now handles date conversion
  }

  /**
   * Retrieves all spaces.
   * @returns A promise resolving to an array of all Spaces.
   */
  async getAllSpaces(): Promise<Space[]> {
    return this.spaceRepository.getAll(); // Repository now handles date conversion
  }

  /**
   * Updates an existing space.
   * Automatically updates the dateModified timestamp.
   * @param space - The space with updated data.
   * @returns A promise resolving when the update is complete.
   */
  async updateSpace(space: Space): Promise<void> {
    if (!space.name) {
        throw new Error("Space name cannot be empty.");
      }
    // The repository handles updating the dateModified timestamp.
    return this.spaceRepository.update(space);
  }

   /**
   * Updates the total clocked-in time for a space.
   * @param spaceId - The ID of the space to update.
   * @param additionalMinutes - The number of minutes to add to the total.
   * @returns A promise resolving when the update is complete.
   */
   async addClockedTime(spaceId: string, additionalMinutes: number): Promise<void> {
    if (additionalMinutes < 0) {
        console.warn("Attempted to add negative clocked time.");
        return;
    }
    const space = await this.getSpace(spaceId);
    if (!space) {
        throw new Error(`Space with ID ${spaceId} not found.`);
    }
    const updatedSpace: Space = {
        ...space,
        totalClockedInTime: space.totalClockedInTime + additionalMinutes,
        // No need to update dateModified here unless specifically required
    };
    await this.spaceRepository.update(updatedSpace);
   }

    /**
     * Sets the clock-in state for a space.
     * @param spaceId - The ID of the space.
     * @param startTime - The time the user clocked in.
     * @returns A promise resolving when the state is updated.
     */
    async setClockInState(spaceId: string, startTime: Date): Promise<void> {
        const space = await this.getSpace(spaceId);
        if (!space) {
            throw new Error(`Space with ID ${spaceId} not found.`);
        }
        const updatedSpace: Space = {
            ...space,
            isClockedIn: true,
            clockInStartTime: startTime,
        };
        await this.spaceRepository.update(updatedSpace);
    }

    /**
     * Clears the clock-in state for a space.
     * @param spaceId - The ID of the space.
     * @returns A promise resolving when the state is updated.
     */
    async clearClockInState(spaceId: string): Promise<void> {
        const space = await this.getSpace(spaceId);
        if (!space) {
            throw new Error(`Space with ID ${spaceId} not found.`);
        }
        const updatedSpace: Space = {
            ...space,
            isClockedIn: false,
            clockInStartTime: null,
        };
        await this.spaceRepository.update(updatedSpace);
    }


  /**
   * Deletes a space and all associated data (actions, logs, todos, etc.).
   * Requires other services to be injected for cascading deletes.
   * @param id - The ID of the space to delete.
   * @returns A promise resolving when the deletion is complete.
   */
  async deleteSpace(id: string): Promise<void> {
    // 1. Delete associated data using injected services (if they exist)
     const deletionPromises: Promise<void>[] = [];
     if (this.actionService) {
         deletionPromises.push(this.actionService.deleteActionsForSpace(id));
     }
     if (this.multiStepActionService) {
         deletionPromises.push(this.multiStepActionService.deleteMultiStepActionsForSpace(id));
     }
     if (this.logEntryService) {
         deletionPromises.push(this.logEntryService.deleteLogEntriesForSpace(id));
     }
     if (this.wasteEntryService) {
         deletionPromises.push(this.wasteEntryService.deleteWasteEntriesForSpace(id));
     }
     if (this.commentService) {
         deletionPromises.push(this.commentService.deleteCommentsForSpace(id));
     }
     if (this.todoService) { // Add deletion for todos
        deletionPromises.push(this.todoService.deleteTodoItemsForSpace(id));
     }

    await Promise.all(deletionPromises);

    // 2. Delete the space itself
    return this.spaceRepository.delete(id);
  }

  /**
   * Duplicates an existing space, including its simple and multi-step actions.
   * Does NOT duplicate logs, waste entries, comments, todos, or clocked time.
   * Adds "(Copy)" to the name and resets dates and clock state.
   * @param originalSpaceId - The ID of the space to duplicate.
   * @returns A promise resolving to the newly created duplicated Space, or undefined if the original doesn't exist.
   */
  async duplicateSpace(originalSpaceId: string): Promise<Space | undefined> {
    const originalSpace = await this.getSpace(originalSpaceId);
    if (!originalSpace) {
      console.error(`Cannot duplicate: Space with ID ${originalSpaceId} not found.`);
      return undefined;
    }

    // 1. Create the new space data
    const now = new Date();
    const newSpaceData: Omit<Space, 'id'> = {
      name: `${originalSpace.name} (Copy)`,
      description: originalSpace.description,
      goal: originalSpace.goal,
      beforeImage: originalSpace.beforeImage,
      afterImage: originalSpace.afterImage,
      dateCreated: now,
      dateModified: now,
      totalClockedInTime: 0, // Reset clocked time
      isClockedIn: false, // Reset clock state
      clockInStartTime: null, // Reset clock state
    };
    // ID is assigned by repository

    const newSpace = await this.spaceRepository.add(newSpaceData);
    const newSpaceId = newSpace.id;

    // 2. Duplicate Simple Actions
    const originalActions = await this.actionService.getActionsForSpace(originalSpaceId);
    const actionDuplicationPromises = originalActions.map(action => {
      const newActionData: Omit<Action, 'id'> = {
        spaceId: newSpaceId, // Link to the new space
        name: action.name,
        description: action.description,
        points: action.points,
      };
      return this.actionService.createAction(newActionData);
    });

    // 3. Duplicate Multi-Step Actions
    const originalMultiStepActions = await this.multiStepActionService.getMultiStepActionsForSpace(originalSpaceId);
    const multiStepActionDuplicationPromises = originalMultiStepActions.map(action => {
        // Create new step objects without original IDs and reset completion status
        const newStepsData: Omit<ActionStep, 'id' | 'completed'>[] = action.steps.map(step => ({
            name: step.name,
        }));

      const newMultiStepActionData: Omit<MultiStepAction, 'id' | 'currentStepIndex' | 'steps'> & { steps: Omit<ActionStep, 'id' | 'completed'>[] } = {
        name: action.name,
        spaceId: newSpaceId, // Link to the new space
        description: action.description,
        pointsPerStep: action.pointsPerStep,
        steps: newStepsData, // Use the newly prepared step data
      };
       // ID, currentStepIndex are handled by createMultiStepAction
      return this.multiStepActionService.createMultiStepAction(newMultiStepActionData);
    });

    // Note: To-Do items are NOT duplicated by this function.

    // Wait for all duplications to complete
    await Promise.all([
        ...actionDuplicationPromises,
        ...multiStepActionDuplicationPromises
    ]);

    console.log(`Space ${originalSpaceId} duplicated successfully into new space ${newSpaceId}`);
    return newSpace; // Return the newly created space object
  }
}
