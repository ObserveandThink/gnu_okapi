/**
 * @fileOverview Defines the port (interface) for interacting with Comment data storage.
 */

import type { Comment } from '@/core/domain/Comment';

export interface ICommentRepository {
  /**
   * Retrieves a comment by its unique ID.
   * @param id - The ID of the comment.
   * @returns A promise resolving to the Comment or undefined if not found.
   */
  getById(id: string): Promise<Comment | undefined>;

  /**
   * Retrieves all comments associated with a specific space, sorted by timestamp descending.
   * @param spaceId - The ID of the space.
   * @returns A promise resolving to an array of Comments.
   */
  getBySpaceId(spaceId: string): Promise<Comment[]>;

  /**
   * Adds a new comment to the storage.
   * @param comment - The comment data to add (ID will be assigned).
   * @returns A promise resolving to the newly added Comment with its ID.
   */
  add(comment: Omit<Comment, 'id'>): Promise<Comment>;

  /**
   * Updates an existing comment in the storage.
   * @param comment - The comment data to update.
   * @returns A promise resolving when the update is complete.
   */
  update(comment: Comment): Promise<void>;

  /**
   * Deletes a comment from the storage by its ID.
   * @param id - The ID of the comment to delete.
   * @returns A promise resolving when the deletion is complete.
   */
  delete(id: string): Promise<void>;

  /**
   * Deletes all comments associated with a specific space.
   * @param spaceId - The ID of the space.
   * @returns A promise resolving when the deletion is complete.
   */
  deleteBySpaceId(spaceId: string): Promise<void>;
}
