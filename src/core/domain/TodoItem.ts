/**
 * @fileOverview Defines the domain model for a To-Do Item within a Space.
 */

export interface TodoItem {
  id: string;
  spaceId: string; // Foreign key linking to Space
  description: string;
  completed: boolean; // Kept for potential future use, but UI focuses on images
  beforeImage: string | null; // Make explicitly nullable
  afterImage?: string | null; // Optional Data URI or URL
  dateCreated: Date;
}
