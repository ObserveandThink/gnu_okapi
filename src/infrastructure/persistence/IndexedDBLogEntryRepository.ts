/**
 * @fileOverview IndexedDB implementation of the LogEntry repository port.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogEntryRepository } from '@/core/ports/LogEntryRepository';
import type { LogEntry } from '@/core/domain/LogEntry';
import { openDB, STORES } from './IndexedDB';
import { addItem, getById, getByIndex, updateItem, deleteItem, deleteByIndex } from './IndexedDBUtils';

export class IndexedDBLogEntryRepository implements ILogEntryRepository {
  async getById(id: string): Promise<LogEntry | undefined> {
    const db = await openDB();
    const entry = await getById<LogEntry>(db, STORES.LOG_ENTRIES, id);
    // Ensure dates are Date objects
     if (entry) {
         entry.timestamp = new Date(entry.timestamp);
         entry.clockInTime = entry.clockInTime ? new Date(entry.clockInTime) : undefined;
         entry.clockOutTime = entry.clockOutTime ? new Date(entry.clockOutTime) : undefined;
     }
    return entry;
  }

  async getBySpaceId(spaceId: string): Promise<LogEntry[]> {
    const db = await openDB();
    const entries = await getByIndex<LogEntry>(db, STORES.LOG_ENTRIES, 'spaceIdIndex', spaceId);
    // Ensure dates are Date objects and sort
    return entries
        .map(e => ({
            ...e,
            timestamp: new Date(e.timestamp),
            clockInTime: e.clockInTime ? new Date(e.clockInTime) : undefined,
            clockOutTime: e.clockOutTime ? new Date(e.clockOutTime) : undefined,
        }))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async add(logEntryData: Omit<LogEntry, 'id'>): Promise<LogEntry> {
    const db = await openDB();
    const newLogEntry: LogEntry = {
        ...logEntryData,
        id: uuidv4(),
        timestamp: logEntryData.timestamp || new Date(), // Ensure timestamp exists
        // Ensure dates are Date objects before storing
        clockInTime: logEntryData.clockInTime ? new Date(logEntryData.clockInTime) : undefined,
        clockOutTime: logEntryData.clockOutTime ? new Date(logEntryData.clockOutTime) : undefined,
     };
    await addItem<LogEntry>(db, STORES.LOG_ENTRIES, newLogEntry);
    return newLogEntry;
  }

  async update(logEntry: LogEntry): Promise<void> {
    const db = await openDB();
     // Ensure dates are Date objects before storing
     const entryToUpdate = {
         ...logEntry,
         clockInTime: logEntry.clockInTime ? new Date(logEntry.clockInTime) : undefined,
         clockOutTime: logEntry.clockOutTime ? new Date(logEntry.clockOutTime) : undefined,
     };
    await updateItem<LogEntry>(db, STORES.LOG_ENTRIES, entryToUpdate);
  }

  async delete(id: string): Promise<void> {
    const db = await openDB();
    await deleteItem(db, STORES.LOG_ENTRIES, id);
  }

  async deleteBySpaceId(spaceId: string): Promise<void> {
    const db = await openDB();
    await deleteByIndex(db, STORES.LOG_ENTRIES, 'spaceIdIndex', spaceId);
  }
}
