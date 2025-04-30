/**
 * @fileOverview Defines the domain model for a Comment within a Space.
 */

export interface Comment {
  id: string;
  spaceId: string; // Foreign key linking to Space
  text: string;
  imageUrl?: string | null; // Optional image associated with the comment
  timestamp: Date; // When the comment was created
}
