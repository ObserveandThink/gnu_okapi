/**
 * @fileOverview Service layer for managing Spaces. Encapsulates business logic
 * related to spaces, interacting with the repository for data persistence.
 */
import { v4 as uuidv4 } from 'uuid';
import type { ISpaceRepository } from '@/core/ports/SpaceRepository';
import type { Space } from '@/core/domain/Space';

// Import other service types to handle cascading deletes
import type { ActionService } from './ActionService';
import type { MultiStepActionService } from './MultiStepActionService';
import type { LogEntryService } from './LogEntryService';
import type { WasteEntryService } from './WasteEntryService';
import type { CommentService } from './CommentService';


export class SpaceService {
  // Allow injecting other services for dependency management (like cascading deletes)
  constructor(
    private spaceRepository: ISpaceRepository,
    private actionService?: ActionService,
    private multiStepActionService?: MultiStepActionService,
    private logEntryService?: LogEntryService,
    private wasteEntryService?: WasteEntryService,
    private commentService?: CommentService,
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
    };

    return this.spaceRepository.add(newSpace);
  }

  /**
   * Retrieves a specific space by its ID.
   * @param id - The ID of the space.
   * @returns A promise resolving to the Space or undefined if not found.
   */
  async getSpace(id: string): Promise<Space | undefined> {
     const space = await this.spaceRepository.getById(id);
     // Ensure dates are Date objects after retrieval
     if (space) {
         return {
             ...space,
             dateCreated: new Date(space.dateCreated),
             dateModified: new Date(space.dateModified),
         };
     }
     return undefined;
  }

  /**
   * Retrieves all spaces.
   * @returns A promise resolving to an array of all Spaces.
   */
  async getAllSpaces(): Promise<Space[]> {
    const spaces = await this.spaceRepository.getAll();
    // Ensure dates are Date objects after retrieval
    return spaces.map(s => ({
        ...s,
        dateCreated: new Date(s.dateCreated),
        dateModified: new Date(s.dateModified),
    }));
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
   * Deletes a space and all associated data (actions, logs, etc.).
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

    await Promise.all(deletionPromises);

    // 2. Delete the space itself
    return this.spaceRepository.delete(id);
  }
}
