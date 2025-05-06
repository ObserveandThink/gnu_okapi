/**
 * @fileOverview Component for capturing images using the device camera with preview and device selection.
 */
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from '@/hooks/use-toast';
import { Camera, X as CloseIcon, RefreshCcw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CameraCaptureProps {
    onCapture: (dataUrl: string) => void;
    onClose: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [isCapturing, setIsCapturing] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null); // State for captured image preview

    // Function to get and set camera devices
    const getDevices = useCallback(async () => {
        try {
            const mediaDevices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = mediaDevices.filter(device => device.kind === 'videoinput');
            setDevices(videoDevices);
            // Automatically select the first device if none is selected or the current one is gone
            if (videoDevices.length > 0 && (!selectedDeviceId || !videoDevices.some(d => d.deviceId === selectedDeviceId))) {
                setSelectedDeviceId(videoDevices[0].deviceId);
            } else if (videoDevices.length === 0) {
                 setSelectedDeviceId(''); // Reset if no devices are found
            }
        } catch (error) {
            console.error("Error enumerating devices:", error);
            toast({ title: "Device Error", description: "Could not list camera devices.", variant: "destructive" });
        }
    }, [selectedDeviceId]);


     // Effect to get initial devices and handle permission
     useEffect(() => {
        let mounted = true; // Track if component is mounted

        const initializeCamera = async () => {
            try {
                // Request initial permission without specifying a device first
                 const permissionStream = await navigator.mediaDevices.getUserMedia({ video: true });
                 if (mounted) {
                     setHasCameraPermission(true);
                     await getDevices(); // Get devices *after* permission is granted
                     permissionStream.getTracks().forEach(track => track.stop()); // Stop the initial permission stream
                 } else {
                     permissionStream?.getTracks().forEach(track => track.stop());
                 }

            } catch (error) {
                console.error('Error accessing camera:', error);
                 if (mounted) {
                    setHasCameraPermission(false);
                    toast({
                        variant: 'destructive',
                        title: 'Camera Access Denied',
                        description: 'Please enable camera permissions in your browser settings.',
                    });
                 }
            }
        };

        initializeCamera();

        // Listen for device changes
        navigator.mediaDevices.addEventListener('devicechange', getDevices);

        return () => {
            mounted = false;
            stream?.getTracks().forEach(track => track.stop());
            navigator.mediaDevices.removeEventListener('devicechange', getDevices);
            console.log("Camera cleanup ran.");
        };
     // eslint-disable-next-line react-hooks/exhaustive-deps
     }, [getDevices]); // Rerun if getDevices changes (though it shouldn't often)


      // Effect to switch stream when selectedDeviceId changes
    useEffect(() => {
        if (!selectedDeviceId || hasCameraPermission !== true) {
            stream?.getTracks().forEach(track => track.stop());
            setStream(null);
            return;
        }

        let currentStream: MediaStream | null = null;
        let mounted = true;

        const startStream = async () => {
            try {
                 // Stop previous stream if exists
                stream?.getTracks().forEach(track => track.stop());

                const newStream = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: { exact: selectedDeviceId } }
                });

                if (mounted) {
                    currentStream = newStream;
                    setStream(newStream);
                    if (videoRef.current) {
                        videoRef.current.srcObject = newStream;
                    }
                } else {
                    newStream?.getTracks().forEach(track => track.stop());
                }
            } catch (error) {
                console.error('Error starting stream for selected device:', error);
                 if (mounted) {
                     toast({ title: "Stream Error", description: "Could not switch camera.", variant: "destructive" });
                     // Possibly fallback to default or clear selection?
                 }
            }
        };

        startStream();

        return () => {
            mounted = false;
            currentStream?.getTracks().forEach(track => track.stop());
            console.log("Stream switching cleanup ran.");
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDeviceId, hasCameraPermission]); // Depend on selectedDeviceId and permission


    const handleCapture = () => {
        if (videoRef.current && canvasRef.current && stream && !isCapturing) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (context) {
                setIsCapturing(true);
                // Set canvas dimensions to match video stream
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                // Draw the current video frame onto the canvas
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Get the image data URL
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                setCapturedImage(dataUrl); // Show preview
                setIsCapturing(false);

                // Optionally pause the video stream after capture
                 // video.pause();
                 // stream.getTracks().forEach(track => track.enabled = false); // Mute tracks
            }
        } else {
             toast({
                variant: 'destructive',
                title: 'Capture Error',
                description: 'Could not capture image. Camera might not be ready.',
             });
        }
    };

     const handleConfirmCapture = () => {
        if (capturedImage) {
            onCapture(capturedImage);
             // onClose(); // Keep modal open until explicitly closed or confirmed
        }
    };

    const handleRetake = () => {
        setCapturedImage(null);
        setIsCapturing(false);
        // Optionally restart the video stream if paused/muted
         if (videoRef.current && stream) {
            // videoRef.current.play();
             // stream.getTracks().forEach(track => track.enabled = true);
         }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg p-4 max-w-lg w-full relative">
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-10" onClick={onClose}>
                    <CloseIcon className="h-5 w-5" />
                </Button>
                <h2 className="text-lg font-semibold mb-2 text-center">Camera Capture</h2>

                {/* Device Selection Dropdown */}
                 {devices.length > 1 && !capturedImage && (
                    <div className="mb-2">
                        <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Camera" />
                            </SelectTrigger>
                            <SelectContent>
                                {devices.map(device => (
                                    <SelectItem key={device.deviceId} value={device.deviceId}>
                                        {device.label || `Camera ${devices.indexOf(device) + 1}`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                 )}

                {/* Video/Image Preview Area */}
                <div className="relative aspect-video w-full mb-4 bg-muted rounded-md overflow-hidden">
                   {capturedImage ? (
                      <img src={capturedImage} alt="Captured Preview" className="w-full h-full object-contain" />
                   ) : (
                       <>
                           {/* Video element should always be rendered to attach stream */}
                           <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                           {/* Hidden canvas for capturing */}
                           <canvas ref={canvasRef} className="hidden" />

                           {/* Overlay messages based on permission state */}
                            {hasCameraPermission === null && (
                               <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">Requesting camera access...</div>
                            )}
                            {hasCameraPermission === false && (
                                <div className="absolute inset-0 flex items-center justify-center p-4">
                                     <Alert variant="destructive">
                                        <AlertTitle>Camera Access Required</AlertTitle>
                                        <AlertDescription>
                                            Permission denied or camera unavailable. Enable in browser settings & refresh.
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            )}
                            {hasCameraPermission === true && !stream && selectedDeviceId && (
                                 <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">Initializing camera...</div>
                            )}
                             {hasCameraPermission === true && devices.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">No camera devices found.</div>
                            )}
                       </>
                   )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    {capturedImage ? (
                         <>
                            <Button onClick={handleRetake} variant="outline" className="flex-1">
                                <RefreshCcw className="mr-2 h-4 w-4" /> Retake
                            </Button>
                            <Button onClick={handleConfirmCapture} className="flex-1">
                                Use Photo
                            </Button>
                        </>
                     ) : (
                        <Button
                            onClick={handleCapture}
                            className="w-full"
                            disabled={!stream || hasCameraPermission !== true || isCapturing || devices.length === 0}
                        >
                            <Camera className="mr-2 h-4 w-4" /> Capture Image
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};