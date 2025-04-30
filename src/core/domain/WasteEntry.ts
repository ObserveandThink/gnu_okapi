/**
 * @fileOverview Defines the domain model for a Waste Entry within a Space.
 */

export interface WasteEntry {
  id: string;
  spaceId: string; // Foreign key linking to Space
  timestamp: Date;
  type: string; // TIMWOODS category name (e.g., 'Transportation', 'Inventory')
  points: number; // Points associated with this type of waste
}
