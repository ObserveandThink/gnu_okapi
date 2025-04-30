/**
 * @fileOverview Defines the domain model for a Multi-Step Action within a Space.
 */

export interface ActionStep {
  id: string;
  name: string;
  completed: boolean;
}

export interface MultiStepAction {
  id: string;
  name: string;
  spaceId: string; // Foreign key linking to Space
  description?: string;
  pointsPerStep: number; // Points awarded for completing each step
  steps: ActionStep[];
  currentStepIndex: number; // Index of the next step to be completed (0-based)
}
