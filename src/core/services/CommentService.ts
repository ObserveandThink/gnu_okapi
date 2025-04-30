/**
 * @fileOverview Service layer for managing Comments. Encapsulates business logic
 * related to comments, interacting with the repository for data persistence.
 */

import type { ICommentRepository } from '@/core/ports/CommentRepository';
import type { Comment } from '@/core/domain/Comment';

export class CommentService {
  constructor(private commentRepository: ICommentRepository) {}

  /**
   * Adds a new comment to a space.
   * @param commentData - Data for the new comment (spaceId, text, imageUrl).
   * @returns A promise resolving to the created Comment.
   */
  async addComment(commentData: Omit<Comment, 'id' | 'timestamp'>): Promise<Comment> {
    if (!commentData.text.trim() && !commentData.imageUrl) {
      throw new Error("Comment must have text or an image.");
    }

    const commentToAdd: Omit<Comment, 'id'> = {
        ...commentData,
        timestamp: new Date(),
    };

    return this.commentRepository.add(commentToAdd);
  }

  /**
   * Retrieves all comments for a specific space, sorted by timestamp descending.
   * @param spaceId - The ID of the space.
   * @returns A promise resolving to an array of Comments.
   */
  async getCommentsForSpace(spaceId: string): Promise<Comment[]> {
    // Repository already handles sorting
    return this.commentRepository.getBySpaceId(spaceId);
  }

  /**
   * Deletes a comment.
   * @param id - The ID of the comment to delete.
   * @returns A promise resolving when the deletion is complete.
   */
  async deleteComment(id: string): Promise<void> {
    return this.commentRepository.delete(id);
  }

  /**
   * Deletes all comments associated with a specific space.
   * This is typically used when deleting a space.
   * @param spaceId - The ID of the space.
   * @returns A promise resolving when the deletion is complete.
   */
  async deleteCommentsForSpace(spaceId: string): Promise<void> {
    return this.commentRepository.deleteBySpaceId(spaceId);
  }
}
