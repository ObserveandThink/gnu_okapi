/**
 * @fileOverview Defines the domain model for a Log Entry within a Space, tracking actions, clock events, etc.
 */

export type LogEntryType = 'action' | 'multiStepAction' | 'clockIn' | 'clockOut';

export interface LogEntry {
  id: string;
  spaceId: string; // Foreign key linking to Space
  timestamp: Date;
  actionName: string; // Name of the action or event ('Clock In', 'Clock Out', action name)
  points: number; // Points awarded for this entry (0 for clock events)
  type: LogEntryType;

  // Optional fields for specific types
  multiStepActionId?: string; // ID of the multi-step action if type is 'multiStepAction'
  stepIndex?: number; // Index of the completed step if type is 'multiStepAction'
  clockInTime?: Date; // Relevant for 'clockOut' type
  clockOutTime?: Date; // Relevant for 'clockOut' type
  minutesClockedIn?: number; // Relevant for 'clockOut' type
}
