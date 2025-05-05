/**
 * @fileOverview Defines the port (interface) for a factory responsible for creating repository instances.
 * This allows easy swapping of persistence implementations (e.g., IndexedDB, localStorage, remote API).
 */

import type { IActionRepository } from './ActionRepository';
import type { ICommentRepository } from './CommentRepository';
import type { ILogEntryRepository } from './LogEntryRepository';
import type { IMultiStepActionRepository } from './MultiStepActionRepository';
import type { ISpaceRepository } from './SpaceRepository';
import type { IWasteEntryRepository } from './WasteEntryRepository';
import type { ITodoRepository } from './TodoRepository'; // Import Todo interface

export interface IRepositoryFactory {
  createSpaceRepository(): ISpaceRepository;
  createActionRepository(): IActionRepository;
  createMultiStepActionRepository(): IMultiStepActionRepository;
  createLogEntryRepository(): ILogEntryRepository;
  createWasteEntryRepository(): IWasteEntryRepository;
  createCommentRepository(): ICommentRepository;
  createTodoRepository(): ITodoRepository; // Add method for Todo repository
}
