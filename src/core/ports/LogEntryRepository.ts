/**
 * @fileOverview Defines the port (interface) for interacting with LogEntry data storage.
 */

import type { LogEntry } from '@/core/domain/LogEntry';

export interface ILogEntryRepository {
  /**
   * Retrieves a log entry by its unique ID.
   * @param id - The ID of the log entry.
   * @returns A promise resolving to the LogEntry or undefined if not found.
   */
  getById(id: string): Promise<LogEntry | undefined>;

  /**
   * Retrieves all log entries associated with a specific space, sorted by timestamp descending.
   * @param spaceId - The ID of the space.
   * @returns A promise resolving to an array of LogEntries.
   */
  getBySpaceId(spaceId: string): Promise<LogEntry[]>;

  /**
   * Adds a new log entry to the storage.
   * @param logEntry - The log entry data to add (ID will be assigned).
   * @returns A promise resolving to the newly added LogEntry with its ID.
   */
  add(logEntry: Omit<LogEntry, 'id'>): Promise<LogEntry>;

  /**
   * Updates an existing log entry in the storage.
   * @param logEntry - The log entry data to update.
   * @returns A promise resolving when the update is complete.
   */
  update(logEntry: LogEntry): Promise<void>;

  /**
   * Deletes a log entry from the storage by its ID.
   * @param id - The ID of the log entry to delete.
   * @returns A promise resolving when the deletion is complete.
   */
  delete(id: string): Promise<void>;

  /**
   * Deletes all log entries associated with a specific space.
   * @param spaceId - The ID of the space.
   * @returns A promise resolving when the deletion is complete.
   */
  deleteBySpaceId(spaceId: string): Promise<void>;
}
