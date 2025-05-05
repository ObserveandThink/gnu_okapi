/**
 * @fileOverview Page component for displaying and interacting with a single Space.
 */
'use client';

import { useRouter, useParams } from 'next/navigation';
import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useSpaceContext } from '@/contexts/SpaceContext';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { handleImageUploadUtil } from '@/utils/imageUtils';
import { formatTime, formatElapsedTime, formatShortDate } from '@/utils/dateUtils';
import { Camera, Trash2, Edit, Upload, X as CloseIcon } from 'lucide-react'; // Import icons
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // For camera permission errors


// Import Domain Models
import type { Action } from '@/core/domain/Action';
import type { MultiStepAction, ActionStep } from '@/core/domain/MultiStepAction';
import type { LogEntry } from '@/core/domain/LogEntry';
import type { WasteEntry } from '@/core/domain/WasteEntry';
import type { Comment } from '@/core/domain/Comment';
import type { TodoItem } from '@/core/domain/TodoItem'; // Import TodoItem model

// TIMWOODS Categories
const timwoodsCategories = [
  {id: 'transportation', name: 'Transportation', description: 'Unnecessary movement of materials or products.', points: 1},
  {id: 'inventory', name: 'Inventory', description: 'Excess raw materials, work in progress, or finished goods.', points: 2},
  {id: 'motion', name: 'Motion', description: 'Unnecessary movement of people.', points: 3},
  {id: 'waiting', name: 'Waiting', description: 'Idle time waiting for the next step in a process.', points: 4},
  {id: 'overprocessing', name: 'Overprocessing', description: 'Performing more work than is necessary.', points: 5},
  {id: 'overproduction', name: 'Overproduction', description: 'Producing more than is needed.', points: 6},
  {id: 'defects', name: 'Defects', description: 'Rework or scrap due to errors or defects.', points: 7},
  {id: 'skills', name: 'Skills', description: 'Underutilizing people\'s talents and skills', points: 8},
];

// --- Camera Capture Component ---
interface CameraCaptureProps {
    onCapture: (dataUrl: string) => void;
    onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        const getCameraPermission = async () => {
            try {
                const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
                setStream(cameraStream);
                setHasCameraPermission(true);
                if (videoRef.current) {
                    videoRef.current.srcObject = cameraStream;
                }
            } catch (error) {
                console.error('Error accessing camera:', error);
                setHasCameraPermission(false);
                toast({
                    variant: 'destructive',
                    title: 'Camera Access Denied',
                    description: 'Please enable camera permissions in your browser settings.',
                });
            }
        };

        getCameraPermission();

        // Cleanup function to stop the stream when the component unmounts or closes
        return () => {
            stream?.getTracks().forEach(track => track.stop());
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on mount

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (context) {
                // Set canvas dimensions to match video
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                // Draw the current video frame onto the canvas
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Get the image data URL (e.g., 'data:image/png;base64,...')
                const dataUrl = canvas.toDataURL('image/jpeg'); // Or 'image/png'
                onCapture(dataUrl);
                onClose(); // Close camera view after capture
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg p-4 max-w-lg w-full relative">
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-10" onClick={onClose}>
                    <CloseIcon className="h-5 w-5" />
                </Button>
                <h2 className="text-lg font-semibold mb-4 text-center">Camera Capture</h2>
                <div className="relative aspect-video w-full mb-4">
                   <video ref={videoRef} className="w-full h-full rounded-md object-cover" autoPlay muted playsInline />
                   {/* Hidden canvas for capturing */}
                   <canvas ref={canvasRef} className="hidden" />
                </div>

                {hasCameraPermission === false && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertTitle>Camera Access Required</AlertTitle>
                        <AlertDescription>
                            Camera permission was denied or unavailable. Please enable it in your browser settings and refresh.
                        </AlertDescription>
                    </Alert>
                )}

                {hasCameraPermission === true && (
                    <Button onClick={handleCapture} className="w-full" disabled={!stream}>
                        <Camera className="mr-2 h-4 w-4" /> Capture Image
                    </Button>
                )}
                 {hasCameraPermission === null && (
                    <p className="text-center text-muted-foreground">Requesting camera access...</p>
                 )}
            </div>
        </div>
    );
};


// --- To-Do List Component ---
const TodoListComponent: React.FC<{ spaceId: string }> = ({ spaceId }) => {
    const { todos, isLoading, error, createTodoItem, updateTodoItem, deleteTodoItem } = useSpaceContext();

    // Add/Edit Modal State
    const [isAddTodoModalOpen, setIsAddTodoModalOpen] = useState(false);
    const [isEditTodoModalOpen, setIsEditTodoModalOpen] = useState(false);
    const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);

    // Form State (for both Add and Edit Modals)
    const [description, setDescription] = useState('');
    const [beforeImage, setBeforeImage] = useState<string | null>(null);
    const [afterImage, setAfterImage] = useState<string | null>(null);

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
        if (isLoading) return;

        if (editingTodo) { // Update existing
            if (!description.trim()) {
                 toast({ title: "Validation Error", description: "Description is required.", variant: "destructive" });
                 return;
            }
            await updateTodoItem({
                ...editingTodo,
                description: description.trim(),
                beforeImage: beforeImage,
                afterImage: afterImage,
            });
        } else { // Create new
            if (!description.trim()) {
                toast({ title: "Validation Error", description: "Description is required.", variant: "destructive" });
                return;
            }
            if (!beforeImage) {
                 toast({ title: "Validation Error", description: "Before image is required.", variant: "destructive" });
                 return;
            }
            await createTodoItem({
                spaceId,
                description: description.trim(),
                beforeImage: beforeImage,
                afterImage: afterImage,
            });
        }
        closeModal(); // Close modal on success
    };

    const handleDelete = async (id: string) => {
        await deleteTodoItem(id);
    };

    // --- Rendering ---
    if (isLoading && todos.length === 0) {
        return <Skeleton className="h-40 w-full mt-3" />;
    }

    if (error && todos.length === 0) {
        return <p className="text-destructive text-xs mt-2">Error loading tasks: {error}</p>;
    }

    return (
        <div className="mt-3 w-full max-w-4xl">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-base font-bold">Tasks / Gallery</h2>
                <Button onClick={openAddModal} size="sm" className="text-xs h-8">
                    Add Task
                </Button>
            </div>

            {todos.length === 0 && !isLoading && (
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
                                    />
                                )}
                                {item.afterImage && (
                                    <img
                                        src={item.afterImage}
                                        alt="After"
                                        className="w-full h-24 object-cover rounded-md"
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
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleDelete(item.id)}
                                    aria-label="Delete Task"
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
                            <Label>Before Image {editingTodo ? '' : '*'}</Label>
                            {beforeImage ? (
                                <div className="relative">
                                    <img src={beforeImage} alt="Before preview" className="rounded max-h-40 object-cover w-full" />
                                     <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 bg-white/70 hover:bg-white" onClick={() => setBeforeImage(null)}>
                                         <CloseIcon className="h-4 w-4 text-destructive" />
                                     </Button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1" onClick={() => triggerFileUpload('before')}>
                                        <Upload className="mr-2 h-4 w-4" /> Upload
                                    </Button>
                                    <Button variant="outline" className="flex-1" onClick={() => openCamera('before')}>
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
                                     <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 bg-white/70 hover:bg-white" onClick={() => setAfterImage(null)}>
                                          <CloseIcon className="h-4 w-4 text-destructive" />
                                     </Button>
                                 </div>
                             ) : (
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1" onClick={() => triggerFileUpload('after')}>
                                        <Upload className="mr-2 h-4 w-4" /> Upload
                                    </Button>
                                    <Button variant="outline" className="flex-1" onClick={() => openCamera('after')}>
                                        <Camera className="mr-2 h-4 w-4" /> Use Camera
                                    </Button>
                                </div>
                             )}
                         </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
                        <Button type="button" onClick={handleSave} disabled={isLoading || !description.trim() || (!editingTodo && !beforeImage)}>
                            {isLoading ? 'Saving...' : (editingTodo ? 'Save Changes' : 'Add Task')}
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


// --- Main Page Component ---
export default function SpaceDetailPage() {
    // Hooks and Context
  const params = useParams();
  const spaceId = params.spaceId as string; // Type assertion
  const router = useRouter();
  const {
      currentSpace,
      actions,
      multiStepActions,
      logEntries,
      wasteEntries,
      comments,
      isLoading,
      error,
      loadSpaceDetails,
      clearCurrentSpace,
      createAction,
      createMultiStepAction,
      completeMultiStepActionStep,
      addLogEntry,
      addWasteEntries,
      addComment,
      addClockedTime,
      // Removed todo-related functions as they are handled by TodoListComponent
  } = useSpaceContext();

  // Local UI State (moved todo-specific state to TodoListComponent)
  const [isCreateActionModalOpen, setIsCreateActionModalOpen] = useState(false);
  const [newActionName, setNewActionName] = useState('');
  const [newActionDescription, setNewActionDescription] = useState('');
  const [newActionPoints, setNewActionPoints] = useState<number | string>(1);

  const [isCreateMultiStepActionModalOpen, setIsCreateMultiStepActionModalOpen] = useState(false);
  const [newMultiStepActionName, setNewMultiStepActionName] = useState('');
  const [newMultiStepActionDescription, setNewMultiStepActionDescription] = useState('');
  const [newMultiStepActionPoints, setNewMultiStepActionPoints] = useState<number | string>(1);
  const [newMultiStepActionSteps, setNewMultiStepActionSteps] = useState<string[]>(['']);

  const [isAddWasteModalOpen, setIsAddWasteModalOpen] = useState(false);
  const [selectedWasteCategories, setSelectedWasteCategories] = useState<string[]>([]);

  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentImage, setNewCommentImage] = useState<string | null>(null);

  const [isLogDetailsOpen, setIsLogDetailsOpen] = useState(false);
  const [isWasteDetailsOpen, setIsWasteDetailsOpen] = useState(false);
  const [isCommentDetailsOpen, setIsCommentDetailsOpen] = useState(false);

   // Clock-in/out State
   const [isClockedIn, setIsClockedIn] = useState(false);
   const [clockInStartTime, setClockInStartTime] = useState<Date | null>(null);
   const [currentSessionElapsedTime, setCurrentSessionElapsedTime] = useState(0);
   const [timerIntervalId, setTimerIntervalId] = useState<NodeJS.Timeout | null>(null);

   // Camera/Upload state for comments
   const [showCommentCamera, setShowCommentCamera] = useState(false);
   const commentFileInputRef = useRef<HTMLInputElement>(null);

    // --- Effects ---
   useEffect(() => {
    if (spaceId) {
        console.log(`Effect: Loading details for spaceId: ${spaceId}`);
        loadSpaceDetails(spaceId);
    }
     return () => {
        console.log("Effect Cleanup: Clearing current space details.");
        clearCurrentSpace();
        if (timerIntervalId) clearInterval(timerIntervalId);
        setIsClockedIn(false);
        setClockInStartTime(null);
        setCurrentSessionElapsedTime(0);
        setTimerIntervalId(null);
     };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [spaceId]); // Removed loadSpaceDetails, clearCurrentSpace to avoid potential loops if they change identity


    // Timer effect for current session duration
    useEffect(() => {
        if (isClockedIn && clockInStartTime) {
            const intervalId = setInterval(() => {
                const now = new Date();
                const timeDifference = now.getTime() - clockInStartTime.getTime();
                setCurrentSessionElapsedTime(Math.floor(timeDifference / 1000));
            }, 1000);
            setTimerIntervalId(intervalId);

            return () => {
                clearInterval(intervalId);
                setTimerIntervalId(null);
            };
        } else {
            setCurrentSessionElapsedTime(0);
             if (timerIntervalId) {
                clearInterval(timerIntervalId);
                setTimerIntervalId(null);
            }
        }
    }, [isClockedIn, clockInStartTime]);


   // --- Calculated Values ---
   const totalPoints = useMemo(() => {
    return logEntries.reduce((sum, entry) => sum + entry.points, 0);
  }, [logEntries]);

   const totalWastePoints = useMemo(() => {
    return wasteEntries.reduce((sum, entry) => sum + entry.points, 0);
  }, [wasteEntries]);

  const apPerCurrentSessionHour = useMemo(() => {
    if (!isClockedIn || !clockInStartTime || currentSessionElapsedTime <= 0) {
        return 0;
    }
    const sessionPointEntries = logEntries.filter(
        entry => entry.timestamp >= clockInStartTime && entry.points > 0
    );
    const sessionPoints = sessionPointEntries.reduce((sum, entry) => sum + entry.points, 0);
    const sessionHours = currentSessionElapsedTime / 3600;
    if (sessionHours <= 0) return 0;
    return sessionPoints / sessionHours;
 }, [logEntries, isClockedIn, clockInStartTime, currentSessionElapsedTime]);

   // --- Event Handlers ---
  const handleBack = () => router.push('/');

   // Clock In/Out
   const handleClockIn = async () => {
    if (!currentSpace) return;
    const now = new Date();
    setIsClockedIn(true);
    setClockInStartTime(now);
    setCurrentSessionElapsedTime(0);
    await addLogEntry({ spaceId: currentSpace.id, actionName: 'Clock In', points: 0, type: 'clockIn' });
    toast({ title: 'Clocked In!', description: 'Start earning points!' });
  };

   const handleClockOut = async () => {
    if (!currentSpace || !clockInStartTime) return;
    const now = new Date();
    setIsClockedIn(false);
    const timeDifference = now.getTime() - clockInStartTime.getTime();
    const minutesClockedInThisSession = Math.floor(timeDifference / (1000 * 60));
    await addClockedTime(currentSpace.id, minutesClockedInThisSession);
    await addLogEntry({
      spaceId: currentSpace.id,
      actionName: 'Clock Out',
      points: 0,
      type: 'clockOut',
      clockInTime: clockInStartTime,
      clockOutTime: now,
      minutesClockedIn: minutesClockedInThisSession,
    });
    setClockInStartTime(null);
    setCurrentSessionElapsedTime(0);
    toast({ title: 'Clocked Out!', description: `Session time: ${minutesClockedInThisSession} min.` });
  };

   // Action Handling
   const handleActionClick = async (action: Action, multiplier: number) => {
    if (!isClockedIn) {
      toast({ title: 'Not Clocked In!', description: 'Clock in first.', variant: 'destructive' });
      return;
    }
    if (!currentSpace) return;
    const pointsEarned = action.points * multiplier;
    await addLogEntry({ spaceId: currentSpace.id, actionName: `${action.name} (x${multiplier})`, points: pointsEarned, type: 'action' });
    toast({ title: 'Action Logged!', description: `Earned ${pointsEarned} points.` });
  };

  const handleSaveAction = async () => {
    if (!currentSpace || !newActionName.trim()) return;
    const points = Number(newActionPoints) || 1;
    const success = await createAction({ spaceId: currentSpace.id, name: newActionName.trim(), description: newActionDescription.trim(), points });
    if (success) {
      setNewActionName(''); setNewActionDescription(''); setNewActionPoints(1); setIsCreateActionModalOpen(false);
       toast({ title: 'Action Created!', description: `Action "${newActionName.trim()}" added.` });
    }
  };

   // Multi-Step Action Handling
    const handleSaveMultiStepAction = async () => {
        if (!currentSpace || !newMultiStepActionName.trim() || newMultiStepActionSteps.some(s => !s.trim())) {
             toast({ title: "Validation Error", description: "Action name and all steps required.", variant: "destructive" });
            return;
        }
        const points = Number(newMultiStepActionPoints) || 1;
        const stepsData = newMultiStepActionSteps.map(name => ({ name: name.trim() }));
        const success = await createMultiStepAction({ spaceId: currentSpace.id, name: newMultiStepActionName.trim(), description: newMultiStepActionDescription.trim(), pointsPerStep: points, steps: stepsData });
        if (success) {
            setNewMultiStepActionName(''); setNewMultiStepActionDescription(''); setNewMultiStepActionPoints(1); setNewMultiStepActionSteps(['']); setIsCreateMultiStepActionModalOpen(false);
            toast({ title: 'Multi-Step Action Created!', description: `Action "${newMultiStepActionName.trim()}" added.` });
        }
    };

     const handleMultiStepActionClick = async (action: MultiStepAction) => {
        if (!isClockedIn) {
            toast({ title: 'Not Clocked In!', description: 'Clock in first.', variant: 'destructive' }); return;
        }
        if (action.currentStepIndex >= action.steps.length) {
            toast({ title: 'Action Complete', variant: "default" }); return;
        }
        await completeMultiStepActionStep(action.id);
    };

     const handleStepNameChange = (index: number, value: string) => {
        const updatedSteps = [...newMultiStepActionSteps]; updatedSteps[index] = value; setNewMultiStepActionSteps(updatedSteps);
    };
    const addStepInput = () => setNewMultiStepActionSteps([...newMultiStepActionSteps, '']);
    const removeStepInput = (index: number) => {
        if (newMultiStepActionSteps.length > 1) setNewMultiStepActionSteps(newMultiStepActionSteps.filter((_, i) => i !== index));
    };

   // Waste Handling
   const handleAddWasteClick = () => setIsAddWasteModalOpen(true);
   const handleWasteCategoryClick = (categoryId: string) => setSelectedWasteCategories(prev => prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]);
   const handleSaveWaste = async () => {
    if (!currentSpace || selectedWasteCategories.length === 0) return;
    const added = await addWasteEntries(currentSpace.id, selectedWasteCategories);
    if (added.length > 0) {
         toast({ title: 'Waste Added!', description: `Added ${added.length} waste entr${added.length > 1 ? 'ies' : 'y'}.` });
        setSelectedWasteCategories([]); setIsAddWasteModalOpen(false);
    }
   };

   // Comment Image Handling
    const handleCommentFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        handleImageUploadUtil(event, setNewCommentImage);
    };
    const triggerCommentUpload = () => commentFileInputRef.current?.click();
    const handleCommentCapture = (dataUrl: string) => {
        setNewCommentImage(dataUrl);
        setShowCommentCamera(false);
    };

   // Comment Handling
   const handleAddComment = async () => {
    if (!currentSpace || (!newCommentText.trim() && !newCommentImage)) {
         toast({ title: "Validation Error", description: "Comment needs text or image.", variant: "destructive" }); return;
    }
    const success = await addComment({ spaceId: currentSpace.id, text: newCommentText.trim(), imageUrl: newCommentImage });
    if (success) {
        setNewCommentText(''); setNewCommentImage(null);
         toast({ title: "Comment Added" });
    }
   };

   // --- Render Logic ---
   if (isLoading && !currentSpace) {
    return <div className="flex flex-col items-center justify-start min-h-screen py-4 bg-background p-2"> {/* Loading Skeleton */}
        <Skeleton className="h-10 w-3/4 max-w-lg mb-2" /> <Skeleton className="h-8 w-1/2 max-w-md mb-4" />
        <div className="w-full max-w-4xl space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-40 w-full" /><Skeleton className="h-32 w-full" /><Skeleton className="h-20 w-full" /></div>
    </div>;
  }
  if (error) {
    return <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-destructive"> {/* Error State */}
        <h2 className="text-xl mb-2">Error Loading Space</h2> <p className="mb-4">{error}</p> <Button onClick={handleBack} variant="outline">Back</Button>
    </div>;
  }
  if (!currentSpace) {
    return <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-muted-foreground"> {/* Not Found */}
        <h2 className="text-xl mb-4">Space not found.</h2> <Button onClick={handleBack} variant="outline">Back</Button>
    </div>;
  }

  // Main Render
  return (
    <div className="flex flex-col items-center justify-start min-h-screen py-2 bg-background p-2">
      {/* Header */}
       <Card className="w-full max-w-4xl mb-2 card-shadow">
          <CardHeader className="p-2 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold truncate flex-1 mr-2">{currentSpace.name}</CardTitle>
              <Button size="sm" variant="ghost" onClick={handleBack} className="text-xs">Back</Button>
          </CardHeader>
      </Card>

      {/* Dashboard */}
      <Card className="w-full max-w-4xl mb-2 card-shadow">
          <CardContent className="p-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-x-2 gap-y-1 text-xs items-center">
              <div className="flex items-center justify-center"> {/* Clock In/Out */}
                 {!isClockedIn ? <Button variant="outline" size="sm" onClick={handleClockIn} className="text-xs w-full">Clock In</Button> : <Button variant="destructive" size="sm" onClick={handleClockOut} className="text-xs w-full">Clock Out</Button>}
             </div>
             <div className="text-center"><span className="font-semibold">Session:</span><br/>{formatElapsedTime(currentSessionElapsedTime)}</div>
             <div className="text-center"><span className="font-semibold">Total:</span><br/>{currentSpace.totalClockedInTime} min</div>
             <div className="text-center"><span className="font-semibold">AP:</span><br/>{totalPoints.toFixed(0)}</div>
             <div className="text-center"><span className="font-semibold">AP/H:</span><br/>{apPerCurrentSessionHour.toFixed(1)}</div>
             <div className="text-center"><span className="font-semibold">Waste:</span><br/>{totalWastePoints}</div>
          </CardContent>
      </Card>

       {/* Actions Section */}
       <div className="mt-2 w-full max-w-4xl">
            <h2 className="text-base font-bold mb-1">Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                 {/* Regular Actions */}
                 {actions.map((action) => (
                     <div key={action.id} className="flex space-x-1">
                        <Button variant="secondary" size="sm" onClick={() => handleActionClick(action, 1)} disabled={!isClockedIn} className="text-xs flex-1"> {action.name} <span className="ml-auto pl-1">(+{action.points})</span> </Button>
                        <Button variant="secondary" size="sm" onClick={() => handleActionClick(action, 2)} disabled={!isClockedIn} className="text-xs w-8">x2</Button>
                        <Button variant="secondary" size="sm" onClick={() => handleActionClick(action, 5)} disabled={!isClockedIn} className="text-xs w-8">x5</Button>
                        <Button variant="secondary" size="sm" onClick={() => handleActionClick(action, 10)} disabled={!isClockedIn} className="text-xs w-8">x10</Button>
                     </div>
                ))}
                 {/* Multi-Step Actions */}
                 {multiStepActions.map((action) => (
                     <div key={action.id}>
                         <Button variant="outline" size="sm" onClick={() => handleMultiStepActionClick(action)} disabled={!isClockedIn || action.currentStepIndex >= action.steps.length} className={`text-xs w-full justify-start ${action.currentStepIndex >= action.steps.length ? 'line-through' : ''}`}>
                            {action.name} <span className="ml-auto text-muted-foreground">{action.currentStepIndex >= action.steps.length ? `(Done)` : `(${action.currentStepIndex + 1}/${action.steps.length})`}</span>
                         </Button>
                     </div>
                 ))}
            </div>
             <div className="flex gap-1 mt-1"> {/* Create Action Buttons */}
                <Button className="flex-1" size="sm" onClick={() => setIsCreateActionModalOpen(true)}> + Simple </Button>
                <Button className="flex-1" size="sm" onClick={() => setIsCreateMultiStepActionModalOpen(true)}> + Multi-Step </Button>
            </div>
       </div>

       {/* To-Do List / Gallery Component */}
       <TodoListComponent spaceId={spaceId} />

      {/* Waste Tracking */}
      <div className="mt-3 w-full max-w-4xl">
        <div className="flex justify-between items-center mb-1">
             <h2 className="text-base font-bold">Waste</h2>
             <Button size="sm" onClick={handleAddWasteClick}>Add Waste</Button>
        </div>
        <div className="text-xs text-muted-foreground">
             {wasteEntries.length > 0 ? (
                <> <span>Latest: {wasteEntries[0].type} ({formatTime(wasteEntries[0].timestamp)})</span> <Button variant="link" size="sm" className="text-xs h-auto px-1 py-0 ml-1" onClick={() => setIsWasteDetailsOpen(true)}>(See All)</Button> </>
            ) : ( <span>No waste entries yet.</span> )}
            <span className="ml-2">| Total Points: {totalWastePoints}</span>
        </div>
      </div>

      {/* Log */}
      <div className="mt-3 w-full max-w-4xl">
         <div className="flex justify-between items-center mb-1">
            <h2 className="text-base font-bold">Log</h2>
             <Button variant="link" size="sm" className="text-xs h-auto px-1 py-0" onClick={() => setIsLogDetailsOpen(true)} disabled={logEntries.length === 0}> See All ({logEntries.length}) </Button>
        </div>
         <div className="text-xs text-muted-foreground">
            {logEntries.length > 0 ? (
                <span> Latest: {logEntries[0].actionName} at {formatTime(logEntries[0].timestamp)} {logEntries[0].points > 0 ? ` (+${logEntries[0].points} AP)` : ''} {logEntries[0].type === 'clockOut' && logEntries[0].minutesClockedIn !== undefined ? ` (${logEntries[0].minutesClockedIn} min)`: ''} </span>
            ) : ( <span>No log entries yet.</span> )}
         </div>
      </div>

      {/* Comments */}
      <div className="mt-3 w-full max-w-4xl">
        <div className="flex justify-between items-center mb-1">
             <h2 className="text-base font-bold">Comments</h2>
             <Button variant="link" size="sm" className="text-xs h-auto px-1 py-0" onClick={() => setIsCommentDetailsOpen(true)} disabled={comments.length === 0}> See All ({comments.length}) </Button>
        </div>
         <div className="text-xs text-muted-foreground mb-1">
            {comments.length > 0 ? ( <span>Latest: {comments[0].text.substring(0, 40)}{comments[0].text.length > 40 ? '...' : ''} ({formatTime(comments[0].timestamp)})</span> ) : ( <span>No comments yet.</span> )}
         </div>
        <div className="flex flex-col sm:flex-row gap-1 mt-1"> {/* Comment Input */}
             <Textarea id="comment" className="flex-grow p-1 border rounded text-foreground text-xs min-h-[40px] h-10 sm:h-auto" placeholder="Add a comment..." value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} />
              <div className="flex flex-col gap-1 w-full sm:w-auto items-stretch">
                {newCommentImage ? (
                     <div className="relative">
                         <img src={newCommentImage} alt="Comment Preview" className="rounded max-h-20 object-cover self-center sm:self-start" />
                         <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 bg-white/70 hover:bg-white" onClick={() => setNewCommentImage(null)}>
                            <CloseIcon className="h-4 w-4 text-destructive" />
                        </Button>
                     </div>
                 ) : (
                     <div className="flex gap-1">
                         <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={triggerCommentUpload}> <Upload className="mr-1 h-3 w-3" /> Pic </Button>
                         <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => setShowCommentCamera(true)}> <Camera className="mr-1 h-3 w-3" /> Cam </Button>
                     </div>
                 )}
                 <Button onClick={handleAddComment} size="sm" className="text-xs h-8 w-full" disabled={isLoading || (!newCommentText.trim() && !newCommentImage)}> Add Comment </Button>
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
      </div>

       {/* Modals */}
         <Dialog open={isCreateActionModalOpen} onOpenChange={setIsCreateActionModalOpen}> {/* Create Simple Action */}
            <DialogContent> <DialogHeader><DialogTitle>Create Simple Action</DialogTitle><DialogDescription>Define action and points.</DialogDescription></DialogHeader>
            <div className="grid gap-4 py-4">
                <div><Label htmlFor="action-name">Name *</Label><Input id="action-name" value={newActionName} onChange={(e) => setNewActionName(e.target.value)} placeholder="e.g., Process Inbox" /></div>
                <div><Label htmlFor="action-desc">Description</Label><Textarea id="action-desc" value={newActionDescription} onChange={(e) => setNewActionDescription(e.target.value)} placeholder="(Optional)"/></div>
                <div><Label htmlFor="action-points">Points *</Label><Input id="action-points" type="number" min="1" value={newActionPoints} onChange={(e) => setNewActionPoints(e.target.value)} placeholder="e.g., 5"/></div>
            </div>
            <DialogFooter><DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose><Button type="button" onClick={handleSaveAction} disabled={isLoading || !newActionName.trim()}>Create</Button></DialogFooter>
            </DialogContent>
        </Dialog>
        <Dialog open={isCreateMultiStepActionModalOpen} onOpenChange={setIsCreateMultiStepActionModalOpen}> {/* Create Multi-Step Action */}
            <DialogContent className="sm:max-w-[500px]"> <DialogHeader><DialogTitle>Create Multi-Step Action</DialogTitle><DialogDescription>Define sequential steps. Points per step.</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-4">
                    <div><Label htmlFor="multi-action-name">Action Name *</Label><Input id="multi-action-name" value={newMultiStepActionName} onChange={(e) => setNewMultiStepActionName(e.target.value)} placeholder="e.g., Weekly Review"/></div>
                    <div><Label htmlFor="multi-action-desc">Description</Label><Textarea id="multi-action-desc" value={newMultiStepActionDescription} onChange={(e) => setNewMultiStepActionDescription(e.target.value)} placeholder="(Optional)" /></div>
                    <div><Label htmlFor="multi-action-points">Points per Step *</Label><Input id="multi-action-points" type="number" min="1" value={newMultiStepActionPoints} onChange={(e) => setNewMultiStepActionPoints(e.target.value)} placeholder="e.g., 10"/></div>
                     <div><Label>Steps *</Label><div className="space-y-2"> {newMultiStepActionSteps.map((step, index) => (<div key={index} className="flex items-center gap-2"> <Input type="text" value={step} onChange={(e) => handleStepNameChange(index, e.target.value)} placeholder={`Step ${index + 1} Name`} className="flex-grow"/> {newMultiStepActionSteps.length > 1 && (<Button variant="ghost" size="sm" onClick={() => removeStepInput(index)} aria-label="Remove step">X</Button>)} </div>))} <Button type="button" variant="outline" size="sm" onClick={addStepInput}>+ Add Step</Button> </div></div>
                </div>
                <DialogFooter><DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose><Button type="button" onClick={handleSaveMultiStepAction} disabled={isLoading || !newMultiStepActionName.trim() || newMultiStepActionSteps.some(s => !s.trim())}> Create </Button></DialogFooter>
            </DialogContent>
        </Dialog>
        <Dialog open={isAddWasteModalOpen} onOpenChange={setIsAddWasteModalOpen}> {/* Add Waste */}
            <DialogContent> <DialogHeader><DialogTitle>Add Waste (TIMWOODS)</DialogTitle><DialogDescription>Select observed waste categories.</DialogDescription></DialogHeader>
            <ScrollArea className="max-h-60"> <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-1"> {timwoodsCategories.map((category) => (<Button key={category.id} variant={selectedWasteCategories.includes(category.id) ? 'default' : 'outline'} onClick={() => handleWasteCategoryClick(category.id)} size="sm" className="text-xs h-auto py-2 flex flex-col items-start"> <span className="font-semibold">{category.name} (+{category.points})</span> <span className="text-xs text-muted-foreground font-normal">{category.description}</span> </Button>))} </div> </ScrollArea>
            <DialogFooter><DialogClose asChild><Button type="button" variant="secondary" onClick={() => setSelectedWasteCategories([])}>Cancel</Button></DialogClose><Button type="button" onClick={handleSaveWaste} disabled={isLoading || selectedWasteCategories.length === 0}>Add Selected Waste</Button></DialogFooter>
            </DialogContent>
        </Dialog>
       <Dialog open={isLogDetailsOpen} onOpenChange={setIsLogDetailsOpen}> {/* Log Details */}
          <DialogContent className="max-w-md sm:max-w-lg md:max-w-xl"> <DialogHeader><DialogTitle>Log Details</DialogTitle><DialogDescription>All recorded events, newest first.</DialogDescription></DialogHeader>
              <ScrollArea className="max-h-[60vh] border rounded-md"> <div className="p-2 space-y-1">
                     {logEntries.length === 0 && <p className="text-muted-foreground text-sm text-center p-4">No log entries yet.</p>}
                     {logEntries.map((logEntry) => {
                          let detail = logEntry.type === 'action' ? `Completed: ${logEntry.actionName}` : logEntry.type === 'multiStepAction' ? `Step ${logEntry.stepIndex !== undefined ? logEntry.stepIndex + 1 : '?'} of '${logEntry.actionName}' completed` : logEntry.type === 'clockIn' ? `Clocked In` : logEntry.type === 'clockOut' && logEntry.clockInTime && logEntry.minutesClockedIn !== undefined ? `Clocked Out (Session: ${logEntry.minutesClockedIn} min)` : `Clocked Out`;
                          return <div key={logEntry.id} className="text-xs p-1 border-b last:border-b-0"> <span className="font-mono text-muted-foreground mr-2">[{format(logEntry.timestamp, 'MM/dd HH:mm:ss')}]</span> <span>{detail}</span> {logEntry.points > 0 && <span className="font-semibold text-primary ml-2">(+{logEntry.points} AP)</span>} </div>;
                      })}
                  </div> </ScrollArea>
              <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose></DialogFooter>
          </DialogContent>
       </Dialog>
        <Dialog open={isWasteDetailsOpen} onOpenChange={setIsWasteDetailsOpen}> {/* Waste Details */}
          <DialogContent className="max-w-md"> <DialogHeader><DialogTitle>Waste Details</DialogTitle><DialogDescription>All waste entries, newest first. Total: {totalWastePoints} pts</DialogDescription></DialogHeader>
              <ScrollArea className="max-h-[60vh] border rounded-md"> <div className="p-2 space-y-1">
                    {wasteEntries.length === 0 && <p className="text-muted-foreground text-sm text-center p-4">No waste entries yet.</p>}
                    {wasteEntries.map((wasteEntry) => (<div key={wasteEntry.id} className="text-xs p-1 border-b last:border-b-0"> <span className="font-mono text-muted-foreground mr-2">[{format(wasteEntry.timestamp, 'MM/dd HH:mm:ss')}]</span> <span>{wasteEntry.type}</span> <span className="font-semibold text-destructive ml-2">({wasteEntry.points} pts)</span> </div>))}
                  </div> </ScrollArea>
               <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose></DialogFooter>
          </DialogContent>
      </Dialog>
       <Dialog open={isCommentDetailsOpen} onOpenChange={setIsCommentDetailsOpen}> {/* Comment Details */}
          <DialogContent className="max-w-md sm:max-w-lg"> <DialogHeader><DialogTitle>Comments</DialogTitle><DialogDescription>All comments, newest first.</DialogDescription></DialogHeader>
              <ScrollArea className="max-h-[60vh] border rounded-md"> <div className="p-2 space-y-2">
                    {comments.length === 0 && <p className="text-muted-foreground text-sm text-center p-4">No comments yet.</p>}
                    {comments.map((comment) => (<Card key={comment.id} className="bg-card shadow-sm text-xs"> <CardContent className="p-2"> <p className="text-xs text-muted-foreground mb-1">{format(comment.timestamp, 'MMM dd, yyyy hh:mm a')}</p> {comment.imageUrl && <img src={comment.imageUrl} alt="Comment Image" className="rounded-md my-1 max-h-40 object-cover"/>} <p className="text-foreground whitespace-pre-wrap">{comment.text}</p> </CardContent> </Card>))}
                  </div> </ScrollArea>
              <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose></DialogFooter>
          </DialogContent>
      </Dialog>

       {/* Comment Camera Capture */}
        {showCommentCamera && (
            <CameraCapture
                onCapture={handleCommentCapture}
                onClose={() => setShowCommentCamera(false)}
            />
        )}

    </div>
  );
}

    