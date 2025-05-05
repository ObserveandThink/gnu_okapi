/**
 * @fileOverview Gamified view for a specific Space, replicating core functionality.
 */
'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useSpaceContext } from '@/contexts/SpaceContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Camera, Trash2, Edit, Upload, X as CloseIcon, LogIn, LogOut, Plus, Trash, MessageSquare, Images, ListTodo, AlertCircle } from 'lucide-react';
import { formatElapsedTime, formatTime, formatShortDate, formatDateTime } from '@/utils/dateUtils';
import { toast } from '@/hooks/use-toast';
import { handleImageUploadUtil } from '@/utils/imageUtils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Import Domain Models
import type { Action } from '@/core/domain/Action';
import type { MultiStepAction, ActionStep } from '@/core/domain/MultiStepAction';
import type { LogEntry } from '@/core/domain/LogEntry';
import type { WasteEntry } from '@/core/domain/WasteEntry';
import type { Comment } from '@/core/domain/Comment';
import type { TodoItem } from '@/core/domain/TodoItem';

// Re-use CameraCapture component logic (could be imported if refactored)
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
        return () => {
            stream?.getTracks().forEach(track => track.stop());
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            if (context) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg');
                onCapture(dataUrl);
                onClose();
            }
        }
    };

    return (
         <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-[100] p-4">
             <div className="bg-background rounded-lg p-4 max-w-lg w-full relative shadow-xl border border-border">
                 <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-10 text-muted-foreground hover:text-foreground" onClick={onClose}>
                    <CloseIcon className="h-5 w-5" />
                </Button>
                <h2 className="text-xl font-bold mb-4 text-center text-primary">Camera Capture</h2>
                <div className="relative aspect-video w-full mb-4 overflow-hidden rounded-lg border border-border">
                   <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                   <canvas ref={canvasRef} className="hidden" />
                </div>
                 {hasCameraPermission === false && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4"/>
                        <AlertTitle>Camera Access Required</AlertTitle>
                        <AlertDescription>
                            Enable camera permissions and refresh.
                        </AlertDescription>
                    </Alert>
                )}
                 {hasCameraPermission === true && (
                     <Button onClick={handleCapture} className="w-full text-lg py-3 bg-green-600 hover:bg-green-700 text-white" disabled={!stream}>
                        <Camera className="mr-2 h-5 w-5" /> Capture Image
                    </Button>
                 )}
                 {hasCameraPermission === null && (
                     <p className="text-center text-muted-foreground italic">Requesting camera access...</p>
                 )}
            </div>
        </div>
    );
};

// Re-use TodoListComponent logic (could be imported if refactored)
const TodoListComponent: React.FC<{ spaceId: string, isGameMode?: boolean }> = ({ spaceId, isGameMode = false }) => {
    const { todos, isLoading, error, createTodoItem, updateTodoItem, deleteTodoItem } = useSpaceContext();
    const [isAddTodoModalOpen, setIsAddTodoModalOpen] = useState(false);
    const [isEditTodoModalOpen, setIsEditTodoModalOpen] = useState(false);
    const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
    const [description, setDescription] = useState('');
    const [beforeImage, setBeforeImage] = useState<string | null>(null);
    const [afterImage, setAfterImage] = useState<string | null>(null);
    const [showCamera, setShowCamera] = useState<false | 'before' | 'after'>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadTarget, setUploadTarget] = useState<'before' | 'after' | null>(null);

    const openAddModal = () => { setDescription(''); setBeforeImage(null); setAfterImage(null); setIsAddTodoModalOpen(true); };
    const openEditModal = (item: TodoItem) => { setEditingTodo(item); setDescription(item.description); setBeforeImage(item.beforeImage || null); setAfterImage(item.afterImage || null); setIsEditTodoModalOpen(true); };
    const closeModal = () => { setIsAddTodoModalOpen(false); setIsEditTodoModalOpen(false); setEditingTodo(null); setDescription(''); setBeforeImage(null); setAfterImage(null); setShowCamera(false); setUploadTarget(null); };
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => { if (uploadTarget) { handleImageUploadUtil(event, uploadTarget === 'before' ? setBeforeImage : setAfterImage); } setUploadTarget(null); };
    const triggerFileUpload = (target: 'before' | 'after') => { setUploadTarget(target); fileInputRef.current?.click(); };
    const openCamera = (target: 'before' | 'after') => { setShowCamera(target); };
    const handleCapture = (dataUrl: string) => { if (showCamera === 'before') { setBeforeImage(dataUrl); } else if (showCamera === 'after') { setAfterImage(dataUrl); } setShowCamera(false); };

    const handleSave = async () => {
        if (isLoading) return;
        const trimmedDesc = description.trim();
        if (!trimmedDesc) { toast({ title: "Validation Error", description: "Description is required.", variant: "destructive" }); return; }

        if (editingTodo) {
            await updateTodoItem({ ...editingTodo, description: trimmedDesc, beforeImage: beforeImage, afterImage: afterImage });
        } else {
            if (!beforeImage) { toast({ title: "Validation Error", description: "Before image is required.", variant: "destructive" }); return; }
            await createTodoItem({ spaceId, description: trimmedDesc, beforeImage: beforeImage, afterImage: afterImage });
        }
        closeModal();
    };
    const handleDelete = async (id: string) => { await deleteTodoItem(id); };

    const cardClass = isGameMode ? "bg-white/10 backdrop-blur-sm border-white/20 text-white" : "bg-card";
    const buttonClass = isGameMode ? "bg-blue-500 hover:bg-blue-600 text-white" : "";
    const textClass = isGameMode ? "text-white" : "text-foreground";
    const mutedTextClass = isGameMode ? "text-white/70" : "text-muted-foreground";

    return (
        <div className={`mt-4 w-full ${isGameMode ? 'p-4 rounded-lg bg-black/30' : ''}`}>
            <div className="flex justify-between items-center mb-3">
                <h2 className={`text-xl font-bold ${textClass}`}>Task Gallery</h2>
                <Button onClick={openAddModal} size="sm" className={`${buttonClass} text-xs h-8 shadow-md`}>
                    <Plus className="mr-1 h-4 w-4" /> Add Task
                </Button>
            </div>

             {isLoading && todos.length === 0 && <Skeleton className="h-40 w-full mt-3 bg-muted/50" />}
             {error && todos.length === 0 && <p className="text-destructive text-sm mt-2 italic">Error loading tasks: {error}</p>}
             {todos.length === 0 && !isLoading && !error && <p className={`text-sm ${mutedTextClass} text-center py-4 italic`}>No tasks yet. Add your first visual task!</p>}

             {todos.length > 0 && (
                 <ScrollArea className="h-auto max-h-[40vh] pr-3">
                     <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                         {todos.map((item) => (
                            <Card key={item.id} className={`${cardClass} overflow-hidden group relative shadow-lg border rounded-lg`}>
                                <CardContent className="p-2 space-y-1">
                                    {item.beforeImage && <img src={item.beforeImage} alt="Before" className="w-full h-28 object-cover rounded-md mb-1 border border-white/10"/>}
                                    {item.afterImage && <img src={item.afterImage} alt="After" className="w-full h-28 object-cover rounded-md border border-white/10"/>}
                                    <p className={`text-sm font-semibold truncate ${textClass}`} title={item.description}>{item.description}</p>
                                    <p className={`text-xs ${mutedTextClass}`}>{formatShortDate(item.dateCreated)}</p>
                                </CardContent>
                                <div className="absolute inset-0 bg-black/50 group-hover:bg-black/70 transition-opacity flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                    <Button variant="outline" size="icon" className="h-8 w-8 bg-white/80 hover:bg-white text-primary" onClick={() => openEditModal(item)}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </Card>
                         ))}
                     </div>
                 </ScrollArea>
            )}

            {/* Add/Edit Modal */}
             <Dialog open={isAddTodoModalOpen || isEditTodoModalOpen} onOpenChange={closeModal}>
                 <DialogContent className={isGameMode ? "bg-gradient-to-br from-gray-800 to-black border-white/20 text-white" : ""}>
                     <DialogHeader>
                         <DialogTitle className={`text-2xl font-bold ${isGameMode ? 'text-yellow-400' : 'text-primary'}`}>{editingTodo ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                     </DialogHeader>
                     <div className="grid gap-5 py-4">
                         <div>
                             <Label htmlFor="todo-desc" className={`text-sm font-medium ${isGameMode ? 'text-blue-300' : ''}`}>Description *</Label>
                             <Input id="todo-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What needs improvement?" className={`${isGameMode ? 'bg-white/10 border-white/30 text-white placeholder:text-white/50' : ''}`}/>
                         </div>
                         {/* Before Image */}
                         <div className="space-y-2">
                             <Label className={`text-sm font-medium ${isGameMode ? 'text-blue-300' : ''}`}>Before Image {editingTodo ? '' : '*'}</Label>
                             {beforeImage ? (
                                <div className="relative"><img src={beforeImage} alt="Before preview" className="rounded max-h-40 object-cover w-full border border-white/20"/>
                                    <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 bg-black/50 hover:bg-black/70 text-red-400 hover:text-red-300" onClick={() => setBeforeImage(null)}><CloseIcon className="h-4 w-4" /></Button>
                                </div>
                             ) : (
                                <div className="flex gap-2">
                                    <Button variant="outline" className={`flex-1 ${isGameMode ? 'bg-white/10 border-white/30 text-white hover:bg-white/20' : ''}`} onClick={() => triggerFileUpload('before')}><Upload className="mr-2 h-4 w-4" /> Upload</Button>
                                    <Button variant="outline" className={`flex-1 ${isGameMode ? 'bg-white/10 border-white/30 text-white hover:bg-white/20' : ''}`} onClick={() => openCamera('before')}><Camera className="mr-2 h-4 w-4" /> Camera</Button>
                                </div>
                             )}
                         </div>
                         {/* After Image */}
                         <div className="space-y-2">
                              <Label className={`text-sm font-medium ${isGameMode ? 'text-blue-300' : ''}`}>After Image</Label>
                              {afterImage ? (
                                 <div className="relative"><img src={afterImage} alt="After preview" className="rounded max-h-40 object-cover w-full border border-white/20"/>
                                     <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 bg-black/50 hover:bg-black/70 text-red-400 hover:text-red-300" onClick={() => setAfterImage(null)}><CloseIcon className="h-4 w-4" /></Button>
                                 </div>
                              ) : (
                                 <div className="flex gap-2">
                                     <Button variant="outline" className={`flex-1 ${isGameMode ? 'bg-white/10 border-white/30 text-white hover:bg-white/20' : ''}`} onClick={() => triggerFileUpload('after')}><Upload className="mr-2 h-4 w-4" /> Upload</Button>
                                     <Button variant="outline" className={`flex-1 ${isGameMode ? 'bg-white/10 border-white/30 text-white hover:bg-white/20' : ''}`} onClick={() => openCamera('after')}><Camera className="mr-2 h-4 w-4" /> Camera</Button>
                                 </div>
                              )}
                          </div>
                     </div>
                     <DialogFooter>
                         <Button type="button" variant="secondary" onClick={closeModal} className={isGameMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : ''}>Cancel</Button>
                         <Button type="button" onClick={handleSave} disabled={isLoading || !description.trim() || (!editingTodo && !beforeImage)} className={`${isGameMode ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}>
                             {isLoading ? 'Saving...' : (editingTodo ? 'Save Changes' : 'Add Task')}
                         </Button>
                     </DialogFooter>
                 </DialogContent>
             </Dialog>
             <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden"/>
             {showCamera && <CameraCapture onCapture={handleCapture} onClose={() => setShowCamera(false)} />}
        </div>
    );
};

// TIMWOODS Categories (Keep definition consistent)
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

export default function GameSpacePage() {
  const params = useParams();
  const spaceId = params.spaceId as string;
  const router = useRouter();
  const {
      currentSpace,
      actions,
      multiStepActions,
      logEntries,
      wasteEntries,
      comments,
      todos, // Ensure todos are available
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
      // Todo functions are used by TodoListComponent
  } = useSpaceContext();

  // UI State for Game Page
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInStartTime, setClockInStartTime] = useState<Date | null>(null);
  const [currentSessionElapsedTime, setCurrentSessionElapsedTime] = useState(0);
  const [timerIntervalId, setTimerIntervalId] = useState<NodeJS.Timeout | null>(null);

  // Modals state
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

   // Camera/Upload state for comments
   const [showCommentCamera, setShowCommentCamera] = useState(false);
   const commentFileInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---
  useEffect(() => {
    if (spaceId) {
      loadSpaceDetails(spaceId);
    }
    // Check local storage for clock-in state (example - adapt as needed)
     const storedClockInTime = localStorage.getItem(`clockInTime-${spaceId}`);
     if (storedClockInTime) {
         const startTime = new Date(storedClockInTime);
         setClockInStartTime(startTime);
         setIsClockedIn(true);
     }

    return () => {
      if (timerIntervalId) clearInterval(timerIntervalId);
      // Don't clearCurrentSpace here if user might navigate back quickly
    };
   // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, loadSpaceDetails]); // Keep loadSpaceDetails

   // Timer effect
   useEffect(() => {
    if (isClockedIn && clockInStartTime) {
        const intervalId = setInterval(() => {
            setCurrentSessionElapsedTime(Math.floor((new Date().getTime() - clockInStartTime.getTime()) / 1000));
        }, 1000);
        setTimerIntervalId(intervalId);
        return () => clearInterval(intervalId);
    } else {
        setCurrentSessionElapsedTime(0);
        if (timerIntervalId) clearInterval(timerIntervalId);
    }
  }, [isClockedIn, clockInStartTime]);


  // --- Calculated Values (Game Mode Styling) ---
  const totalPoints = useMemo(() => logEntries.reduce((sum, entry) => sum + entry.points, 0), [logEntries]);
  const totalWastePoints = useMemo(() => wasteEntries.reduce((sum, entry) => sum + entry.points, 0), [wasteEntries]);
  const apPerCurrentSessionHour = useMemo(() => {
    if (!isClockedIn || !clockInStartTime || currentSessionElapsedTime <= 0) return 0;
    const sessionPoints = logEntries
        .filter(e => e.timestamp >= clockInStartTime && e.points > 0)
        .reduce((sum, e) => sum + e.points, 0);
    const sessionHours = currentSessionElapsedTime / 3600;
    return sessionHours > 0 ? sessionPoints / sessionHours : 0;
  }, [logEntries, isClockedIn, clockInStartTime, currentSessionElapsedTime]);

  // --- Event Handlers (Game Mode Styling) ---
  const handleBackToSpace = () => router.push(`/space/${spaceId}`); // Or home '/'

  const handleClockIn = async () => {
    if (!currentSpace) return;
    const now = new Date();
    setIsClockedIn(true);
    setClockInStartTime(now);
    localStorage.setItem(`clockInTime-${spaceId}`, now.toISOString()); // Persist clock-in time
    await addLogEntry({ spaceId: currentSpace.id, actionName: 'Clock In (Game)', points: 0, type: 'clockIn' });
    toast({ title: 'Session Started!', description: 'Let the improvements begin!', className: 'bg-green-600 text-white border-green-700' });
  };

  const handleClockOut = async () => {
    if (!currentSpace || !clockInStartTime) return;
    const now = new Date();
    setIsClockedIn(false);
    localStorage.removeItem(`clockInTime-${spaceId}`); // Clear persisted time
    const minutesClocked = Math.floor((now.getTime() - clockInStartTime.getTime()) / (1000 * 60));
    await addClockedTime(currentSpace.id, minutesClocked);
    await addLogEntry({
      spaceId: currentSpace.id,
      actionName: 'Clock Out (Game)',
      points: 0,
      type: 'clockOut',
      clockInTime: clockInStartTime,
      clockOutTime: now,
      minutesClockedIn: minutesClocked,
    });
    setClockInStartTime(null);
    toast({ title: 'Session Ended!', description: `Time: ${minutesClocked} min. Great work!`, className: 'bg-blue-600 text-white border-blue-700' });
  };

   const handleActionClick = async (action: Action, multiplier: number) => {
     if (!isClockedIn) { toast({ title: 'Clock In First!', description: 'Start your session to log actions.', variant: 'destructive' }); return; }
     if (!currentSpace) return;
     const pointsEarned = action.points * multiplier;
     await addLogEntry({ spaceId: currentSpace.id, actionName: `${action.name} (x${multiplier})`, points: pointsEarned, type: 'action' });
     toast({ title: `+${pointsEarned} AP!`, description: `Logged: ${action.name} (x${multiplier})`, className: 'bg-yellow-500 text-black border-yellow-600' });
   };

   const handleMultiStepActionClick = async (action: MultiStepAction) => {
     if (!isClockedIn) { toast({ title: 'Clock In First!', variant: 'destructive' }); return; }
     if (action.currentStepIndex >= action.steps.length) { toast({ title: 'Quest Complete!', className: 'bg-purple-600 text-white border-purple-700' }); return; }
     const updatedAction = await completeMultiStepActionStep(action.id);
      if (updatedAction) {
         const completedStepIndex = updatedAction.currentStepIndex - 1;
         if (completedStepIndex >= 0) {
             toast({
                 title: `+${updatedAction.pointsPerStep} AP!`,
                 description: `Step Complete: ${updatedAction.steps[completedStepIndex].name}`,
                 className: 'bg-indigo-600 text-white border-indigo-700'
             });
         }
      }
   };

   const handleSaveAction = async () => {
     if (!currentSpace || !newActionName.trim()) return;
     const points = Number(newActionPoints) || 1;
     const success = await createAction({ spaceId: currentSpace.id, name: newActionName.trim(), description: newActionDescription.trim(), points });
     if (success) {
       setNewActionName(''); setNewActionDescription(''); setNewActionPoints(1); setIsCreateActionModalOpen(false);
       toast({ title: 'New Action Added!', description: `"${newActionName.trim()}" is ready!`, className: 'bg-teal-500 text-white border-teal-600' });
     }
   };

    const handleSaveMultiStepAction = async () => {
         if (!currentSpace || !newMultiStepActionName.trim() || newMultiStepActionSteps.some(s => !s.trim())) {
             toast({ title: "Missing Info!", description: "Action name and all steps are required.", variant: "destructive" }); return;
         }
         const points = Number(newMultiStepActionPoints) || 1;
         const stepsData = newMultiStepActionSteps.map(name => ({ name: name.trim() }));
         const success = await createMultiStepAction({ spaceId: currentSpace.id, name: newMultiStepActionName.trim(), description: newMultiStepActionDescription.trim(), pointsPerStep: points, steps: stepsData });
         if (success) {
             setNewMultiStepActionName(''); setNewMultiStepActionDescription(''); setNewMultiStepActionPoints(1); setNewMultiStepActionSteps(['']); setIsCreateMultiStepActionModalOpen(false);
             toast({ title: 'New Quest Added!', description: `"${newMultiStepActionName.trim()}" is available!`, className: 'bg-cyan-500 text-white border-cyan-600'});
         }
     };
     const handleStepNameChange = (index: number, value: string) => { const updated = [...newMultiStepActionSteps]; updated[index] = value; setNewMultiStepActionSteps(updated); };
     const addStepInput = () => setNewMultiStepActionSteps([...newMultiStepActionSteps, '']);
     const removeStepInput = (index: number) => { if (newMultiStepActionSteps.length > 1) setNewMultiStepActionSteps(newMultiStepActionSteps.filter((_, i) => i !== index)); };

     const handleAddWasteClick = () => setIsAddWasteModalOpen(true);
     const handleWasteCategoryClick = (categoryId: string) => setSelectedWasteCategories(prev => prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]);
     const handleSaveWaste = async () => {
       if (!currentSpace || selectedWasteCategories.length === 0) return;
       const added = await addWasteEntries(currentSpace.id, selectedWasteCategories);
       if (added.length > 0) {
          const pointsLost = added.reduce((sum, e) => sum + e.points, 0);
          toast({ title: `-${pointsLost} WP!`, description: `Logged ${added.length} waste entr${added.length > 1 ? 'ies' : 'y'}.`, variant: 'destructive' });
          setSelectedWasteCategories([]); setIsAddWasteModalOpen(false);
       }
     };

    const handleCommentFileChange = (event: React.ChangeEvent<HTMLInputElement>) => handleImageUploadUtil(event, setNewCommentImage);
    const triggerCommentUpload = () => commentFileInputRef.current?.click();
    const handleCommentCapture = (dataUrl: string) => { setNewCommentImage(dataUrl); setShowCommentCamera(false); };
    const handleAddComment = async () => {
      if (!currentSpace || (!newCommentText.trim() && !newCommentImage)) { toast({ title: "Empty Comment", variant: "destructive" }); return; }
      const success = await addComment({ spaceId: currentSpace.id, text: newCommentText.trim(), imageUrl: newCommentImage });
      if (success) { setNewCommentText(''); setNewCommentImage(null); toast({ title: "Comment Logged!", className: 'bg-gray-700 text-white border-gray-800' }); }
    };


  // --- Render Logic ---
  if (isLoading && !currentSpace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-700 via-gray-900 to-black text-white">
        <Skeleton className="h-12 w-3/4 mb-6 bg-white/20" />
        <Skeleton className="h-64 w-full max-w-sm mb-8 bg-white/20" />
        <Skeleton className="h-16 w-48 bg-white/20" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-red-800 via-gray-900 to-black text-red-300">
        <h2 className="text-2xl mb-2 font-bold">Error Loading Game Data</h2>
        <p className="mb-4">{error}</p>
        <Button onClick={handleBackToSpace} variant="secondary" className="text-lg bg-white/20 hover:bg-white/30 text-white">
          Back to Space List
        </Button>
      </div>
    );
  }

  if (!currentSpace) {
    return (
       <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-700 via-gray-800 to-black text-gray-400">
        <h2 className="text-2xl mb-4 font-bold">Space not found.</h2>
        <Button onClick={() => router.push('/')} variant="secondary" className="text-lg bg-white/20 hover:bg-white/30 text-white">
          Go Home
        </Button>
      </div>
    );
  }

  // Main Game UI Render
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-purple-600 via-indigo-700 to-blue-800 text-white p-3 sm:p-4">
        {/* Header */}
        <header className="flex justify-between items-center mb-4">
            <Button onClick={handleBackToSpace} variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full">
            <ArrowLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold text-center flex-grow truncate px-2 sm:px-4">
                {currentSpace.name} - Quest Mode
            </h1>
            <div className="w-10"></div> {/* Spacer */}
        </header>

         {/* Dashboard */}
         <Card className="mb-4 bg-black/30 backdrop-blur-sm border border-white/20 shadow-lg">
             <CardContent className="p-2 grid grid-cols-3 sm:grid-cols-6 gap-x-2 gap-y-1 text-xs text-center items-center">
                 <div className="flex items-center justify-center col-span-1">
                    {!isClockedIn ?
                        <Button variant="ghost" size="sm" onClick={handleClockIn} className="text-green-400 hover:bg-green-900/50 hover:text-green-300 w-full text-xs sm:text-sm">
                            <LogIn className="mr-1 h-4 w-4"/> Start
                        </Button> :
                        <Button variant="ghost" size="sm" onClick={handleClockOut} className="text-red-400 hover:bg-red-900/50 hover:text-red-300 w-full text-xs sm:text-sm">
                            <LogOut className="mr-1 h-4 w-4"/> End
                        </Button>
                    }
                 </div>
                 <div className="flex flex-col items-center"><span className="font-semibold text-yellow-400">Session</span><span className="font-mono">{formatElapsedTime(currentSessionElapsedTime)}</span></div>
                 <div className="flex flex-col items-center"><span className="font-semibold text-blue-400">Total</span><span className="font-mono">{currentSpace.totalClockedInTime} min</span></div>
                 <div className="flex flex-col items-center"><span className="font-semibold text-green-400">AP</span><span className="font-mono">{totalPoints.toFixed(0)}</span></div>
                 <div className="flex flex-col items-center"><span className="font-semibold text-orange-400">AP/H</span><span className="font-mono">{apPerCurrentSessionHour.toFixed(1)}</span></div>
                 <div className="flex flex-col items-center"><span className="font-semibold text-red-400">Waste</span><span className="font-mono">{totalWastePoints}</span></div>
             </CardContent>
         </Card>

         {/* Main Content Area - Scrollable */}
         <ScrollArea className="flex-grow mb-4">
             <div className="space-y-4">

                 {/* Actions Section */}
                 <Card className="bg-black/30 backdrop-blur-sm border border-white/20 p-3 shadow-md">
                     <h2 className="text-xl font-bold mb-2 text-yellow-400">Actions / Quests</h2>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                          {/* Simple Actions */}
                          {actions.map((action) => (
                            <Card key={action.id} className="bg-white/10 border-white/20 p-2 flex flex-col sm:flex-row items-center justify-between gap-1">
                                <Button variant="secondary" size="sm" onClick={() => handleActionClick(action, 1)} disabled={!isClockedIn} className="text-xs flex-grow w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white justify-start mb-1 sm:mb-0">
                                    {action.name} <span className="ml-auto pl-1 font-bold">(+{action.points})</span>
                                </Button>
                                <div className="flex space-x-1 w-full sm:w-auto">
                                    <Button variant="secondary" size="sm" onClick={() => handleActionClick(action, 2)} disabled={!isClockedIn} className="text-xs w-8 h-8 p-0 bg-blue-800 hover:bg-blue-900 text-white flex-1">x2</Button>
                                    <Button variant="secondary" size="sm" onClick={() => handleActionClick(action, 5)} disabled={!isClockedIn} className="text-xs w-8 h-8 p-0 bg-blue-800 hover:bg-blue-900 text-white flex-1">x5</Button>
                                    <Button variant="secondary" size="sm" onClick={() => handleActionClick(action, 10)} disabled={!isClockedIn} className="text-xs w-8 h-8 p-0 bg-blue-800 hover:bg-blue-900 text-white flex-1">x10</Button>
                                </div>
                            </Card>
                         ))}
                          {/* Multi-Step Actions */}
                         {multiStepActions.map((action) => (
                             <Card key={action.id} className={`bg-white/10 border-white/20 p-2 ${action.currentStepIndex >= action.steps.length ? 'opacity-60' : ''}`}>
                                <Button variant="outline" size="sm" onClick={() => handleMultiStepActionClick(action)} disabled={!isClockedIn || action.currentStepIndex >= action.steps.length} className={`text-xs w-full justify-between bg-purple-600 hover:bg-purple-700 text-white border-purple-800 ${action.currentStepIndex >= action.steps.length ? 'line-through' : ''}`}>
                                   <span>{action.name}</span>
                                   <span className="ml-auto text-purple-200">{action.currentStepIndex >= action.steps.length ? `(Done!)` : `(${action.currentStepIndex + 1}/${action.steps.length})`}</span>
                                </Button>
                                {action.currentStepIndex < action.steps.length && (
                                    <p className="text-xs text-purple-300 mt-1 pl-1">Next: {action.steps[action.currentStepIndex].name} (+{action.pointsPerStep} AP)</p>
                                )}
                             </Card>
                         ))}
                     </div>
                     <div className="flex gap-2 mt-2">
                         <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-md" size="sm" onClick={() => setIsCreateActionModalOpen(true)}><Plus className="mr-1 h-4 w-4"/> Action</Button>
                         <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md" size="sm" onClick={() => setIsCreateMultiStepActionModalOpen(true)}><Plus className="mr-1 h-4 w-4"/> Quest</Button>
                     </div>
                 </Card>

                 {/* To-Do / Gallery Section */}
                 <TodoListComponent spaceId={spaceId} isGameMode={true} />

                 {/* Waste Tracking */}
                 <Card className="bg-black/30 backdrop-blur-sm border border-white/20 p-3 shadow-md">
                     <div className="flex justify-between items-center mb-2">
                         <h2 className="text-xl font-bold text-red-400">Waste Log</h2>
                         <Button size="sm" onClick={handleAddWasteClick} className="bg-red-600 hover:bg-red-700 text-white shadow-md"><Trash className="mr-1 h-4 w-4"/> Add Waste</Button>
                     </div>
                     <div className="text-sm text-white/80">
                          {wasteEntries.length > 0 ? (
                             <> Latest: {wasteEntries[0].type} ({formatTime(wasteEntries[0].timestamp)}) <Button variant="link" size="sm" className="text-xs h-auto px-1 py-0 ml-1 text-blue-300 hover:text-blue-200" onClick={() => setIsWasteDetailsOpen(true)}>(All)</Button> </>
                         ) : ( <span className="italic">No waste logged yet.</span> )}
                         <span className="ml-2">| Total Points: {totalWastePoints}</span>
                     </div>
                 </Card>

                 {/* Log */}
                  <Card className="bg-black/30 backdrop-blur-sm border border-white/20 p-3 shadow-md">
                     <div className="flex justify-between items-center mb-2">
                         <h2 className="text-xl font-bold text-gray-300">Event Log</h2>
                         <Button variant="link" size="sm" className="text-xs h-auto px-1 py-0 text-blue-300 hover:text-blue-200" onClick={() => setIsLogDetailsOpen(true)} disabled={logEntries.length === 0}>All ({logEntries.length})</Button>
                     </div>
                     <div className="text-sm text-white/80">
                         {logEntries.length > 0 ? (
                             <span className="truncate">Latest: {logEntries[0].actionName} ({formatTime(logEntries[0].timestamp)}) {logEntries[0].points > 0 ? ` (+${logEntries[0].points} AP)` : ''}</span>
                         ) : ( <span className="italic">No events logged yet.</span> )}
                     </div>
                 </Card>

                 {/* Comments */}
                  <Card className="bg-black/30 backdrop-blur-sm border border-white/20 p-3 shadow-md">
                     <div className="flex justify-between items-center mb-2">
                         <h2 className="text-xl font-bold text-cyan-300">Notes</h2>
                         <Button variant="link" size="sm" className="text-xs h-auto px-1 py-0 text-blue-300 hover:text-blue-200" onClick={() => setIsCommentDetailsOpen(true)} disabled={comments.length === 0}>All ({comments.length})</Button>
                     </div>
                      <div className="text-sm text-white/80 mb-2">
                         {comments.length > 0 ? ( <span className="truncate">Latest: {comments[0].text.substring(0, 50)}... ({formatTime(comments[0].timestamp)})</span> ) : ( <span className="italic">No notes yet.</span> )}
                      </div>
                     <div className="flex flex-col sm:flex-row gap-2 mt-1">
                          <Textarea id="comment" className="flex-grow p-2 border rounded text-white bg-white/10 border-white/30 text-sm min-h-[40px] h-12 sm:h-auto placeholder:text-white/50" placeholder="Add a note or observation..." value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} />
                          <div className="flex flex-col gap-1 w-full sm:w-auto items-stretch">
                             {newCommentImage ? (
                                 <div className="relative"><img src={newCommentImage} alt="Comment Preview" className="rounded max-h-20 object-cover self-center sm:self-start border border-white/20"/>
                                     <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 bg-black/50 hover:bg-black/70 text-red-400 hover:text-red-300" onClick={() => setNewCommentImage(null)}><CloseIcon className="h-4 w-4" /></Button>
                                 </div>
                             ) : (
                                 <div className="flex gap-1">
                                     <Button variant="outline" size="sm" className="flex-1 text-xs h-8 bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={triggerCommentUpload}><Upload className="mr-1 h-3 w-3" /> Pic</Button>
                                     <Button variant="outline" size="sm" className="flex-1 text-xs h-8 bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={() => setShowCommentCamera(true)}><Camera className="mr-1 h-3 w-3" /> Cam</Button>
                                 </div>
                             )}
                             <Button onClick={handleAddComment} size="sm" className="text-xs h-8 w-full bg-cyan-600 hover:bg-cyan-700 text-white shadow-md" disabled={isLoading || (!newCommentText.trim() && !newCommentImage)}>Add Note</Button>
                         </div>
                         <input type="file" ref={commentFileInputRef} onChange={handleCommentFileChange} accept="image/*" className="hidden" />
                     </div>
                 </Card>
             </div>
         </ScrollArea>

         {/* --- Modals (Copied & Styled for Game Mode) --- */}
          <Dialog open={isCreateActionModalOpen} onOpenChange={setIsCreateActionModalOpen}>
             <DialogContent className="bg-gradient-to-br from-gray-800 to-black border-white/20 text-white">
                 <DialogHeader><DialogTitle className="text-2xl font-bold text-yellow-400">Create New Action</DialogTitle></DialogHeader>
                 <div className="grid gap-4 py-4">
                     <div><Label htmlFor="action-name" className="text-blue-300">Name *</Label><Input id="action-name" value={newActionName} onChange={(e) => setNewActionName(e.target.value)} placeholder="e.g., Clear Desk" className="bg-white/10 border-white/30 text-white placeholder:text-white/50"/></div>
                     <div><Label htmlFor="action-desc" className="text-blue-300">Description</Label><Textarea id="action-desc" value={newActionDescription} onChange={(e) => setNewActionDescription(e.target.value)} placeholder="(Optional)" className="bg-white/10 border-white/30 text-white placeholder:text-white/50"/></div>
                     <div><Label htmlFor="action-points" className="text-blue-300">Points *</Label><Input id="action-points" type="number" min="1" value={newActionPoints} onChange={(e) => setNewActionPoints(e.target.value)} placeholder="e.g., 5" className="bg-white/10 border-white/30 text-white placeholder:text-white/50"/></div>
                 </div>
                 <DialogFooter>
                     <Button type="button" variant="secondary" onClick={() => setIsCreateActionModalOpen(false)} className="bg-gray-600 hover:bg-gray-500 text-white">Cancel</Button>
                     <Button type="button" onClick={handleSaveAction} disabled={isLoading || !newActionName.trim()} className="bg-green-600 hover:bg-green-700 text-white">Create Action</Button>
                 </DialogFooter>
             </DialogContent>
         </Dialog>

          <Dialog open={isCreateMultiStepActionModalOpen} onOpenChange={setIsCreateMultiStepActionModalOpen}>
             <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-gray-800 to-black border-white/20 text-white">
                 <DialogHeader><DialogTitle className="text-2xl font-bold text-yellow-400">Create New Quest (Multi-Step)</DialogTitle></DialogHeader>
                 <div className="grid gap-4 py-4">
                     <div><Label htmlFor="multi-action-name" className="text-blue-300">Quest Name *</Label><Input id="multi-action-name" value={newMultiStepActionName} onChange={(e) => setNewMultiStepActionName(e.target.value)} placeholder="e.g., Morning Routine" className="bg-white/10 border-white/30 text-white placeholder:text-white/50"/></div>
                     <div><Label htmlFor="multi-action-desc" className="text-blue-300">Description</Label><Textarea id="multi-action-desc" value={newMultiStepActionDescription} onChange={(e) => setNewMultiStepActionDescription(e.target.value)} placeholder="(Optional)" className="bg-white/10 border-white/30 text-white placeholder:text-white/50"/></div>
                     <div><Label htmlFor="multi-action-points" className="text-blue-300">Points per Step *</Label><Input id="multi-action-points" type="number" min="1" value={newMultiStepActionPoints} onChange={(e) => setNewMultiStepActionPoints(e.target.value)} placeholder="e.g., 10" className="bg-white/10 border-white/30 text-white placeholder:text-white/50"/></div>
                     <div><Label className="text-blue-300">Steps *</Label><div className="space-y-2"> {newMultiStepActionSteps.map((step, index) => (<div key={index} className="flex items-center gap-2"> <Input type="text" value={step} onChange={(e) => handleStepNameChange(index, e.target.value)} placeholder={`Step ${index + 1} Name`} className="flex-grow bg-white/10 border-white/30 text-white placeholder:text-white/50"/> {newMultiStepActionSteps.length > 1 && (<Button variant="ghost" size="sm" onClick={() => removeStepInput(index)} aria-label="Remove step" className="text-red-400 hover:text-red-300">X</Button>)} </div>))} <Button type="button" variant="outline" size="sm" onClick={addStepInput} className="bg-white/10 border-white/30 text-white hover:bg-white/20">+ Add Step</Button> </div></div>
                 </div>
                 <DialogFooter>
                     <Button type="button" variant="secondary" onClick={() => setIsCreateMultiStepActionModalOpen(false)} className="bg-gray-600 hover:bg-gray-500 text-white">Cancel</Button>
                     <Button type="button" onClick={handleSaveMultiStepAction} disabled={isLoading || !newMultiStepActionName.trim() || newMultiStepActionSteps.some(s => !s.trim())} className="bg-green-600 hover:bg-green-700 text-white">Create Quest</Button>
                 </DialogFooter>
             </DialogContent>
         </Dialog>

          <Dialog open={isAddWasteModalOpen} onOpenChange={setIsAddWasteModalOpen}>
             <DialogContent className="bg-gradient-to-br from-gray-800 to-black border-white/20 text-white">
                 <DialogHeader><DialogTitle className="text-2xl font-bold text-red-400">Log Waste (TIMWOODS)</DialogTitle><DialogDescription className="text-white/70">Select observed obstacles.</DialogDescription></DialogHeader>
                 <ScrollArea className="max-h-60 border border-white/20 rounded-md p-2 bg-black/20">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-1">
                         {timwoodsCategories.map((category) => (
                            <Button
                                key={category.id}
                                variant={selectedWasteCategories.includes(category.id) ? 'destructive' : 'outline'}
                                onClick={() => handleWasteCategoryClick(category.id)}
                                size="sm"
                                className="text-xs h-auto py-2 flex flex-col items-start text-left whitespace-normal bg-white/10 border-white/30 hover:bg-white/20 data-[variant=destructive]:bg-red-800 data-[variant=destructive]:border-red-700 data-[variant=destructive]:text-white"
                             >
                                <span className="font-semibold">{category.name} (+{category.points})</span>
                                <span className="text-xs text-white/60 font-normal">{category.description}</span>
                             </Button>
                         ))}
                    </div>
                 </ScrollArea>
                 <DialogFooter>
                     <Button type="button" variant="secondary" onClick={() => {setIsAddWasteModalOpen(false); setSelectedWasteCategories([]);}} className="bg-gray-600 hover:bg-gray-500 text-white">Cancel</Button>
                     <Button type="button" onClick={handleSaveWaste} disabled={isLoading || selectedWasteCategories.length === 0} className="bg-red-600 hover:bg-red-700 text-white">Add Waste</Button>
                 </DialogFooter>
             </DialogContent>
         </Dialog>

         {/* Detail Modals (Log, Waste, Comments) - Styled for Game Mode */}
          <Dialog open={isLogDetailsOpen} onOpenChange={setIsLogDetailsOpen}>
             <DialogContent className="max-w-md sm:max-w-lg md:max-w-xl bg-gradient-to-br from-gray-800 to-black border-white/20 text-white">
                 <DialogHeader><DialogTitle className="text-2xl font-bold text-gray-300">Full Event Log</DialogTitle></DialogHeader>
                 <ScrollArea className="max-h-[60vh] border rounded-md border-white/20 p-2 bg-black/20">
                     {logEntries.length === 0 && <p className="text-white/70 text-sm text-center p-4 italic">No events yet.</p>}
                     {logEntries.map((log) => {
                          let detail = log.type === 'action' ? `Action: ${log.actionName}` : log.type === 'multiStepAction' ? `Quest Step: ${log.actionName}` : log.type === 'clockIn' ? `Session Start` : log.type === 'clockOut' && log.minutesClockedIn !== undefined ? `Session End (${log.minutesClockedIn} min)` : `Session End`;
                          return <div key={log.id} className="text-xs p-1 border-b border-white/10 last:border-b-0"> <span className="font-mono text-gray-400 mr-2">[{formatDateTime(log.timestamp)}]</span> <span>{detail}</span> {log.points > 0 && <span className="font-semibold text-green-400 ml-2">(+{log.points} AP)</span>} </div>;
                     })}
                 </ScrollArea>
                 <DialogFooter><DialogClose asChild><Button type="button" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">Close</Button></DialogClose></DialogFooter>
             </DialogContent>
         </Dialog>

          <Dialog open={isWasteDetailsOpen} onOpenChange={setIsWasteDetailsOpen}>
             <DialogContent className="max-w-md bg-gradient-to-br from-gray-800 to-black border-white/20 text-white">
                 <DialogHeader><DialogTitle className="text-2xl font-bold text-red-400">Full Waste Log</DialogTitle><DialogDescription className="text-white/70">Total Points Lost: {totalWastePoints}</DialogDescription></DialogHeader>
                 <ScrollArea className="max-h-[60vh] border rounded-md border-white/20 p-2 bg-black/20">
                     {wasteEntries.length === 0 && <p className="text-white/70 text-sm text-center p-4 italic">No waste logged.</p>}
                     {wasteEntries.map((waste) => (<div key={waste.id} className="text-xs p-1 border-b border-white/10 last:border-b-0"> <span className="font-mono text-gray-400 mr-2">[{formatDateTime(waste.timestamp)}]</span> <span>{waste.type}</span> <span className="font-semibold text-red-400 ml-2">({waste.points} pts)</span> </div>))}
                 </ScrollArea>
                 <DialogFooter><DialogClose asChild><Button type="button" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">Close</Button></DialogClose></DialogFooter>
             </DialogContent>
         </Dialog>

          <Dialog open={isCommentDetailsOpen} onOpenChange={setIsCommentDetailsOpen}>
             <DialogContent className="max-w-md sm:max-w-lg bg-gradient-to-br from-gray-800 to-black border-white/20 text-white">
                 <DialogHeader><DialogTitle className="text-2xl font-bold text-cyan-300">All Notes</DialogTitle></DialogHeader>
                 <ScrollArea className="max-h-[60vh] border rounded-md border-white/20 p-2 bg-black/20">
                     {comments.length === 0 && <p className="text-white/70 text-sm text-center p-4 italic">No notes yet.</p>}
                     {comments.map((comment) => (<Card key={comment.id} className="bg-white/5 shadow-sm text-xs mb-2 border border-white/10"> <CardContent className="p-2"> <p className="text-xs text-gray-400 mb-1">{formatDateTime(comment.timestamp)}</p> {comment.imageUrl && <img src={comment.imageUrl} alt="Comment" className="rounded-md my-1 max-h-40 object-cover border border-white/10"/>} <p className="text-white whitespace-pre-wrap">{comment.text}</p> </CardContent> </Card>))}
                 </ScrollArea>
                 <DialogFooter><DialogClose asChild><Button type="button" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">Close</Button></DialogClose></DialogFooter>
             </DialogContent>
         </Dialog>

         {/* Comment Camera Capture */}
          {showCommentCamera && <CameraCapture onCapture={handleCommentCapture} onClose={() => setShowCommentCamera(false)} />}
    </div>
  );
}
