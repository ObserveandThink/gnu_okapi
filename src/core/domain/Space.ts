/**
 * @fileOverview Defines the core domain model for a Space.
 */

export interface Space {
  id: string;
  name: string;
  description?: string;
  goal?: string;
  beforeImage?: string | null; // Data URI or URL
  afterImage?: string | null; // Data URI or URL
  dateCreated: Date;
  dateModified: Date;
  totalClockedInTime: number; // Cumulative time in minutes

  // Fields for persisting clock state
  isClockedIn?: boolean; // Added: Track if currently clocked into this space
  clockInStartTime?: Date | null; // Added: Track start time if clocked in
}
