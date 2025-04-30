/**
 * @fileOverview IndexedDB implementation of the MultiStepAction repository port.
 */

import { v4 as uuidv4 } from 'uuid';
import type { IMultiStepActionRepository } from '@/core/ports/MultiStepActionRepository';
import type { MultiStepAction } from '@/core/domain/MultiStepAction';
import { openDB, STORES } from './IndexedDB';
import { addItem, getById, getByIndex, updateItem, deleteItem, deleteByIndex } from './IndexedDBUtils';

export class IndexedDBMultiStepActionRepository implements IMultiStepActionRepository {
  async getById(id: string): Promise<MultiStepAction | undefined> {
    const db = await openDB();
    return getById<MultiStepAction>(db, STORES.MULTI_STEP_ACTIONS, id);
  }

  async getBySpaceId(spaceId: string): Promise<MultiStepAction[]> {
    const db = await openDB();
    return getByIndex<MultiStepAction>(db, STORES.MULTI_STEP_ACTIONS, 'spaceIdIndex', spaceId);
  }

  async add(actionData: Omit<MultiStepAction, 'id'>): Promise<MultiStepAction> {
    const db = await openDB();
    const newAction: MultiStepAction = {
        ...actionData,
        id: uuidv4(),
        // Ensure steps have IDs if not provided, though service layer should handle this
        steps: actionData.steps.map(s => ({ ...s, id: s.id || uuidv4() })),
        currentStepIndex: actionData.currentStepIndex ?? 0, // Default if undefined
    };
    await addItem<MultiStepAction>(db, STORES.MULTI_STEP_ACTIONS, newAction);
    return newAction;
  }

  async update(action: MultiStepAction): Promise<void> {
    const db = await openDB();
    await updateItem<MultiStepAction>(db, STORES.MULTI_STEP_ACTIONS, action);
  }

  async delete(id: string): Promise<void> {
    const db = await openDB();
    await deleteItem(db, STORES.MULTI_STEP_ACTIONS, id);
  }

  async deleteBySpaceId(spaceId: string): Promise<void> {
    const db = await openDB();
    await deleteByIndex(db, STORES.MULTI_STEP_ACTIONS, 'spaceIdIndex', spaceId);
  }
}
