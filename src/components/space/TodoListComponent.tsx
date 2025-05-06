/**
 * @fileOverview Component for managing To-Do Items / Gallery within a Space.
 */
'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, Trash2, Upload, Camera, X as CloseIcon } from 'lucide-react';
import { useSpaceContext } from '@/contexts/SpaceContext';
import { handleImageUploadUtil } from '@/utils/imageUtils';
import { formatShortDate } from '@/utils/dateUtils';
import { toast } from '@/hooks/use-toast';
import type { TodoItem } from '@/core/domain/TodoItem';
import { CameraCapture } from './CameraCapture'; // Assuming CameraCapture is also in components/space

interface TodoListComponentProps {
    spaceId: string;
}

export const TodoListComponent: React.FC<TodoListComponentProps> = ({ spaceId }) => {
    const { todos, isLoading: isContextLoading, error, createTodoItem, updateTodoItem, deleteTodoItem } = useSpaceContext();

    // Add/Edit Modal State
    const [isAddTodoModalOpen, setIsAddTodoModalOpen] = useState(false);
    const [isEditTodoModalOpen, setIsEditTodoModalOpen] = useState(false);
    const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);

    // Form State (for both Add and Edit Modals)
    const [description, setDescription] = useState('');
    const [beforeImage, setBeforeImage] = useState<string | null>(null);
    const [afterImage, setAfterImage] = useState<string | null>(null);
    const [modalLoading, setModalLoading] = useState(false);

    // Camera State
    const [showCamera, setShowCamera] = useState<false | 'before' | 'after'>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadTarget, setUploadTarget] = useState<'before' | 'after' | null>(null);


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

    // --- Image Handling ---
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (uploadTarget) {
            handleImageUploadUtil(event, uploadTarget === 'before' ? setBeforeImage : setAfterImage);
        }
        setUploadTarget(null); // Reset target after handling
         // Clear the file input value after processing
        if (event.target) event.target.value = '';
    };

    const triggerFileUpload = (target: 'before' | 'after') => {
        setUploadTarget(target);
        fileInputRef.current?.click();
    };

    const openCamera = (target: 'before' | 'after') => {
        setShowCamera(target);
    };

    const handleCapture = (dataUrl: string) => {
        if (showCamera === 'before') {
            setBeforeImage(dataUrl);
        } else if (showCamera === 'after') {
            setAfterImage(dataUrl);
        }
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
        if (!beforeImage) {
            toast({ title: "Validation Error", description: `Before image is required${editingTodo ? ' and cannot be removed.' : '.'}`, variant: "destructive" });
            return;
        }

        setModalLoading(true);

        try {
            if (editingTodo) { // Update existing
                await updateTodoItem({
                    ...editingTodo,
                    description: description.trim(),
                    beforeImage: beforeImage, // Ensure before image is passed
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

    const handleDelete = async (id: string) => {
        if (isContextLoading || modalLoading) return; // Prevent deletion while other ops are running
        // Consider adding a confirmation dialog here
        await deleteTodoItem(id);
        // Toast is handled within context/service layer
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
                        <Card key={item.id} className="overflow-hidden group relative">
                            <CardContent className="p-2 space-y-1">
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
                                <p className="text-xs font-semibold truncate" title={item.description}>
                                    {item.description}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {formatShortDate(item.dateCreated)}
                                </p>
                            </CardContent>
                            {/* Overlay for actions */}
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
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleDelete(item.id)}
                                    aria-label="Delete Task"
                                     disabled={isContextLoading || modalLoading}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
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
                            />
                        </div>

                        {/* Before Image Section */}
                        <div className="space-y-2">
                            <Label>Before Image *</Label>
                            {beforeImage ? (
                                <div className="relative">
                                    <img src={beforeImage} alt="Before preview" className="rounded max-h-40 object-cover w-full" />
                                    {/* Allow removing only if NOT editing or if adding new */}
                                     { !editingTodo && (
                                         <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 bg-white/70 hover:bg-white" onClick={() => setBeforeImage(null)} disabled={modalLoading}>
                                             <CloseIcon className="h-4 w-4 text-destructive" />
                                         </Button>
                                     )}
                                     {/* Add button to change image */}
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
                                     {/* Add button to change image */}
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
                        <Button type="button" variant="secondary" onClick={closeModal} disabled={modalLoading}>Cancel</Button>
                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={isContextLoading || modalLoading || !description.trim() || !beforeImage}
                        >
                            {modalLoading ? 'Saving...' : (editingTodo ? 'Save Changes' : 'Add Task')}
                        </Button>
                    </DialogFooter>
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

            {/* Camera Capture Modal */}
            {showCamera && (
                <CameraCapture
                    onCapture={handleCapture}
                    onClose={() => setShowCamera(false)}
                />
            )}
        </div>
    );
};
