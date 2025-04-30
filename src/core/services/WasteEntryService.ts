/**
 * @fileOverview Service layer for managing Waste Entries. Encapsulates business logic
 * related to waste tracking, interacting with the repository for data persistence.
 */

import type { IWasteEntryRepository } from '@/core/ports/WasteEntryRepository';
import type { WasteEntry } from '@/core/domain/WasteEntry';

// Define TIMWOODS categories centrally if needed, or retrieve from config/db
const TIMWOODS_CATEGORIES = [
    {id: 'transportation', name: 'Transportation', description: 'Unnecessary movement of materials or products.', points: 1},
    {id: 'inventory', name: 'Inventory', description: 'Excess raw materials, work in progress, or finished goods.', points: 2},
    {id: 'motion', name: 'Motion', description: 'Unnecessary movement of people.', points: 3},
    {id: 'waiting', name: 'Waiting', description: 'Idle time waiting for the next step in a process.', points: 4},
    {id: 'overprocessing', name: 'Overprocessing', description: 'Performing more work than is necessary.', points: 5},
    {id: 'overproduction', name: 'Overproduction', description: 'Producing more than is needed.', points: 6},
    {id: 'defects', name: 'Defects', description: 'Rework or scrap due to errors or defects.', points: 7},
    {id: 'skills', name: 'Skills', description: 'Underutilizing people\'s talents and skills', points: 8},
];


export class WasteEntryService {
  constructor(private wasteEntryRepository: IWasteEntryRepository) {}

   /**
   * Adds new waste entries for selected TIMWOODS categories.
   * @param spaceId - The ID of the space.
   * @param categoryIds - An array of TIMWOODS category IDs (e.g., ['transportation', 'waiting']).
   * @returns A promise resolving to an array of the created WasteEntries.
   */
   async addWasteEntries(spaceId: string, categoryIds: string[]): Promise<WasteEntry[]> {
    if (!categoryIds || categoryIds.length === 0) {
        return []; // Nothing to add
    }

    const now = new Date();
    const entriesToAdd: Omit<WasteEntry, 'id'>[] = [];

    for (const categoryId of categoryIds) {
        const category = TIMWOODS_CATEGORIES.find(cat => cat.id === categoryId);
        if (category) {
            entriesToAdd.push({
                spaceId: spaceId,
                timestamp: now,
                type: category.name,
                points: category.points,
            });
        } else {
            console.warn(`Unknown waste category ID: ${categoryId}`);
        }
    }

    if (entriesToAdd.length === 0) {
        return [];
    }

    // Add entries one by one or modify repository to handle bulk add
    const addedEntries: WasteEntry[] = [];
    for (const entryData of entriesToAdd) {
        const addedEntry = await this.wasteEntryRepository.add(entryData);
        addedEntries.push(addedEntry);
    }

    return addedEntries;
   }


  /**
   * Retrieves all waste entries for a specific space, sorted by timestamp descending.
   * @param spaceId - The ID of the space.
   * @returns A promise resolving to an array of WasteEntries.
   */
  async getWasteEntriesForSpace(spaceId: string): Promise<WasteEntry[]> {
    // Repository already handles sorting
    const entries = await this.wasteEntryRepository.getBySpaceId(spaceId);
     // Ensure dates are Date objects after retrieval
    return entries.map(e => ({
        ...e,
        timestamp: new Date(e.timestamp),
    }));
  }

   /**
   * Calculates the total waste points for a given space.
   * @param spaceId - The ID of the space.
   * @returns A promise resolving to the total waste points.
   */
   async getTotalWastePointsForSpace(spaceId: string): Promise<number> {
    const entries = await this.getWasteEntriesForSpace(spaceId);
    return entries.reduce((total, entry) => total + entry.points, 0);
   }

  /**
   * Deletes a waste entry.
   * @param id - The ID of the waste entry to delete.
   * @returns A promise resolving when the deletion is complete.
   */
  async deleteWasteEntry(id: string): Promise<void> {
    return this.wasteEntryRepository.delete(id);
  }

  /**
   * Deletes all waste entries associated with a specific space.
   * This is typically used when deleting a space.
   * @param spaceId - The ID of the space.
   * @returns A promise resolving when the deletion is complete.
   */
  async deleteWasteEntriesForSpace(spaceId: string): Promise<void> {
    return this.wasteEntryRepository.deleteBySpaceId(spaceId);
  }
}
