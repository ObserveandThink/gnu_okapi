/**
 * @fileOverview IndexedDB implementation of the Space repository port.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ISpaceRepository } from '@/core/ports/SpaceRepository';
import type { Space } from '@/core/domain/Space';
import { openDB, STORES } from './IndexedDB';
import { addItem, getById, getAll, updateItem, deleteItem } from './IndexedDBUtils';

export class IndexedDBSpaceRepository implements ISpaceRepository {
  async getById(id: string): Promise<Space | undefined> {
    const db = await openDB();
    const space = await getById<Space>(db, STORES.SPACES, id);
     // Ensure dates are Date objects
    if (space) {
        space.dateCreated = new Date(space.dateCreated);
        space.dateModified = new Date(space.dateModified);
    }
    return space;
  }

  async getAll(): Promise<Space[]> {
    const db = await openDB();
    const spaces = await getAll<Space>(db, STORES.SPACES);
     // Ensure dates are Date objects
    return spaces.map(s => ({
        ...s,
        dateCreated: new Date(s.dateCreated),
        dateModified: new Date(s.dateModified),
    }));
  }

  async add(spaceData: Omit<Space, 'id'>): Promise<Space> {
    const db = await openDB();
    const newSpace: Space = {
        ...spaceData,
        id: uuidv4(),
        // Ensure dates are properly handled (should be set by service)
        dateCreated: spaceData.dateCreated || new Date(),
        dateModified: spaceData.dateModified || new Date(),
        totalClockedInTime: spaceData.totalClockedInTime ?? 0,
     };
    await addItem<Space>(db, STORES.SPACES, newSpace);
    return newSpace;
  }

  async update(space: Space): Promise<void> {
    const db = await openDB();
    // Always update the dateModified timestamp before saving
    const spaceToUpdate: Space = {
        ...space,
        dateModified: new Date(),
         // Ensure dates are Date objects before storing
        dateCreated: new Date(space.dateCreated),
    };
    await updateItem<Space>(db, STORES.SPACES, spaceToUpdate);
  }

  async delete(id: string): Promise<void> {
    const db = await openDB();
    await deleteItem(db, STORES.SPACES, id);
  }
}
