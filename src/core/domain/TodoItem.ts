/**
 * @fileOverview Defines the domain model for a To-Do Item within a Space.
 */

export interface TodoItem {
  id: string;
  spaceId: string; // Foreign key linking to Space
  description: string;
  completed: boolean;
  beforeImage?: string | null; // Optional Data URI or URL
  afterImage?: string | null; // Optional Data URI or URL
  dateCreated: Date;
}
