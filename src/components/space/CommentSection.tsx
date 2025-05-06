/**
 * @fileOverview Component for displaying comments and adding new ones.
 */
'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload, Camera, X as CloseIcon } from 'lucide-react';
import { handleImageUploadUtil } from '@/utils/imageUtils';
import { formatTime } from '@/utils/dateUtils';
import { toast } from '@/hooks/use-toast';
import type { Comment } from '@/core/domain/Comment';
import { CameraCapture } from './CameraCapture'; // Import extracted CameraCapture component

interface CommentSectionProps {
    comments: Comment[];
    spaceId: string;
    isLoading: boolean;
    onAddComment: (commentData: Omit<Comment, 'id' | 'timestamp'>) => Promise<Comment | undefined>;
    onShowDetailsClick: () => void;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
    comments,
    spaceId,
    isLoading,
    onAddComment,
    onShowDetailsClick,
}) => {
    const [newCommentText, setNewCommentText] = useState('');
    const [newCommentImage, setNewCommentImage] = useState<string | null>(null);
    const [showCommentCamera, setShowCommentCamera] = useState(false);
    const [isAddingComment, setIsAddingComment] = useState(false); // Local loading state for adding
    const commentFileInputRef = useRef<HTMLInputElement>(null);

    const handleCommentFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        handleImageUploadUtil(event, setNewCommentImage);
         // Clear the file input value after processing
        if (event.target) event.target.value = '';
    };

    const triggerCommentUpload = () => commentFileInputRef.current?.click();

    const handleCommentCapture = (dataUrl: string) => {
        setNewCommentImage(dataUrl);
        setShowCommentCamera(false);
    };

    const handleAddComment = async () => {
        if (!spaceId || (!newCommentText.trim() && !newCommentImage) || isLoading || isAddingComment) {
             if (!newCommentText.trim() && !newCommentImage) {
                 toast({ title: "Validation Error", description: "Comment needs text or image.", variant: "destructive" });
             }
             return;
        }
        setIsAddingComment(true);
        try {
            const success = await onAddComment({ spaceId, text: newCommentText.trim(), imageUrl: newCommentImage });
            if (success) {
                setNewCommentText('');
                setNewCommentImage(null);
                 toast({ title: "Comment Added" });
            }
        } finally {
            setIsAddingComment(false);
        }
    };

    const latestComment = comments.length > 0 ? comments[0] : null;

    return (
        <div className="mt-3 w-full max-w-4xl">
            <div className="flex justify-between items-center mb-1">
                 <h2 className="text-base font-bold">Comments</h2>
                 <Button
                     variant="link"
                     size="sm"
                     className="text-xs h-auto px-1 py-0"
                     onClick={onShowDetailsClick}
                     disabled={isLoading || comments.length === 0}
                 >
                     See All ({comments.length})
                 </Button>
            </div>

            {isLoading && comments.length === 0 && <Skeleton className="h-10 w-full mb-1" />}
            {!isLoading && (
                 <div className="text-xs text-muted-foreground mb-1">
                    {latestComment ? (
                        <span> Latest: {latestComment.text.substring(0, 40)}{latestComment.text.length > 40 ? '...' : ''} ({formatTime(latestComment.timestamp)})</span>
                    ) : (
                        <span>No comments yet.</span>
                    )}
                 </div>
            )}

            <div className="flex flex-col sm:flex-row gap-1 mt-1"> {/* Comment Input */}
                 <Textarea
                     id="comment"
                     className="flex-grow p-1 border rounded text-foreground text-xs min-h-[40px] h-10 sm:h-auto"
                     placeholder="Add a comment..."
                     value={newCommentText}
                     onChange={(e) => setNewCommentText(e.target.value)}
                     disabled={isLoading || isAddingComment}
                 />
                  <div className="flex flex-col gap-1 w-full sm:w-auto items-stretch">
                    {newCommentImage ? (
                         <div className="relative self-center sm:self-start">
                             <img src={newCommentImage} alt="Comment Preview" className="rounded max-h-20 object-cover" />
                             <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-1 right-1 h-6 w-6 bg-white/70 hover:bg-white"
                                onClick={() => setNewCommentImage(null)}
                                disabled={isAddingComment}
                             >
                                <CloseIcon className="h-4 w-4 text-destructive" />
                            </Button>
                         </div>
                     ) : (
                         <div className="flex gap-1">
                             <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs h-8"
                                onClick={triggerCommentUpload}
                                disabled={isLoading || isAddingComment}
                             >
                                <Upload className="mr-1 h-3 w-3" /> Pic
                             </Button>
                             <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs h-8"
                                onClick={() => setShowCommentCamera(true)}
                                disabled={isLoading || isAddingComment}
                             >
                                <Camera className="mr-1 h-3 w-3" /> Cam
                             </Button>
                         </div>
                     )}
                     <Button
                        onClick={handleAddComment}
                        size="sm"
                        className="text-xs h-8 w-full"
                        disabled={isLoading || isAddingComment || (!newCommentText.trim() && !newCommentImage)}
                     >
                        {isAddingComment ? 'Adding...' : 'Add Comment'}
                     </Button>
                 </div>
                 {/* Hidden file input for comments */}
                 <input
                     type="file"
                     ref={commentFileInputRef}
                     onChange={handleCommentFileChange}
                     accept="image/*"
                     className="hidden"
                 />
            </div>

            {/* Render CameraCapture component when showCommentCamera is true */}
            {showCommentCamera && (
                <CameraCapture
                    onCapture={handleCommentCapture}
                    onClose={() => setShowCommentCamera(false)}
                />
            )}
        </div>
    );
};