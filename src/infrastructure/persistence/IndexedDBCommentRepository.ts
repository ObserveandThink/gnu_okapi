/**
 * @fileOverview IndexedDB implementation of the Comment repository port.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ICommentRepository } from '@/core/ports/CommentRepository';
import type { Comment } from '@/core/domain/Comment';
import { openDB, STORES } from './IndexedDB';
import { addItem, getById, getByIndex, updateItem, deleteItem, deleteByIndex } from './IndexedDBUtils';

export class IndexedDBCommentRepository implements ICommentRepository {
  async getById(id: string): Promise<Comment | undefined> {
    const db = await openDB();
    return getById<Comment>(db, STORES.COMMENTS, id);
  }

  async getBySpaceId(spaceId: string): Promise<Comment[]> {
    const db = await openDB();
    const comments = await getByIndex<Comment>(db, STORES.COMMENTS, 'spaceIdIndex', spaceId);
    // Ensure dates are Date objects and sort
    return comments
        .map(c => ({ ...c, timestamp: new Date(c.timestamp) }))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async add(commentData: Omit<Comment, 'id'>): Promise<Comment> {
    const db = await openDB();
    const newComment: Comment = {
        ...commentData,
        id: uuidv4(),
        timestamp: commentData.timestamp || new Date(), // Ensure timestamp exists
    };
    await addItem<Comment>(db, STORES.COMMENTS, newComment);
    return newComment;
  }

  async update(comment: Comment): Promise<void> {
    const db = await openDB();
    await updateItem<Comment>(db, STORES.COMMENTS, comment);
  }

  async delete(id: string): Promise<void> {
    const db = await openDB();
    await deleteItem(db, STORES.COMMENTS, id);
  }

  async deleteBySpaceId(spaceId: string): Promise<void> {
    const db = await openDB();
    await deleteByIndex(db, STORES.COMMENTS, 'spaceIdIndex', spaceId);
  }
}
