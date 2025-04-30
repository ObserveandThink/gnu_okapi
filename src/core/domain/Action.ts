/**
 * @fileOverview Defines the domain model for an Action within a Space.
 */

export interface Action {
  id: string;
  name: string;
  spaceId: string; // Foreign key linking to Space
  description?: string;
  points: number; // Points awarded for completing the action once.
}
