/**
 * @fileOverview IndexedDB implementation of the To-Do Item repository port.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ITodoRepository } from '@/core/ports/TodoRepository';
import type { TodoItem } from '@/core/domain/TodoItem';
import { openDB, STORES } from './IndexedDB';
import { addItem, getById, getByIndex, updateItem, deleteItem, deleteByIndex } from './IndexedDBUtils';

export class IndexedDBTodoRepository implements ITodoRepository {
  async getById(id: string): Promise<TodoItem | undefined> {
    const db = await openDB();
    const item = await getById<TodoItem>(db, STORES.TODOS, id);
    if (item) {
        item.dateCreated = new Date(item.dateCreated);
    }
    return item;
  }

  async getBySpaceId(spaceId: string): Promise<TodoItem[]> {
    const db = await openDB();
    const items = await getByIndex<TodoItem>(db, STORES.TODOS, 'spaceIdIndex', spaceId);
    // Ensure dates are Date objects and sort by dateCreated ascending
    return items
        .map(item => ({ ...item, dateCreated: new Date(item.dateCreated) }))
        .sort((a, b) => a.dateCreated.getTime() - b.dateCreated.getTime());
  }

  async add(itemData: Omit<TodoItem, 'id'>): Promise<TodoItem> {
    const db = await openDB();
    const newItem: TodoItem = {
        ...itemData,
        id: uuidv4(),
        dateCreated: itemData.dateCreated || new Date(), // Ensure timestamp exists
    };
    await addItem<TodoItem>(db, STORES.TODOS, newItem);
    return newItem;
  }

  async update(item: TodoItem): Promise<void> {
    const db = await openDB();
    // Ensure date is stored correctly
    const itemToUpdate = { ...item, dateCreated: new Date(item.dateCreated) };
    await updateItem<TodoItem>(db, STORES.TODOS, itemToUpdate);
  }

  async delete(id: string): Promise<void> {
    const db = await openDB();
    await deleteItem(db, STORES.TODOS, id);
  }

  async deleteBySpaceId(spaceId: string): Promise<void> {
    const db = await openDB();
    await deleteByIndex(db, STORES.TODOS, 'spaceIdIndex', spaceId);
  }
}
