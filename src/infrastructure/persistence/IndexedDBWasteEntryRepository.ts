/**
 * @fileOverview IndexedDB implementation of the WasteEntry repository port.
 */

import { v4 as uuidv4 } from 'uuid';
import type { IWasteEntryRepository } from '@/core/ports/WasteEntryRepository';
import type { WasteEntry } from '@/core/domain/WasteEntry';
import { openDB, STORES } from './IndexedDB';
import { addItem, getById, getByIndex, updateItem, deleteItem, deleteByIndex } from './IndexedDBUtils';

export class IndexedDBWasteEntryRepository implements IWasteEntryRepository {
  async getById(id: string): Promise<WasteEntry | undefined> {
    const db = await openDB();
    const entry = await getById<WasteEntry>(db, STORES.WASTE_ENTRIES, id);
    // Ensure date is Date object
     if (entry) {
        entry.timestamp = new Date(entry.timestamp);
     }
    return entry;
  }

  async getBySpaceId(spaceId: string): Promise<WasteEntry[]> {
    const db = await openDB();
    const entries = await getByIndex<WasteEntry>(db, STORES.WASTE_ENTRIES, 'spaceIdIndex', spaceId);
    // Ensure dates are Date objects and sort
    return entries
        .map(e => ({ ...e, timestamp: new Date(e.timestamp) }))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async add(wasteEntryData: Omit<WasteEntry, 'id'>): Promise<WasteEntry> {
    const db = await openDB();
    const newWasteEntry: WasteEntry = {
        ...wasteEntryData,
        id: uuidv4(),
        timestamp: wasteEntryData.timestamp || new Date(), // Ensure timestamp exists
     };
    await addItem<WasteEntry>(db, STORES.WASTE_ENTRIES, newWasteEntry);
    return newWasteEntry;
  }

  async update(wasteEntry: WasteEntry): Promise<void> {
    const db = await openDB();
    await updateItem<WasteEntry>(db, STORES.WASTE_ENTRIES, wasteEntry);
  }

  async delete(id: string): Promise<void> {
    const db = await openDB();
    await deleteItem(db, STORES.WASTE_ENTRIES, id);
  }

  async deleteBySpaceId(spaceId: string): Promise<void> {
    const db = await openDB();
    await deleteByIndex(db, STORES.WASTE_ENTRIES, 'spaceIdIndex', spaceId);
  }
}
