/**
 * @fileOverview Gamified view for a specific Space, focusing on interactive buttons.
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
import { ArrowLeft, Camera, Trash2, Edit, Upload, X as CloseIcon, LogIn, LogOut, Plus, Trash, MessageSquare, Images, ListTodo, AlertCircle, Gamepad, Zap, Recycle, ClipboardList, HelpCircle, Star, Clock } from 'lucide-react';
import { formatElapsedTime, formatTime, formatShortDate, formatDateTime } from '@/utils/dateUtils';
import { toast } from '@/hooks/use-toast';
import { handleImageUploadUtil } from '@/utils/imageUtils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress"; // Import Progress

// Import Domain Models
import type { Action } from '@/core/domain/Action';
import type { MultiStepAction, ActionStep } from '@/core/domain/MultiStepAction';
import type { LogEntry } from '@/core/domain/LogEntry';
import type { WasteEntry } from '@/core/domain/WasteEntry';
import type { Comment } from '@/core/domain/Comment';
import type { TodoItem } from '@/core/domain/TodoItem';


// --- Reusable Components (Modals, etc.) ---

// CameraCapture Component (Slightly restyled for game mode)
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
        let mounted = true;
        let localStream: MediaStream | null = null;

        const getCameraPermission = async () => {
            try {
                const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (mounted) {
                    localStream = cameraStream;
                    setStream(cameraStream);
                    setHasCameraPermission(true);
                    if (videoRef.current) {
                        videoRef.current.srcObject = cameraStream;
                    }
                } else {
                    // Cleanup if component unmounted before permission granted
                    cameraStream?.getTracks().forEach(track => track.stop());
                }
            } catch (error) {
                console.error('Error accessing camera:', error);
                 if (mounted) {
                    setHasCameraPermission(false);
                    toast({
                        variant: 'destructive',
                        title: 'Camera Access Denied',
                        description: 'Please enable camera permissions in your browser settings.',
                        className: 'bg-red-900/80 border-red-700 text-white', // HUD Style
                    });
                 }
            }
        };

        getCameraPermission();

        return () => {
            mounted = false;
            localStream?.getTracks().forEach(track => track.stop());
            if (videoRef.current) {
                 videoRef.current.srcObject = null; // Clean up srcObject
            }
            setStream(null); // Clear stream state
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array ensures this runs once on mount

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
                onClose(); // Close after capture
            }
        }
    };

    // Ensure return statement directly wraps the JSX
    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-gray-900/80 rounded-lg p-4 max-w-lg w-full relative shadow-xl border border-blue-500/30 text-white"> {/* HUD Style: Dark, transparent bg, accent border */}
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-10 text-gray-400 hover:text-white" onClick={onClose}>
                    <CloseIcon className="h-6 w-6" />
                </Button>
                <h2 className="text-xl font-bold mb-4 text-center text-blue-300 font-mono uppercase tracking-wider">CAMERA</h2> {/* HUD Style: Accent color, mono font */}
                <div className="relative aspect-video w-full mb-4 overflow-hidden rounded-lg border-2 border-blue-400/50 shadow-inner shadow-blue-900"> {/* HUD Style: Accent border, inner shadow */}
                   {/* Always render video tag to prevent race conditions */}
                   <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                   <canvas ref={canvasRef} className="hidden" />
                </div>
                 {hasCameraPermission === false && (
                    <Alert variant="destructive" className="mb-4 bg-red-900/80 border-red-700 text-white"> {/* HUD Style */}
                        <AlertCircle className="h-4 w-4 text-red-300"/>
                        <AlertTitle className="font-mono uppercase">Camera Access Required</AlertTitle>
                        <AlertDescription>
                            Enable camera permissions and refresh.
                        </AlertDescription>
                    </Alert>
                )}
                 {hasCameraPermission === true && (
                     <Button onClick={handleCapture} className="w-full text-lg py-3 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white rounded-full shadow-lg font-mono uppercase" disabled={!stream}> {/* HUD Style: Gradient, mono font */}
                        <Camera className="mr-2 h-5 w-5" /> CAPTURE
                    </Button>
                 )}
                 {hasCameraPermission === null && (
                     <p className="text-center text-gray-400 italic animate-pulse font-mono">Requesting camera access...</p> {/* HUD Style: Mono font */}
                 )}
            </div>
        </div>
    );
};


// TodoListComponent (Task Gallery) adapted for Game Mode Modal
const TaskGalleryModal: React.FC<{ spaceId: string, isOpen: boolean, onClose: () => void }> = ({ spaceId, isOpen, onClose }) => {
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
    const closeSubModal = () => { setIsAddTodoModalOpen(false); setIsEditTodoModalOpen(false); setEditingTodo(null); setDescription(''); setBeforeImage(null); setAfterImage(null); setShowCamera(false); setUploadTarget(null); };
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => { if (uploadTarget) { handleImageUploadUtil(event, uploadTarget === 'before' ? setBeforeImage : setAfterImage); } setUploadTarget(null); };
    const triggerFileUpload = (target: 'before' | 'after') => { setUploadTarget(target); fileInputRef.current?.click(); };
    const openCamera = (target: 'before' | 'after') => { setShowCamera(target); };
    const handleCapture = (dataUrl: string) => { if (showCamera === 'before') { setBeforeImage(dataUrl); } else if (showCamera === 'after') { setAfterImage(dataUrl); } setShowCamera(false); };

    const handleSave = async () => {
        if (isLoading) return;
        const trimmedDesc = description.trim();
        if (!trimmedDesc) { toast({ title: "Validation Error", description: "Description is required.", variant: "destructive", className: 'bg-red-900/80 border-red-700 text-white' }); return; }

        if (editingTodo) {
            await updateTodoItem({ ...editingTodo, description: trimmedDesc, beforeImage: beforeImage, afterImage: afterImage });
        } else {
            if (!beforeImage) { toast({ title: "Validation Error", description: "Before image is required.", variant: "destructive", className: 'bg-red-900/80 border-red-700 text-white' }); return; }
            await createTodoItem({ spaceId, description: trimmedDesc, beforeImage: beforeImage, afterImage: afterImage });
        }
        closeSubModal();
    };
    const handleDelete = async (id: string) => { await deleteTodoItem(id); };

    const textClass = "text-white";
    const mutedTextClass = "text-white/70";

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
             <DialogContent className="max-w-2xl bg-gradient-to-br from-gray-800 via-black to-gray-900 border-blue-500/30 text-white shadow-lg rounded-xl backdrop-blur-sm"> {/* HUD Style */}
                 <DialogHeader>
                     <DialogTitle className={`text-2xl sm:text-3xl font-bold ${textClass} text-center text-blue-300 flex items-center justify-center gap-2 font-mono uppercase tracking-wider`}><Images className="h-6 w-6"/> TASK GALLERY</DialogTitle> {/* HUD Style */}
                 </DialogHeader>

                 <div className="mt-4">
                    <div className="flex justify-end mb-3">
                        <Button onClick={openAddModal} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 shadow-md rounded-full font-mono uppercase"> {/* HUD Style */}
                            <Plus className="mr-1 h-4 w-4" /> Add Task
                        </Button>
                    </div>

                     {isLoading && todos.length === 0 && <Skeleton className="h-40 w-full mt-3 bg-gray-700/50 rounded-lg" />}
                     {error && todos.length === 0 && <p className="text-red-400 text-sm mt-2 italic text-center py-4 font-mono">Error loading tasks: {error}</p>} {/* HUD Style */}
                     {todos.length === 0 && !isLoading && !error && <p className={`text-sm ${mutedTextClass} text-center py-8 italic font-mono`}>No tasks yet. Add your first visual task!</p>} {/* HUD Style */}

                     {todos.length > 0 && (
                         <ScrollArea className="h-auto max-h-[60vh] pr-3">
                             <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                 {todos.map((item) => (
                                    <Card key={item.id} className="bg-white/5 backdrop-blur-sm border-white/10 overflow-hidden group relative shadow-md border rounded-lg"> {/* HUD Style */}
                                        <CardContent className="p-2 space-y-1">
                                            {item.beforeImage && <img src={item.beforeImage} alt="Before" className="w-full h-28 object-cover rounded-md mb-1 border border-white/10"/>}
                                            {item.afterImage && <img src={item.afterImage} alt="After" className="w-full h-28 object-cover rounded-md border border-white/10"/>}
                                            <p className={`text-sm font-semibold truncate ${textClass} font-mono`} title={item.description}>{item.description}</p> {/* HUD Style */}
                                            <p className={`text-xs ${mutedTextClass} font-mono`}>{formatShortDate(item.dateCreated)}</p> {/* HUD Style */}
                                        </CardContent>
                                        <div className="absolute inset-0 bg-black/60 group-hover:bg-black/80 transition-opacity flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                            <Button variant="outline" size="icon" className="h-8 w-8 bg-white/80 hover:bg-white text-primary rounded-full" onClick={() => openEditModal(item)}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="destructive" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </Card>
                                 ))}
                             </div>
                         </ScrollArea>
                    )}
                 </div>

                 <DialogFooter className="mt-4">
                     <DialogClose asChild>
                         <Button type="button" variant="secondary" className="bg-gray-600 hover:bg-gray-500 text-white rounded-full font-mono uppercase">Close</Button> {/* HUD Style */}
                     </DialogClose>
                 </DialogFooter>
             </DialogContent>

              {/* Add/Edit Sub-Modal (Behind) */}
             <Dialog open={isAddTodoModalOpen || isEditTodoModalOpen} onOpenChange={closeSubModal}>
                 <DialogContent className="bg-gradient-to-br from-gray-900 to-black border-blue-500/40 text-white rounded-lg z-40"> {/* Lower z-index */}
                     <DialogHeader>
                         <DialogTitle className={`text-xl font-bold text-blue-300 font-mono uppercase`}>{editingTodo ? 'Edit Task' : 'Add New Task'}</DialogTitle> {/* HUD Style */}
                     </DialogHeader>
                     <div className="grid gap-5 py-4">
                         <div>
                             <Label htmlFor="todo-desc" className={`text-sm font-medium text-blue-400 font-mono`}>Description *</Label> {/* HUD Style */}
                             <Input id="todo-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What needs improvement?" className="bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-md font-mono"/> {/* HUD Style */}
                         </div>
                         {/* Before Image */}
                         <div className="space-y-2">
                             <Label className={`text-sm font-medium text-blue-400 font-mono`}>Before Image {editingTodo ? '' : '*'}</Label> {/* HUD Style */}
                             {beforeImage ? (
                                <div className="relative"><img src={beforeImage} alt="Before preview" className="rounded-lg max-h-40 object-cover w-full border border-white/20"/>
                                    <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 bg-black/60 hover:bg-black/80 text-red-400 hover:text-red-300 rounded-full" onClick={() => setBeforeImage(null)}><CloseIcon className="h-4 w-4" /></Button>
                                </div>
                             ) : (
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1 bg-white/10 border-white/30 text-white hover:bg-white/20 rounded-md font-mono uppercase" onClick={() => triggerFileUpload('before')}><Upload className="mr-2 h-4 w-4" /> Upload</Button> {/* HUD Style */}
                                    <Button variant="outline" className="flex-1 bg-white/10 border-white/30 text-white hover:bg-white/20 rounded-md font-mono uppercase" onClick={() => openCamera('before')}><Camera className="mr-2 h-4 w-4" /> Camera</Button> {/* HUD Style */}
                                </div>
                             )}
                         </div>
                         {/* After Image */}
                         <div className="space-y-2">
                              <Label className={`text-sm font-medium text-blue-400 font-mono`}>After Image</Label> {/* HUD Style */}
                              {afterImage ? (
                                 <div className="relative"><img src={afterImage} alt="After preview" className="rounded-lg max-h-40 object-cover w-full border border-white/20"/>
                                     <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 bg-black/60 hover:bg-black/80 text-red-400 hover:text-red-300 rounded-full" onClick={() => setAfterImage(null)}><CloseIcon className="h-4 w-4" /></Button>
                                 </div>
                              ) : (
                                 <div className="flex gap-2">
                                     <Button variant="outline" className="flex-1 bg-white/10 border-white/30 text-white hover:bg-white/20 rounded-md font-mono uppercase" onClick={() => triggerFileUpload('after')}><Upload className="mr-2 h-4 w-4" /> Upload</Button> {/* HUD Style */}
                                     <Button variant="outline" className="flex-1 bg-white/10 border-white/30 text-white hover:bg-white/20 rounded-md font-mono uppercase" onClick={() => openCamera('after')}><Camera className="mr-2 h-4 w-4" /> Camera</Button> {/* HUD Style */}
                                 </div>
                              )}
                          </div>
                     </div>
                     <DialogFooter>
                         <Button type="button" variant="secondary" onClick={closeSubModal} className="bg-gray-600 hover:bg-gray-500 text-white rounded-full font-mono uppercase">Cancel</Button> {/* HUD Style */}
                         <Button type="button" onClick={handleSave} disabled={isLoading || !description.trim() || (!editingTodo && !beforeImage)} className="bg-green-600 hover:bg-green-700 text-white rounded-full font-mono uppercase"> {/* HUD Style */}
                             {isLoading ? 'Saving...' : (editingTodo ? 'Save Changes' : 'Add Task')}
                         </Button>
                     </DialogFooter>
                 </DialogContent>
             </Dialog>
             <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden"/>
             {showCamera && <CameraCapture onCapture={handleCapture} onClose={() => setShowCamera(false)} />}
        </Dialog>
    );
};

// TIMWOODS Categories (Keep definition consistent)
const timwoodsCategories = [
  {id: 'transportation', name: 'Transportation', description: 'Unnecessary movement of materials or products.', points: 1, icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 18h4"/><path d="M12 10v8"/><path d="M17 15.24V9a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v6.24a5 5 0 1 0 10 0Z"/><path d="M21.42 12.42 19 10m-14 0 2.42 2.42"/><path d="M6 6h12"/></svg> },
  {id: 'inventory', name: 'Inventory', description: 'Excess raw materials, work in progress, or finished goods.', points: 2, icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="8" x="2" y="2" rx="2"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M4.5 12.5a1 1 0 0 1 0-1h15a1 1 0 0 1 0 1Zm0 4a1 1 0 0 1 0-1h15a1 1 0 0 1 0 1Z"/><rect width="8" height="8" x="14" y="14" rx="2"/></svg> },
  {id: 'motion', name: 'Motion', description: 'Unnecessary movement of people.', points: 3, icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l3-3-3-3"/><path d="M12 15H3"/><path d="M15 3h6v6"/><path d="M21 3l-8 8"/><path d="m6 6 3-3 3 3"/><path d="M9 3v12"/></svg> },
  {id: 'waiting', name: 'Waiting', description: 'Idle time waiting for the next step in a process.', points: 4, icon: <Clock className="h-6 w-6" /> },
  {id: 'overprocessing', name: 'Overprocessing', description: 'Performing more work than is necessary.', points: 5, icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="m21.21 15.89-1.42-1.42"/><path d="m15.89 21.21-1.42-1.42"/><path d="m15.89 2.79 1.42 1.42"/><path d="m2.79 15.89 1.42 1.42"/><path d="m21.21 8.11 1.42-1.42"/><path d="m8.11 2.79-1.42 1.42"/><path d="M12 18a6 6 0 0 0 6-6"/><path d="M12 6v6h6"/></svg> },
  {id: 'overproduction', name: 'Overproduction', description: 'Producing more than is needed.', points: 6, icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 6-6 6h4v4h4v-4h4Z"/><path d="M18 18H6"/><path d="M18 22H6"/></svg> },
  {id: 'defects', name: 'Defects', description: 'Rework or scrap due to errors or defects.', points: 7, icon: <AlertCircle className="h-6 w-6" /> },
  {id: 'skills', name: 'Skills', description: 'Underutilizing people\'s talents and skills', points: 8, icon: <HelpCircle className="h-6 w-6" /> },
];

// Waste Logging Modal
const WasteLogModal: React.FC<{ isOpen: boolean, onClose: () => void, onSave: (categories: string[]) => void, isLoading: boolean }> = ({ isOpen, onClose, onSave, isLoading }) => {
    const [selectedWasteCategories, setSelectedWasteCategories] = useState<string[]>([]);
    const handleWasteCategoryClick = (categoryId: string) => setSelectedWasteCategories(prev => prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]);

    const handleSaveClick = () => {
        onSave(selectedWasteCategories);
        // Keep modal open until save completes, then context closes it via onClose prop
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
             <DialogContent className="max-w-xl bg-gradient-to-br from-red-900 via-black to-red-800 border-red-500/30 text-white shadow-lg rounded-xl backdrop-blur-sm"> {/* HUD Style */}
                 <DialogHeader>
                    <DialogTitle className="text-2xl sm:text-3xl font-bold text-red-300 text-center flex items-center justify-center gap-2 font-mono uppercase tracking-wider"><Recycle className="h-6 w-6"/> WASTE LOG (TIMWOODS)</DialogTitle> {/* HUD Style */}
                    <DialogDescription className="text-white/70 text-center font-mono">Select observed obstacles.</DialogDescription> {/* HUD Style */}
                 </DialogHeader>
                 <ScrollArea className="max-h-60 my-4 border border-red-500/20 rounded-md p-2 bg-black/30">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-1">
                         {timwoodsCategories.map((category) => (
                            <Button
                                key={category.id}
                                variant={selectedWasteCategories.includes(category.id) ? 'destructive' : 'outline'}
                                onClick={() => handleWasteCategoryClick(category.id)}
                                size="sm"
                                className={`text-xs h-auto py-2 px-3 flex flex-col items-start text-left whitespace-normal rounded-lg transition-all duration-200 font-mono
                                            ${selectedWasteCategories.includes(category.id)
                                                ? 'bg-red-700 border-red-500 text-white ring-2 ring-red-400 shadow-lg'
                                                : 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30'}`} // HUD Style
                             >
                                <span className="font-semibold flex items-center gap-1">{React.cloneElement(category.icon, { className: "h-4 w-4"})} {category.name}</span>
                                <span className="text-xs text-white/60 font-normal">{category.description}</span>
                                <span className="text-xs font-bold ml-auto mt-1">{category.points} pts</span>
                             </Button>
                         ))}
                    </div>
                 </ScrollArea>
                 <DialogFooter>
                     <Button type="button" variant="secondary" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white rounded-full font-mono uppercase">Cancel</Button> {/* HUD Style */}
                     <Button type="button" onClick={handleSaveClick} disabled={isLoading || selectedWasteCategories.length === 0} className="bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md font-mono uppercase"> {/* HUD Style */}
                         {isLoading ? "Logging..." : "Log Waste"}
                     </Button>
                 </DialogFooter>
             </DialogContent>
         </Dialog>
    );
}

// Notes/Comments Modal
const NotesModal: React.FC<{ isOpen: boolean, onClose: () => void, onSave: (text: string, image: string | null) => void, isLoading: boolean }> = ({ isOpen, onClose, onSave, isLoading }) => {
    const { comments } = useSpaceContext(); // Get comments to display
    const [newCommentText, setNewCommentText] = useState('');
    const [newCommentImage, setNewCommentImage] = useState<string | null>(null);
    const [showCommentCamera, setShowCommentCamera] = useState(false);
    const commentFileInputRef = useRef<HTMLInputElement>(null);

    const handleCommentFileChange = (event: React.ChangeEvent<HTMLInputElement>) => handleImageUploadUtil(event, setNewCommentImage);
    const triggerCommentUpload = () => commentFileInputRef.current?.click();
    const handleCommentCapture = (dataUrl: string) => { setNewCommentImage(dataUrl); setShowCommentCamera(false); };

    const handleSaveClick = () => {
        if (!newCommentText.trim() && !newCommentImage) {
             toast({ title: "Empty Note", variant: "destructive", className: 'bg-red-900/80 border-red-700 text-white'});
             return;
        }
        onSave(newCommentText.trim(), newCommentImage);
        // Reset form after saving (assuming onSave handles closing)
        setNewCommentText('');
        setNewCommentImage(null);
    };

    return (
         <Dialog open={isOpen} onOpenChange={onClose}>
             <DialogContent className="max-w-lg bg-gradient-to-br from-cyan-900 via-black to-blue-900 border-cyan-500/30 text-white shadow-lg rounded-xl backdrop-blur-sm"> {/* HUD Style */}
                 <DialogHeader>
                    <DialogTitle className="text-2xl sm:text-3xl font-bold text-cyan-300 text-center flex items-center justify-center gap-2 font-mono uppercase tracking-wider"><MessageSquare className="h-6 w-6"/> NOTES</DialogTitle> {/* HUD Style */}
                 </DialogHeader>

                 {/* Add Comment Form - Interactive Style */}
                 <div className="my-4 space-y-3">
                    <Textarea
                        id="comment"
                        className="p-2 border rounded text-white bg-white/10 border-white/30 text-sm min-h-[80px] placeholder:text-white/50 font-mono" // HUD Style
                        placeholder="Add a note or observation..."
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                    />
                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                        <div className="flex-shrink-0">
                           {newCommentImage ? (
                               <div className="relative w-24 h-16"><img src={newCommentImage} alt="Comment Preview" className="rounded object-cover w-full h-full border border-white/20"/>
                                   <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-6 w-6 bg-black/70 hover:bg-black/90 text-red-400 hover:text-red-300 rounded-full" onClick={() => setNewCommentImage(null)}><CloseIcon className="h-4 w-4" /></Button>
                               </div>
                           ) : (
                               <div className="flex gap-2">
                                   <Button variant="outline" size="sm" className="text-xs h-8 bg-white/10 border-white/30 text-white hover:bg-white/20 rounded-md font-mono uppercase" onClick={triggerCommentUpload}><Upload className="mr-1 h-3 w-3" /> Pic</Button> {/* HUD Style */}
                                   <Button variant="outline" size="sm" className="text-xs h-8 bg-white/10 border-white/30 text-white hover:bg-white/20 rounded-md font-mono uppercase" onClick={() => setShowCommentCamera(true)}><Camera className="mr-1 h-3 w-3" /> Cam</Button> {/* HUD Style */}
                               </div>
                           )}
                        </div>
                         <Button onClick={handleSaveClick} size="sm" className="w-full sm:w-auto flex-grow text-sm h-10 bg-cyan-600 hover:bg-cyan-700 text-white shadow-md rounded-full font-mono uppercase" disabled={isLoading || (!newCommentText.trim() && !newCommentImage)}> {/* HUD Style */}
                             Add Note
                         </Button>
                    </div>
                    <input type="file" ref={commentFileInputRef} onChange={handleCommentFileChange} accept="image/*" className="hidden" />
                 </div>

                 <hr className="border-cyan-500/20 my-4"/>

                 {/* Display Existing Comments */}
                 <ScrollArea className="max-h-[40vh]">
                      <div className="space-y-3 pr-2">
                         {comments.length === 0 && <p className="text-white/70 text-sm text-center p-4 italic font-mono">No notes yet.</p>} {/* HUD Style */}
                         {comments.map((comment) => (
                             <Card key={comment.id} className="bg-white/5 shadow-sm text-xs border border-white/10 rounded-lg"> {/* HUD Style */}
                                <CardContent className="p-2">
                                    <p className="text-xs text-gray-400 mb-1 font-mono">{formatDateTime(comment.timestamp)}</p> {/* HUD Style */}
                                    {comment.imageUrl && <img src={comment.imageUrl} alt="Comment" className="rounded-md my-1 max-h-40 object-cover border border-white/10"/>}
                                    <p className="text-white whitespace-pre-wrap text-sm font-mono">{comment.text}</p> {/* HUD Style */}
                                 </CardContent>
                             </Card>
                         ))}
                      </div>
                 </ScrollArea>

                 <DialogFooter className="mt-4">
                     <DialogClose asChild><Button type="button" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 rounded-full font-mono uppercase">Close</Button></DialogClose></DialogFooter> {/* HUD Style */}
             </DialogContent>
              {showCommentCamera && <CameraCapture onCapture={handleCommentCapture} onClose={() => setShowCommentCamera(false)} />}
         </Dialog>
    );
}

// Action Creation Modal (Behind)
const CreateActionModal: React.FC<{ isOpen: boolean, onClose: () => void, onSave: (name: string, desc: string, points: number) => void, isLoading: boolean }> = ({ isOpen, onClose, onSave, isLoading }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [points, setPoints] = useState<number | string>(5); // Default points

     const handleSaveClick = () => {
        if (!name.trim()) {
            toast({ title: "Name Required", variant: "destructive", className: 'bg-red-900/80 border-red-700 text-white' }); return;
        }
        const numPoints = Number(points) || 1;
        onSave(name.trim(), description.trim(), numPoints);
        // Reset form (assuming onSave closes modal)
        setName(''); setDescription(''); setPoints(5);
     };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
             <DialogContent className="bg-gradient-to-br from-gray-800 to-black border-green-500/30 text-white rounded-xl z-40"> {/* Lower z-index */}
                 <DialogHeader><DialogTitle className="text-2xl font-bold text-green-400 text-center flex items-center justify-center gap-2 font-mono uppercase tracking-wider"><Zap className="h-6 w-6"/> Create New Action</DialogTitle></DialogHeader> {/* HUD Style */}
                 <div className="grid gap-4 py-4">
                     <div><Label htmlFor="action-name" className="text-blue-300 font-mono">Name *</Label><Input id="action-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Clear Desk" className="bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-md font-mono"/></div> {/* HUD Style */}
                     <div><Label htmlFor="action-desc" className="text-blue-300 font-mono">Description</Label><Textarea id="action-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="(Optional)" className="bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-md font-mono"/></div> {/* HUD Style */}
                     <div><Label htmlFor="action-points" className="text-blue-300 font-mono">Points *</Label><Input id="action-points" type="number" min="1" value={points} onChange={(e) => setPoints(e.target.value)} placeholder="e.g., 5" className="bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-md font-mono"/></div> {/* HUD Style */}
                 </div>
                 <DialogFooter>
                     <Button type="button" variant="secondary" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white rounded-full font-mono uppercase">Cancel</Button> {/* HUD Style */}
                     <Button type="button" onClick={handleSaveClick} disabled={isLoading || !name.trim()} className="bg-green-600 hover:bg-green-700 text-white rounded-full font-mono uppercase"> {/* HUD Style */}
                        {isLoading ? "Creating..." : "Create Action"}
                    </Button>
                 </DialogFooter>
             </DialogContent>
         </Dialog>
    );
}

// Quest Creation Modal (Behind)
const CreateQuestModal: React.FC<{ isOpen: boolean, onClose: () => void, onSave: (name: string, desc: string, points: number, steps: string[]) => void, isLoading: boolean }> = ({ isOpen, onClose, onSave, isLoading }) => {
     const [name, setName] = useState('');
     const [description, setDescription] = useState('');
     const [points, setPoints] = useState<number | string>(10); // Default points per step
     const [steps, setSteps] = useState<string[]>(['']);

     const handleStepChange = (index: number, value: string) => { const updated = [...steps]; updated[index] = value; setSteps(updated); };
     const addStepInput = () => setSteps([...steps, '']);
     const removeStepInput = (index: number) => { if (steps.length > 1) setSteps(steps.filter((_, i) => i !== index)); };

     const handleSaveClick = () => {
         if (!name.trim() || steps.some(s => !s.trim())) {
             toast({ title: "Missing Info!", description: "Quest name and all steps are required.", variant: "destructive", className: 'bg-red-900/80 border-red-700 text-white' }); return;
         }
         const numPoints = Number(points) || 1;
         onSave(name.trim(), description.trim(), numPoints, steps.map(s => s.trim()));
         // Reset form
         setName(''); setDescription(''); setPoints(10); setSteps(['']);
     };

    return (
         <Dialog open={isOpen} onOpenChange={onClose}>
             <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-gray-800 to-black border-purple-500/30 text-white rounded-xl z-40"> {/* Lower z-index */}
                 <DialogHeader><DialogTitle className="text-2xl font-bold text-purple-400 text-center flex items-center justify-center gap-2 font-mono uppercase tracking-wider"><ClipboardList className="h-6 w-6"/> Create New Quest</DialogTitle></DialogHeader> {/* HUD Style */}
                 <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                     <div><Label htmlFor="quest-name" className="text-blue-300 font-mono">Quest Name *</Label><Input id="quest-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Morning Routine" className="bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-md font-mono"/></div> {/* HUD Style */}
                     <div><Label htmlFor="quest-desc" className="text-blue-300 font-mono">Description</Label><Textarea id="quest-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="(Optional)" className="bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-md font-mono"/></div> {/* HUD Style */}
                     <div><Label htmlFor="quest-points" className="text-blue-300 font-mono">Points per Step *</Label><Input id="quest-points" type="number" min="1" value={points} onChange={(e) => setPoints(e.target.value)} placeholder="e.g., 10" className="bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-md font-mono"/></div> {/* HUD Style */}
                     <div><Label className="text-blue-300 font-mono">Steps *</Label><div className="space-y-2"> {steps.map((step, index) => (<div key={index} className="flex items-center gap-2"> <Input type="text" value={step} onChange={(e) => handleStepChange(index, e.target.value)} placeholder={`Step ${index + 1} Name`} className="flex-grow bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-md font-mono"/> {steps.length > 1 && (<Button variant="ghost" size="icon" onClick={() => removeStepInput(index)} aria-label="Remove step" className="text-red-400 hover:text-red-300 h-8 w-8 flex-shrink-0 rounded-full"><CloseIcon className="h-4 w-4" /></Button>)} </div>))} <Button type="button" variant="outline" size="sm" onClick={addStepInput} className="bg-white/10 border-white/30 text-white hover:bg-white/20 rounded-full w-full font-mono uppercase">+ Add Step</Button> </div></div> {/* HUD Style */}
                 </div>
                 <DialogFooter>
                     <Button type="button" variant="secondary" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white rounded-full font-mono uppercase">Cancel</Button> {/* HUD Style */}
                     <Button type="button" onClick={handleSaveClick} disabled={isLoading || !name.trim() || steps.some(s => !s.trim())} className="bg-purple-600 hover:bg-purple-700 text-white rounded-full font-mono uppercase"> {/* HUD Style */}
                         {isLoading ? "Creating..." : "Create Quest"}
                    </Button>
                 </DialogFooter>
             </DialogContent>
         </Dialog>
    );
}

// --- Main Game Page Component ---

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
      todos,
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
      // Todo functions passed to modal
      createTodoItem, updateTodoItem, deleteTodoItem
  } = useSpaceContext();

  // --- UI State for Game Page ---
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInStartTime, setClockInStartTime] = useState<Date | null>(null);
  const [currentSessionElapsedTime, setCurrentSessionElapsedTime] = useState(0);
  const [timerIntervalId, setTimerIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [sessionPoints, setSessionPoints] = useState(0);

  // Modals visibility state
  const [isCreateActionModalOpen, setIsCreateActionModalOpen] = useState(false);
  const [isCreateQuestModalOpen, setIsCreateQuestModalOpen] = useState(false);
  const [isAddWasteModalOpen, setIsAddWasteModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [isLogDetailsOpen, setIsLogDetailsOpen] = useState(false); // Keep for full log view

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
         // Recalculate session points on load if clocked in
         const loadedSessionPoints = logEntries
            .filter(e => e.timestamp >= startTime && e.points > 0)
            .reduce((sum, e) => sum + e.points, 0);
         setSessionPoints(loadedSessionPoints);
     }

    return () => {
      if (timerIntervalId) clearInterval(timerIntervalId);
      // Don't clearCurrentSpace here if user might navigate back quickly
    };
   // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId]); // Keep loadSpaceDetails dependency removed

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

  // Recalculate session points when logEntries or clockInStartTime changes while clocked in
    useEffect(() => {
        if (isClockedIn && clockInStartTime) {
             const calculatedSessionPoints = logEntries
                .filter(e => e.timestamp >= clockInStartTime && e.points > 0)
                .reduce((sum, e) => sum + e.points, 0);
             setSessionPoints(calculatedSessionPoints);
        } else {
            setSessionPoints(0);
        }
    }, [logEntries, isClockedIn, clockInStartTime]);


  // --- Calculated Values (Game Mode Styling) ---
  const totalPoints = useMemo(() => logEntries.reduce((sum, entry) => sum + entry.points, 0), [logEntries]);
  const totalWastePoints = useMemo(() => wasteEntries.reduce((sum, entry) => sum + entry.points, 0), [wasteEntries]);
  const apPerCurrentSessionHour = useMemo(() => {
    const sessionHours = currentSessionElapsedTime / 3600;
    return sessionHours > 0 ? sessionPoints / sessionHours : 0;
  }, [sessionPoints, currentSessionElapsedTime]);

  // --- Event Handlers (Game Mode Styling) ---
  const handleBackToSpace = () => router.push(`/space/${spaceId}`);

  const handleClockIn = async () => {
    if (!currentSpace) return;
    const now = new Date();
    setIsClockedIn(true);
    setClockInStartTime(now);
    setSessionPoints(0); // Reset session points on clock in
    localStorage.setItem(`clockInTime-${spaceId}`, now.toISOString());
    await addLogEntry({ spaceId: currentSpace.id, actionName: 'Clock In', points: 0, type: 'clockIn' });
    toast({ title: 'Session Started!', description: 'Let the improvements begin!', className: 'bg-green-600/90 text-white border-green-700 font-mono' }); // HUD Style
  };

  const handleClockOut = async () => {
    if (!currentSpace || !clockInStartTime) return;
    const now = new Date();
    setIsClockedIn(false);
    localStorage.removeItem(`clockInTime-${spaceId}`);
    const minutesClocked = Math.floor((now.getTime() - clockInStartTime.getTime()) / (1000 * 60));
    await addClockedTime(currentSpace.id, minutesClocked);
    await addLogEntry({
      spaceId: currentSpace.id,
      actionName: 'Clock Out',
      points: 0,
      type: 'clockOut',
      clockInTime: clockInStartTime,
      clockOutTime: now,
      minutesClockedIn: minutesClocked,
    });
    setClockInStartTime(null);
    // Session points naturally reset because clockInStartTime is null
    toast({ title: 'Session Ended!', description: `Time: ${minutesClocked} min. Points: ${sessionPoints}. Great work!`, className: 'bg-blue-600/90 text-white border-blue-700 font-mono' }); // HUD Style
  };

   const handleActionClick = async (action: Action) => { // Simplified: always x1 for game mode buttons
     if (!isClockedIn) { toast({ title: 'Clock In First!', description: 'Start your session to log actions.', variant: 'destructive', className: 'bg-red-900/80 border-red-700 text-white font-mono' }); return; } // HUD Style
     if (!currentSpace) return;
     const pointsEarned = action.points;
     await addLogEntry({ spaceId: currentSpace.id, actionName: action.name, points: pointsEarned, type: 'action' });
     // Optimistic update for session points display
     setSessionPoints(prev => prev + pointsEarned);
     toast({ title: `+${pointsEarned} AP!`, description: `Logged: ${action.name}`, className: 'bg-yellow-500/90 text-black border-yellow-600 font-mono' }); // HUD Style
   };

   const handleMultiStepActionClick = async (action: MultiStepAction) => {
     if (!isClockedIn) { toast({ title: 'Clock In First!', variant: 'destructive', className: 'bg-red-900/80 border-red-700 text-white font-mono' }); return; } // HUD Style
     if (action.currentStepIndex >= action.steps.length) { toast({ title: 'Quest Complete!', className: 'bg-purple-600/90 text-white border-purple-700 font-mono' }); return; } // HUD Style
     const updatedAction = await completeMultiStepActionStep(action.id); // This already adds log entry
      if (updatedAction) {
         const completedStepIndex = updatedAction.currentStepIndex - 1;
         if (completedStepIndex >= 0) {
             // Optimistic update for session points display
             setSessionPoints(prev => prev + updatedAction.pointsPerStep);
             toast({
                 title: `+${updatedAction.pointsPerStep} AP!`,
                 description: `Step Complete: ${updatedAction.steps[completedStepIndex].name}`,
                 className: 'bg-indigo-600/90 text-white border-indigo-700 font-mono' // HUD Style
             });
         }
      }
   };

   const handleSaveAction = async (name: string, description: string, points: number) => {
     if (!currentSpace) return;
     const success = await createAction({ spaceId: currentSpace.id, name, description, points });
     if (success) {
       setIsCreateActionModalOpen(false); // Close modal on success
       toast({ title: 'New Action Added!', description: `"${name}" is ready!`, className: 'bg-teal-500/90 text-white border-teal-600 font-mono' }); // HUD Style
     }
   };

    const handleSaveQuest = async (name: string, description: string, pointsPerStep: number, stepNames: string[]) => {
         if (!currentSpace) return;
         const stepsData = stepNames.map(name => ({ name }));
         const success = await createMultiStepAction({ spaceId: currentSpace.id, name, description, pointsPerStep, steps: stepsData });
         if (success) {
             setIsCreateQuestModalOpen(false); // Close modal
             toast({ title: 'New Quest Added!', description: `"${name}" is available!`, className: 'bg-cyan-500/90 text-white border-cyan-600 font-mono'}); // HUD Style
         }
     };

     const handleSaveWaste = async (selectedCategories: string[]) => {
       if (!currentSpace || selectedCategories.length === 0) return;
       const added = await addWasteEntries(currentSpace.id, selectedCategories);
       if (added.length > 0) {
          const pointsLost = added.reduce((sum, e) => sum + e.points, 0);
          // No need to update session points for waste
          toast({ title: `-${pointsLost} WP!`, description: `Logged ${added.length} waste entr${added.length > 1 ? 'ies' : 'y'}.`, variant: 'destructive', className: 'bg-red-900/80 border-red-700 text-white font-mono' }); // HUD Style
          setIsAddWasteModalOpen(false); // Close modal on success
       } else {
          // Handle case where maybe categories were invalid or error occurred during addWasteEntries
           toast({ title: `Log Failed`, description: `Could not log waste entries.`, variant: 'destructive', className: 'bg-red-900/80 border-red-700 text-white font-mono' }); // HUD Style
       }
     };

    const handleSaveComment = async (text: string, imageUrl: string | null) => {
      if (!currentSpace) return;
      const success = await addComment({ spaceId: currentSpace.id, text, imageUrl });
      if (success) {
          // Modal remains open to view log, user closes manually
          // No need to close: setIsNotesModalOpen(false);
          toast({ title: "Note Logged!", className: 'bg-gray-700/90 text-white border-gray-800 font-mono' }); // HUD Style
      }
    };


  // --- Render Logic ---
  if (isLoading && !currentSpace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white animate-pulse"> {/* HUD Style */}
        <Gamepad className="h-16 w-16 text-blue-500 mb-6 opacity-50" />
        <Skeleton className="h-8 w-3/4 mb-4 bg-white/10" />
        <Skeleton className="h-4 w-1/2 mb-8 bg-white/10" />
        <Skeleton className="h-16 w-48 bg-white/20 rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-red-900 via-black to-gray-800 text-red-300"> {/* HUD Style */}
        <AlertCircle className="h-16 w-16 text-red-500 mb-6" />
        <h2 className="text-2xl mb-2 font-bold font-mono uppercase">Error Loading Game Data</h2> {/* HUD Style */}
        <p className="mb-4 text-center font-mono">{error}</p> {/* HUD Style */}
        <Button onClick={() => router.push('/')} variant="secondary" className="text-lg bg-white/20 hover:bg-white/30 text-white rounded-full px-8 py-3 font-mono uppercase"> {/* HUD Style */}
          Go Home
        </Button>
      </div>
    );
  }

  if (!currentSpace) {
    return (
       <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-800 via-black to-gray-700 text-gray-400"> {/* HUD Style */}
        <HelpCircle className="h-16 w-16 text-gray-500 mb-6" />
        <h2 className="text-2xl mb-4 font-bold font-mono uppercase">Space not found.</h2> {/* HUD Style */}
        <Button onClick={() => router.push('/')} variant="secondary" className="text-lg bg-white/20 hover:bg-white/30 text-white rounded-full px-8 py-3 font-mono uppercase"> {/* HUD Style */}
          Go Home
        </Button>
      </div>
    );
  }

  // Main Game UI Render
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-purple-900 via-indigo-950 to-blue-950 text-white p-3 sm:p-4 font-mono"> {/* HUD Style: Darker gradient, mono font */}
        {/* Header */}
        <header className="flex justify-between items-center mb-4 px-2">
            <Button onClick={handleBackToSpace} variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full">
                <ArrowLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold text-center flex-grow truncate px-2 sm:px-4 text-shadow-sm shadow-black"> {/* HUD Style */}
                 <span className="bg-black/30 px-3 py-1 rounded-md border border-white/20 uppercase tracking-wider">{currentSpace.name} - Quest Mode</span> {/* HUD Style: Uppercase, wider tracking */}
            </h1>
            {/* Clock In/Out Button */}
            {!isClockedIn ?
                <Button size="sm" onClick={handleClockIn} className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white rounded-full shadow-lg px-4 py-2 text-sm animate-pulse font-mono uppercase"> {/* HUD Style */}
                    <LogIn className="mr-1 h-4 w-4"/> Start
                </Button> :
                <Button size="sm" onClick={handleClockOut} className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-full shadow-lg px-4 py-2 text-sm font-mono uppercase"> {/* HUD Style */}
                    <LogOut className="mr-1 h-4 w-4"/> End
                </Button>
            }
        </header>

         {/* Dashboard */}
         <Card className="mb-4 bg-black/40 backdrop-blur-md border border-white/20 shadow-xl rounded-lg"> {/* HUD Style */}
             <CardContent className="p-2 grid grid-cols-3 gap-x-1 gap-y-1 text-xs text-center items-center font-mono uppercase tracking-wider"> {/* HUD Style */}
                <div className="flex flex-col items-center p-1 bg-black/20 rounded"> <span className="font-semibold text-yellow-400 text-[0.6rem]">Session</span> <span className="font-mono text-lg">{formatElapsedTime(currentSessionElapsedTime)}</span> </div>
                <div className="flex flex-col items-center p-1 bg-black/20 rounded"> <span className="font-semibold text-blue-400 text-[0.6rem]">Total</span> <span className="font-mono text-lg">{currentSpace.totalClockedInTime}<span className="text-xs"> min</span></span> </div>
                <div className="flex flex-col items-center p-1 bg-black/20 rounded"> <span className="font-semibold text-green-400 text-[0.6rem]">AP</span> <span className="font-mono text-lg">{totalPoints.toFixed(0)}</span> </div>
                <div className="flex flex-col items-center p-1 bg-black/20 rounded"> <span className="font-semibold text-orange-400 text-[0.6rem]">Sess AP</span> <span className="font-mono text-lg">{sessionPoints.toFixed(0)}</span> </div> {/* Abbreviation */}
                <div className="flex flex-col items-center p-1 bg-black/20 rounded"> <span className="font-semibold text-purple-400 text-[0.6rem]">AP/H</span> <span className="font-mono text-lg">{apPerCurrentSessionHour.toFixed(1)}</span> </div>
                <div className="flex flex-col items-center p-1 bg-black/20 rounded"> <span className="font-semibold text-red-400 text-[0.6rem]">Waste</span> <span className="font-mono text-lg">{totalWastePoints}</span> </div>
             </CardContent>
         </Card>

         {/* Main Action Grid - Interactive Button Style */}
         <ScrollArea className="flex-grow mb-4">
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 p-1">

                {/* Simple Action Buttons */}
                {actions.map((action) => (
                    <Button
                        key={action.id}
                        onClick={() => handleActionClick(action)}
                        disabled={!isClockedIn || isLoading}
                        variant="secondary"
                        className="h-auto aspect-square flex flex-col items-center justify-center p-2 sm:p-4 rounded-xl shadow-lg bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-blue-400/50 hover:border-blue-300" // HUD Style: Border
                        title={action.description}
                    >
                        <Zap className="h-6 w-6 sm:h-8 sm:w-8 mb-1 text-yellow-300 filter drop-shadow(0 0 3px #fde047)" /> {/* HUD Style: Glow effect */}
                        <span className="text-sm sm:text-base font-semibold text-center break-words line-clamp-2 font-mono uppercase">{action.name}</span> {/* HUD Style */}
                        <span className="text-xs sm:text-sm font-bold text-yellow-400 mt-1 font-mono">(+{action.points} AP)</span> {/* HUD Style */}
                    </Button>
                ))}

                 {/* Multi-Step Action (Quest) Buttons */}
                 {multiStepActions.map((action) => {
                     const isCompleted = action.currentStepIndex >= action.steps.length;
                     const progress = isCompleted ? 100 : (action.currentStepIndex / action.steps.length) * 100;
                     return (
                         <Button
                            key={action.id}
                            onClick={() => handleMultiStepActionClick(action)}
                            disabled={!isClockedIn || isCompleted || isLoading}
                            variant="outline"
                            className={`h-auto aspect-square flex flex-col items-center justify-center p-2 sm:p-4 rounded-xl shadow-lg text-white transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden border-2 hover:border-purple-300
                                        ${isCompleted
                                            ? 'bg-gradient-to-br from-gray-700 to-gray-800 border-gray-600'
                                            : 'bg-gradient-to-br from-purple-600 to-pink-700 hover:from-purple-700 hover:to-pink-800 border-purple-500/50'}`} // HUD Style
                            title={action.description}
                        >
                            <ClipboardList className="h-6 w-6 sm:h-8 sm:w-8 mb-1 text-purple-300 filter drop-shadow(0 0 3px #c084fc)" /> {/* HUD Style: Glow */}
                            <span className="text-sm sm:text-base font-semibold text-center break-words line-clamp-2 font-mono uppercase">{action.name}</span> {/* HUD Style */}
                            {!isCompleted && <span className="text-xs text-purple-200 mt-1 font-mono">Next: {action.steps[action.currentStepIndex].name} (+{action.pointsPerStep})</span>} {/* HUD Style */}
                             {isCompleted && <span className="text-xs text-green-400 mt-1 font-bold font-mono">COMPLETED!</span>} {/* HUD Style */}
                            {/* Progress Bar */}
                            <Progress value={progress} className="absolute bottom-1 left-1 right-1 h-1.5 bg-black/30 [&>div]:bg-gradient-to-r [&>div]:from-yellow-400 [&>div]:to-orange-500" />
                            <span className="absolute bottom-1 right-2 text-[0.6rem] font-bold text-black/70 font-mono">{action.currentStepIndex}/{action.steps.length}</span> {/* HUD Style */}
                         </Button>
                    );
                })}

                 {/* --- Static Action Buttons (Open Modals) --- */}

                 {/* Add Simple Action */}
                 <Button
                    onClick={() => setIsCreateActionModalOpen(true)}
                    disabled={isLoading}
                    variant="outline"
                    className="h-auto aspect-square flex flex-col items-center justify-center p-2 sm:p-4 rounded-xl shadow-lg bg-gradient-to-br from-green-800 to-teal-900 hover:from-green-700 hover:to-teal-800 border-2 border-green-600/50 hover:border-green-400 text-white transition-all duration-200 active:scale-95" // HUD Style
                 >
                     <Zap className="h-6 w-6 sm:h-8 sm:w-8 mb-1 text-green-300 filter drop-shadow(0 0 3px #6ee7b7)"/> {/* HUD Style */}
                     <span className="text-sm sm:text-base font-semibold font-mono uppercase">Add Action</span> {/* HUD Style */}
                     <span className="text-xs text-green-200 font-mono">(Simple Task)</span> {/* HUD Style */}
                 </Button>

                 {/* Add Quest (Multi-Step) */}
                 <Button
                    onClick={() => setIsCreateQuestModalOpen(true)}
                    disabled={isLoading}
                    variant="outline"
                    className="h-auto aspect-square flex flex-col items-center justify-center p-2 sm:p-4 rounded-xl shadow-lg bg-gradient-to-br from-purple-800 to-indigo-900 hover:from-purple-700 hover:to-indigo-800 border-2 border-purple-600/50 hover:border-purple-400 text-white transition-all duration-200 active:scale-95" // HUD Style
                 >
                    <ClipboardList className="h-6 w-6 sm:h-8 sm:w-8 mb-1 text-purple-300 filter drop-shadow(0 0 3px #c084fc)"/> {/* HUD Style */}
                    <span className="text-sm sm:text-base font-semibold font-mono uppercase">Add Quest</span> {/* HUD Style */}
                    <span className="text-xs text-purple-200 font-mono">(Multi-Step)</span> {/* HUD Style */}
                 </Button>

                 {/* Log Waste */}
                 <Button
                    onClick={() => setIsAddWasteModalOpen(true)}
                    disabled={isLoading}
                    variant="outline"
                    className="h-auto aspect-square flex flex-col items-center justify-center p-2 sm:p-4 rounded-xl shadow-lg bg-gradient-to-br from-red-800 to-orange-900 hover:from-red-700 hover:to-orange-800 border-2 border-red-600/50 hover:border-red-400 text-white transition-all duration-200 active:scale-95" // HUD Style
                 >
                    <Recycle className="h-6 w-6 sm:h-8 sm:w-8 mb-1 text-red-300 filter drop-shadow(0 0 3px #f87171)"/> {/* HUD Style */}
                    <span className="text-sm sm:text-base font-semibold font-mono uppercase">Log Waste</span> {/* HUD Style */}
                    <span className="text-xs text-red-200 font-mono">(TIMWOODS)</span> {/* HUD Style */}
                 </Button>

                 {/* Task Gallery */}
                 <Button
                    onClick={() => setIsGalleryModalOpen(true)}
                    disabled={isLoading}
                    variant="outline"
                    className="h-auto aspect-square flex flex-col items-center justify-center p-2 sm:p-4 rounded-xl shadow-lg bg-gradient-to-br from-blue-800 to-cyan-900 hover:from-blue-700 hover:to-cyan-800 border-2 border-blue-600/50 hover:border-blue-400 text-white transition-all duration-200 active:scale-95" // HUD Style
                 >
                    <Images className="h-6 w-6 sm:h-8 sm:w-8 mb-1 text-blue-300 filter drop-shadow(0 0 3px #93c5fd)"/> {/* HUD Style */}
                    <span className="text-sm sm:text-base font-semibold font-mono uppercase">Task Gallery</span> {/* HUD Style */}
                    <span className="text-xs text-blue-200 font-mono">(Visual Tasks)</span> {/* HUD Style */}
                 </Button>

                 {/* Notes */}
                 <Button
                    onClick={() => setIsNotesModalOpen(true)}
                    disabled={isLoading}
                    variant="outline"
                    className="h-auto aspect-square flex flex-col items-center justify-center p-2 sm:p-4 rounded-xl shadow-lg bg-gradient-to-br from-gray-800 to-slate-900 hover:from-gray-700 hover:to-slate-800 border-2 border-gray-600/50 hover:border-gray-400 text-white transition-all duration-200 active:scale-95" // HUD Style
                 >
                    <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 mb-1 text-gray-300 filter drop-shadow(0 0 3px #d1d5db)"/> {/* HUD Style */}
                    <span className="text-sm sm:text-base font-semibold font-mono uppercase">Notes</span> {/* HUD Style */}
                    <span className="text-xs text-gray-400 font-mono">(Observations)</span> {/* HUD Style */}
                 </Button>

                 {/* View Full Log (Optional) */}
                 <Button
                     onClick={() => setIsLogDetailsOpen(true)}
                     disabled={isLoading || logEntries.length === 0}
                     variant="outline"
                     className="h-auto aspect-square flex flex-col items-center justify-center p-2 sm:p-4 rounded-xl shadow-lg bg-gradient-to-br from-indigo-800 to-purple-900 hover:from-indigo-700 hover:to-purple-800 border-2 border-indigo-600/50 hover:border-indigo-400 text-white transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed" // HUD Style
                  >
                     <ListTodo className="h-6 w-6 sm:h-8 sm:w-8 mb-1 text-indigo-300 filter drop-shadow(0 0 3px #a5b4fc)"/> {/* HUD Style */}
                     <span className="text-sm sm:text-base font-semibold font-mono uppercase">Event Log</span> {/* HUD Style */}
                     <span className="text-xs text-indigo-200 font-mono">({logEntries.length} events)</span> {/* HUD Style */}
                 </Button>

             </div>
         </ScrollArea>

         {/* --- Modals (Data collection modals remain prominent) --- */}
         <CreateActionModal
            isOpen={isCreateActionModalOpen}
            onClose={() => setIsCreateActionModalOpen(false)}
            onSave={handleSaveAction}
            isLoading={isLoading}
         />
          <CreateQuestModal
             isOpen={isCreateQuestModalOpen}
             onClose={() => setIsCreateQuestModalOpen(false)}
             onSave={handleSaveQuest}
             isLoading={isLoading}
         />
         <WasteLogModal
            isOpen={isAddWasteModalOpen}
            onClose={() => setIsAddWasteModalOpen(false)}
            onSave={handleSaveWaste}
            isLoading={isLoading}
        />
        <NotesModal
            isOpen={isNotesModalOpen}
            onClose={() => setIsNotesModalOpen(false)}
            onSave={handleSaveComment}
            isLoading={isLoading}
        />
        <TaskGalleryModal
            spaceId={spaceId}
            isOpen={isGalleryModalOpen}
            onClose={() => setIsGalleryModalOpen(false)}
        />

         {/* Full Log Details Modal */}
         <Dialog open={isLogDetailsOpen} onOpenChange={setIsLogDetailsOpen}>
             <DialogContent className="max-w-md sm:max-w-lg md:max-w-xl bg-gradient-to-br from-gray-900 to-black border-indigo-500/30 text-white rounded-xl backdrop-blur-sm"> {/* HUD Style */}
                 <DialogHeader><DialogTitle className="text-2xl font-bold text-indigo-300 flex items-center gap-2 font-mono uppercase tracking-wider"><ListTodo className="h-6 w-6"/> Full Event Log</DialogTitle></DialogHeader> {/* HUD Style */}
                 <ScrollArea className="max-h-[60vh] border rounded-md border-white/10 p-2 bg-black/30 my-4">
                     {logEntries.length === 0 && <p className="text-white/70 text-sm text-center p-4 italic font-mono">No events yet.</p>} {/* HUD Style */}
                     {logEntries.map((log) => {
                          let detail = log.type === 'action' ? `Action: ${log.actionName}` : log.type === 'multiStepAction' ? `Quest Step: ${log.actionName}` : log.type === 'clockIn' ? `Session Start` : log.type === 'clockOut' && log.minutesClockedIn !== undefined ? `Session End (${log.minutesClockedIn} min)` : `Session End`;
                          return <div key={log.id} className="text-xs p-1.5 border-b border-white/10 last:border-b-0 hover:bg-white/5 rounded-sm font-mono"> <span className="font-mono text-gray-400 mr-2">[{formatDateTime(log.timestamp)}]</span> <span>{detail}</span> {log.points > 0 && <span className="font-semibold text-green-400 ml-2">(+{log.points} AP)</span>} </div>; // HUD Style
                     })}
                 </ScrollArea>
                 <DialogFooter><DialogClose asChild><Button type="button" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 rounded-full font-mono uppercase">Close</Button></DialogClose></DialogFooter> {/* HUD Style */}
             </DialogContent>
         </Dialog>

    </div>
  );
}

    

    