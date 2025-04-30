/**
 * @fileOverview Service layer for managing Log Entries. Encapsulates business logic
 * related to logging events, interacting with the repository for data persistence.
 */

import type { ILogEntryRepository } from '@/core/ports/LogEntryRepository';
import type { LogEntry } from '@/core/domain/LogEntry';

export class LogEntryService {
  constructor(private logEntryRepository: ILogEntryRepository) {}

  /**
   * Adds a new log entry.
   * Handles setting the timestamp.
   * @param logEntryData - Data for the new log entry (spaceId, actionName, points, type, etc.).
   * @returns A promise resolving to the created LogEntry.
   */
  async addLogEntry(logEntryData: Omit<LogEntry, 'id' | 'timestamp'>): Promise<LogEntry> {
    const entryToAdd: Omit<LogEntry, 'id'> = {
      ...logEntryData,
      timestamp: new Date(),
      // Ensure dates are Date objects if passed differently
       clockInTime: logEntryData.clockInTime ? new Date(logEntryData.clockInTime) : undefined,
       clockOutTime: logEntryData.clockOutTime ? new Date(logEntryData.clockOutTime) : undefined,
    };

    // Add validation or specific logic based on log type if needed
    if (entryToAdd.type === 'clockOut' && !entryToAdd.clockInTime) {
        console.warn("Clock out entry added without clock in time.");
        // Optionally calculate minutesClockedIn if clockInTime exists
        if (entryToAdd.clockInTime) {
            const timeDifference = entryToAdd.timestamp.getTime() - entryToAdd.clockInTime.getTime();
            entryToAdd.minutesClockedIn = Math.floor(timeDifference / (1000 * 60));
        }
    }

    return this.logEntryRepository.add(entryToAdd);
  }

  /**
   * Retrieves all log entries for a specific space, sorted by timestamp descending.
   * @param spaceId - The ID of the space.
   * @returns A promise resolving to an array of LogEntries.
   */
  async getLogEntriesForSpace(spaceId: string): Promise<LogEntry[]> {
    // Repository already handles sorting
    const entries = await this.logEntryRepository.getBySpaceId(spaceId);
    // Ensure dates are Date objects after retrieval
    return entries.map(e => ({
        ...e,
        timestamp: new Date(e.timestamp),
        clockInTime: e.clockInTime ? new Date(e.clockInTime) : undefined,
        clockOutTime: e.clockOutTime ? new Date(e.clockOutTime) : undefined,
    }));
  }

  /**
   * Deletes a log entry.
   * @param id - The ID of the log entry to delete.
   * @returns A promise resolving when the deletion is complete.
   */
  async deleteLogEntry(id: string): Promise<void> {
    return this.logEntryRepository.delete(id);
  }

  /**
   * Deletes all log entries associated with a specific space.
   * This is typically used when deleting a space.
   * @param spaceId - The ID of the space.
   * @returns A promise resolving when the deletion is complete.
   */
  async deleteLogEntriesForSpace(spaceId: string): Promise<void> {
    return this.logEntryRepository.deleteBySpaceId(spaceId);
  }
}
