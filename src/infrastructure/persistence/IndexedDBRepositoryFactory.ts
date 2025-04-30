/**
 * @fileOverview Factory implementation that creates instances of IndexedDB repositories.
 */

import type { IRepositoryFactory } from '@/core/ports/RepositoryFactory';
import { IndexedDBSpaceRepository } from './IndexedDBSpaceRepository';
import { IndexedDBActionRepository } from './IndexedDBActionRepository';
import { IndexedDBMultiStepActionRepository } from './IndexedDBMultiStepActionRepository';
import { IndexedDBLogEntryRepository } from './IndexedDBLogEntryRepository';
import { IndexedDBWasteEntryRepository } from './IndexedDBWasteEntryRepository';
import { IndexedDBCommentRepository } from './IndexedDBCommentRepository';

export class IndexedDBRepositoryFactory implements IRepositoryFactory {
  createSpaceRepository() {
    return new IndexedDBSpaceRepository();
  }

  createActionRepository() {
    return new IndexedDBActionRepository();
  }

  createMultiStepActionRepository() {
    return new IndexedDBMultiStepActionRepository();
  }

  createLogEntryRepository() {
    return new IndexedDBLogEntryRepository();
  }

  createWasteEntryRepository() {
    return new IndexedDBWasteEntryRepository();
  }

  createCommentRepository() {
    return new IndexedDBCommentRepository();
  }
}

// Optional: Create a singleton instance for easy access throughout the app
export const repositoryFactory = new IndexedDBRepositoryFactory();
