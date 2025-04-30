/**
 * @fileOverview IndexedDB implementation of the Action repository port.
 */

import { v4 as uuidv4 } from 'uuid';
import type { IActionRepository } from '@/core/ports/ActionRepository';
import type { Action } from '@/core/domain/Action';
import { openDB, STORES } from './IndexedDB';
import { addItem, getById, getByIndex, updateItem, deleteItem, deleteByIndex } from './IndexedDBUtils';


export class IndexedDBActionRepository implements IActionRepository {
  async getById(id: string): Promise<Action | undefined> {
    const db = await openDB();
    return getById<Action>(db, STORES.ACTIONS, id);
  }

  async getBySpaceId(spaceId: string): Promise<Action[]> {
    const db = await openDB();
    return getByIndex<Action>(db, STORES.ACTIONS, 'spaceIdIndex', spaceId);
  }

  async add(actionData: Omit<Action, 'id'>): Promise<Action> {
    const db = await openDB();
    const newAction: Action = { ...actionData, id: uuidv4() };
    await addItem<Action>(db, STORES.ACTIONS, newAction);
    return newAction;
  }

  async update(action: Action): Promise<void> {
    const db = await openDB();
    await updateItem<Action>(db, STORES.ACTIONS, action);
  }

  async delete(id: string): Promise<void> {
    const db = await openDB();
    await deleteItem(db, STORES.ACTIONS, id);
  }

  async deleteBySpaceId(spaceId: string): Promise<void> {
    const db = await openDB();
    await deleteByIndex(db, STORES.ACTIONS, 'spaceIdIndex', spaceId);
  }
}
