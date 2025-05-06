/**
 * @fileOverview Component for managing To-Do Items / Gallery within a Space.
 */
'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter as AlertDialogCompletionFooter, AlertDialogHeader as AlertDialogCompletionHeader, AlertDialogTitle as AlertDialogCompletionTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, Check, Upload, Camera, X as CloseIcon, Trash2 } from 'lucide-react'; // Added Check, Trash2
import { useSpaceContext } from '@/contexts/SpaceContext';
import { handleImageUploadUtil } from '@/utils/imageUtils';
import { formatShortDate } from '@/utils/dateUtils';
import { toast } from '@/hooks/use-toast';
import type { TodoItem } from '@/core/domain/TodoItem';
import { CameraCapture } from './CameraCapture'; // Import extracted CameraCapture component

interface TodoListComponentProps {
    spaceId: string;
}

export const TodoListComponent: React.FC<TodoListComponentProps> = ({ spaceId }) => {
    const { todos, isLoading: isContextLoading, error, createTodoItem, updateTodoItem, deleteTodoItem } = useSpaceContext();

    // Add/Edit Modal State
    const [isAddTodoModalOpen, setIsAddTodoModalOpen] = useState(false);
    const [isEditTodoModalOpen, setIsEditTodoModalOpen] = useState(false);
    const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);

    // Complete Task Dialog State
    const [isCompleteTaskDialogOpen, setIsCompleteTaskDialogOpen] = useState(false);
    const [completingTodo, setCompletingTodo] = useState<TodoItem | null>(null);
    const [completionAfterImage, setCompletionAfterImage] = useState<string | null>(null);

    // Form State (for both Add and Edit Modals)
    const [description, setDescription] = useState('');
    const [beforeImage, setBeforeImage] = useState<string | null>(null);
    const [afterImage, setAfterImage] = useState<string | null>(null);
    const [modalLoading, setModalLoading] = useState(false);

    // Camera State
    const [showCamera, setShowCamera] = useState<false | 'before' | 'after' | 'completionAfter'>(false); // Added 'completionAfter'
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadTarget, setUploadTarget] = useState<'before' | 'after' | 'completionAfter' | null>(null); // Added 'completionAfter'


    // --- Modal Handling ---
    const openAddModal = () => {
        setDescription('');
        setBeforeImage(null);
        setAfterImage(null);
        setIsAddTodoModalOpen(true);
    };

    const openEditModal = (item: TodoItem) => {
        setEditingTodo(item);
        setDescription(item.description);
        setBeforeImage(item.beforeImage || null);
        setAfterImage(item.afterImage || null);
        setIsEditTodoModalOpen(true);
    };

    const closeModal = () => {
        setIsAddTodoModalOpen(false);
        setIsEditTodoModalOpen(false);
        setEditingTodo(null);
        // Reset form state
        setDescription('');
        setBeforeImage(null);
        setAfterImage(null);
        setShowCamera(false);
        setUploadTarget(null);
    };

    // --- Completion Dialog Handling ---
    const openCompleteTaskDialog = (item: TodoItem) => {
        setCompletingTodo(item);
        setCompletionAfterImage(item.afterImage || null); // Pre-fill with existing after image if available
        setIsCompleteTaskDialogOpen(true);
    };

    const closeCompleteTaskDialog = () => {
        setIsCompleteTaskDialogOpen(false);
        setCompletingTodo(null);
        setCompletionAfterImage(null);
        setShowCamera(false); // Ensure camera closes if opened for completion
        setUploadTarget(null);
    };


    // --- Image Handling ---
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (uploadTarget) {
             const targetSetter = uploadTarget === 'before' ? setBeforeImage
                                : uploadTarget === 'after' ? setAfterImage
                                : setCompletionAfterImage; // Handle completion target
            handleImageUploadUtil(event, targetSetter);
        }
        setUploadTarget(null); // Reset target after handling
         // Clear the file input value after processing
        if (event.target) event.target.value = '';
    };

    const triggerFileUpload = (target: 'before' | 'after' | 'completionAfter') => { // Added 'completionAfter'
        setUploadTarget(target);
        fileInputRef.current?.click();
    };

    const openCamera = (target: 'before' | 'after' | 'completionAfter') => { // Added 'completionAfter'
        setShowCamera(target);
    };

    const handleCapture = (dataUrl: string) => {
        if (showCamera === 'before') setBeforeImage(dataUrl);
        else if (showCamera === 'after') setAfterImage(dataUrl);
        else if (showCamera === 'completionAfter') setCompletionAfterImage(dataUrl); // Handle completion target
        setShowCamera(false); // Close camera after capture
    };

    // --- CRUD Operations ---
    const handleSave = async () => {
        if (isContextLoading || modalLoading) return;

        // Validation
        if (!description.trim()) {
             toast({ title: "Validation Error", description: "Description is required.", variant: "destructive" });
             return;
        }

        setModalLoading(true);

        try {
            if (editingTodo) { // Update existing
                await updateTodoItem({
                    ...editingTodo,
                    description: description.trim(),
                    beforeImage: beforeImage,
                    afterImage: afterImage,
                });
                toast({ title: "Task Updated" });
            } else { // Create new
                await createTodoItem({
                    spaceId,
                    description: description.trim(),
                    beforeImage: beforeImage,
                    afterImage: afterImage,
                });
                 toast({ title: "Task Added" });
            }
            closeModal(); // Close modal on success
        } finally {
            setModalLoading(false);
        }
    };

    const handleConfirmComplete = async () => {
        if (!completingTodo || isContextLoading || modalLoading) return;

        setModalLoading(true);
        try {
            await updateTodoItem({
                ...completingTodo,
                completed: true, // Mark as completed
                afterImage: completionAfterImage, // Update after image
            });
            toast({ title: "Task Completed!" });
            closeCompleteTaskDialog();
        } finally {
            setModalLoading(false);
        }
    };

    // Separate function for actual deletion (can be triggered from edit modal or somewhere else if needed)
    const handleConfirmDelete = async (id: string) => {
        if (isContextLoading || modalLoading) return;
        await deleteTodoItem(id);
        // Toast is handled within context/service layer
        // Optionally close any modals if deletion happens from there
        if (editingTodo?.id === id) closeModal();
    };


    // --- Rendering ---
    if (isContextLoading && todos.length === 0) {
        return <Skeleton className="h-40 w-full mt-3" />;
    }

    if (error && todos.length === 0) {
        return <p className="text-destructive text-xs mt-2">Error loading tasks: {error}</p>;
    }

    return (
        <div className="mt-3 w-full max-w-4xl">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-base font-bold">Tasks / Gallery</h2>
                <Button onClick={openAddModal} size="sm" className="text-xs h-8" disabled={isContextLoading}>
                    Add Task
                </Button>
            </div>

            {todos.length === 0 && !isContextLoading && (
                 <p className="text-xs text-muted-foreground text-center py-2">No tasks yet.</p>
            )}

            {todos.length > 0 && (
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                     {todos.map((item) => (
                        <Card key={item.id} className={`overflow-hidden group relative ${item.completed ? 'opacity-60' : ''}`}>
                            <CardContent className="p-2 space-y-1">
                                {item.completed && (
                                    <div className="absolute top-1 right-1 bg-primary text-primary-foreground p-1 rounded-full z-10">
                                        <Check className="h-3 w-3" />
                                    </div>
                                )}
                                {item.beforeImage && (
                                    <img
                                        src={item.beforeImage}
                                        alt="Before"
                                        className="w-full h-24 object-cover rounded-md mb-1"
                                        data-ai-hint="task before"
                                    />
                                )}
                                {item.afterImage && (
                                    <img
                                        src={item.afterImage}
                                        alt="After"
                                        className="w-full h-24 object-cover rounded-md"
                                         data-ai-hint="task after"
                                    />
                                )}
                                <p className={`text-xs font-semibold truncate ${item.completed ? 'line-through' : ''}`} title={item.description}>
                                    {item.description}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {formatShortDate(item.dateCreated)}
                                </p>
                            </CardContent>
                            {/* Overlay for actions */}
                             {!item.completed && ( // Only show actions if not completed
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => openEditModal(item)}
                                        aria-label="Edit Task"
                                        disabled={isContextLoading || modalLoading}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    {/* Changed Trash2 to Check for completion trigger */}
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-green-500 hover:bg-green-600 text-white"
                                        onClick={() => openCompleteTaskDialog(item)}
                                        aria-label="Complete Task"
                                        disabled={isContextLoading || modalLoading}
                                    >
                                        <Check className="h-4 w-4" />
                                    </Button>
                                </div>
                             )}
                              {item.completed && ( // Optional: Show delete for completed items?
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center gap-2">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                                aria-label="Delete Task Permanently"
                                                disabled={isContextLoading || modalLoading}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete Task Permanently?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete the task "{item.description}".
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel disabled={modalLoading}>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleConfirmDelete(item.id)} disabled={modalLoading}>
                                                    {modalLoading ? 'Deleting...' : 'Delete'}
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                              )}
                        </Card>
                     ))}
                 </div>
            )}

            {/* Add/Edit Modal */}
            <Dialog open={isAddTodoModalOpen || isEditTodoModalOpen} onOpenChange={closeModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingTodo ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div>
                            <Label htmlFor="todo-desc">Description *</Label>
                            <Input
                                id="todo-desc"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Task description"
                                required
                            />
                        </div>

                        {/* Before Image Section */}
                        <div className="space-y-2">
                            <Label>Before Image</Label>
                            {beforeImage ? (
                                <div className="relative">
                                    <img src={beforeImage} alt="Before preview" className="rounded max-h-40 object-cover w-full" />
                                    <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 bg-white/70 hover:bg-white" onClick={() => setBeforeImage(null)} disabled={modalLoading}>
                                        <CloseIcon className="h-4 w-4 text-destructive" />
                                    </Button>
                                     <div className="absolute bottom-1 left-1 flex gap-1">
                                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs bg-white/70" onClick={() => triggerFileUpload('before')} disabled={modalLoading}>Change</Button>
                                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs bg-white/70" onClick={() => openCamera('before')} disabled={modalLoading}>Retake</Button>
                                     </div>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1" onClick={() => triggerFileUpload('before')} disabled={modalLoading}>
                                        <Upload className="mr-2 h-4 w-4" /> Upload
                                    </Button>
                                    <Button variant="outline" className="flex-1" onClick={() => openCamera('before')} disabled={modalLoading}>
                                        <Camera className="mr-2 h-4 w-4" /> Use Camera
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* After Image Section */}
                         <div className="space-y-2">
                             <Label>After Image</Label>
                             {afterImage ? (
                                <div className="relative">
                                    <img src={afterImage} alt="After preview" className="rounded max-h-40 object-cover w-full" />
                                     <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 bg-white/70 hover:bg-white" onClick={() => setAfterImage(null)} disabled={modalLoading}>
                                          <CloseIcon className="h-4 w-4 text-destructive" />
                                     </Button>
                                      <div className="absolute bottom-1 left-1 flex gap-1">
                                         <Button variant="outline" size="sm" className="h-6 px-2 text-xs bg-white/70" onClick={() => triggerFileUpload('after')} disabled={modalLoading}>Change</Button>
                                         <Button variant="outline" size="sm" className="h-6 px-2 text-xs bg-white/70" onClick={() => openCamera('after')} disabled={modalLoading}>Retake</Button>
                                      </div>
                                 </div>
                             ) : (
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1" onClick={() => triggerFileUpload('after')} disabled={modalLoading}>
                                        <Upload className="mr-2 h-4 w-4" /> Upload
                                    </Button>
                                    <Button variant="outline" className="flex-1" onClick={() => openCamera('after')} disabled={modalLoading}>
                                        <Camera className="mr-2 h-4 w-4" /> Use Camera
                                    </Button>
                                </div>
                             )}
                         </div>
                    </div>
                    <DialogFooter>
                        {editingTodo && ( // Show delete button only in edit mode
                           <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button type="button" variant="destructive" disabled={modalLoading}>Delete Permanently</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Task Permanently?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the task "{editingTodo.description}".
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel disabled={modalLoading}>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleConfirmDelete(editingTodo.id)} disabled={modalLoading}>
                                            {modalLoading ? 'Deleting...' : 'Delete'}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                           </AlertDialog>
                        )}
                        <DialogClose asChild>
                            <Button type="button" variant="secondary" onClick={closeModal} disabled={modalLoading}>Cancel</Button>
                        </DialogClose>
                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={isContextLoading || modalLoading || !description.trim()}
                        >
                            {modalLoading ? 'Saving...' : (editingTodo ? 'Save Changes' : 'Add Task')}
                        </Button>
                    </DialogFooter>
                     {/* Render CameraCapture component inside the modal when showCamera is true */}
                     {showCamera && showCamera !== 'completionAfter' && ( // Don't show inside completion dialog
                        <CameraCapture
                            onCapture={handleCapture}
                            onClose={() => setShowCamera(false)}
                        />
                     )}
                </DialogContent>
            </Dialog>

            {/* Complete Task Dialog */}
            <Dialog open={isCompleteTaskDialogOpen} onOpenChange={closeCompleteTaskDialog}>
                <DialogContent>
                     <DialogHeader>
                        <DialogTitle>Complete Task: {completingTodo?.description}</DialogTitle>
                    </DialogHeader>
                     <div className="grid gap-4 py-4">
                         {/* Optional After Image for Completion */}
                         <div className="space-y-2">
                             <Label>After Image (Optional)</Label>
                             {completionAfterImage ? (
                                <div className="relative">
                                    <img src={completionAfterImage} alt="After preview" className="rounded max-h-40 object-cover w-full" />
                                     <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 bg-white/70 hover:bg-white" onClick={() => setCompletionAfterImage(null)} disabled={modalLoading}>
                                          <CloseIcon className="h-4 w-4 text-destructive" />
                                     </Button>
                                      <div className="absolute bottom-1 left-1 flex gap-1">
                                         <Button variant="outline" size="sm" className="h-6 px-2 text-xs bg-white/70" onClick={() => triggerFileUpload('completionAfter')} disabled={modalLoading}>Change</Button>
                                         <Button variant="outline" size="sm" className="h-6 px-2 text-xs bg-white/70" onClick={() => openCamera('completionAfter')} disabled={modalLoading}>Retake</Button>
                                      </div>
                                 </div>
                             ) : (
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1" onClick={() => triggerFileUpload('completionAfter')} disabled={modalLoading}>
                                        <Upload className="mr-2 h-4 w-4" /> Upload
                                    </Button>
                                    <Button variant="outline" className="flex-1" onClick={() => openCamera('completionAfter')} disabled={modalLoading}>
                                        <Camera className="mr-2 h-4 w-4" /> Use Camera
                                    </Button>
                                </div>
                             )}
                         </div>
                    </div>
                     <DialogFooter>
                         <DialogClose asChild>
                             <Button type="button" variant="secondary" onClick={closeCompleteTaskDialog} disabled={modalLoading}>Cancel</Button>
                         </DialogClose>
                        <Button type="button" onClick={handleConfirmComplete} disabled={isContextLoading || modalLoading}>
                            {modalLoading ? 'Completing...' : 'Complete Task'}
                        </Button>
                    </DialogFooter>
                    {/* Render CameraCapture component inside the modal when showCamera is 'completionAfter' */}
                    {showCamera === 'completionAfter' && (
                        <CameraCapture
                            onCapture={handleCapture}
                            onClose={() => setShowCamera(false)}
                        />
                     )}
                </DialogContent>
            </Dialog>


             {/* Hidden file input */}
             <input
                 type="file"
                 ref={fileInputRef}
                 onChange={handleFileChange}
                 accept="image/*"
                 className="hidden"
             />

        </div>
    );
};
