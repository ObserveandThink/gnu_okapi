/**
 * @fileOverview Component for capturing images using the device camera.
 */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from '@/hooks/use-toast';
import { Camera, X as CloseIcon } from 'lucide-react';

interface CameraCaptureProps {
    onCapture: (dataUrl: string) => void;
    onClose: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        let mounted = true; // Track if component is mounted

        const getCameraPermission = async () => {
            try {
                const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (mounted) {
                    setStream(cameraStream);
                    setHasCameraPermission(true);
                    if (videoRef.current) {
                        videoRef.current.srcObject = cameraStream;
                    }
                } else {
                    // If component unmounted before permission granted, stop the stream
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
                    });
                 }
            }
        };

        getCameraPermission();

        // Cleanup function
        return () => {
            mounted = false; // Mark as unmounted
            stream?.getTracks().forEach(track => track.stop());
            console.log("Camera stream stopped.");
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on mount

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current && stream) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (context) {
                // Set canvas dimensions to match video stream for accuracy
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                // Draw the current video frame onto the canvas
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Get the image data URL (e.g., 'data:image/jpeg;base64,...')
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9); // Use JPEG with quality setting
                onCapture(dataUrl);
                // onClose(); // Consider removing auto-close or making it optional
            }
        } else {
             toast({
                variant: 'destructive',
                title: 'Capture Error',
                description: 'Could not capture image. Camera might not be ready.',
             });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg p-4 max-w-lg w-full relative">
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-10" onClick={onClose}>
                    <CloseIcon className="h-5 w-5" />
                </Button>
                <h2 className="text-lg font-semibold mb-4 text-center">Camera Capture</h2>

                <div className="relative aspect-video w-full mb-4 bg-muted rounded-md overflow-hidden">
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
                </div>

                {/* Show capture button only if permission is granted and stream is active */}
                {hasCameraPermission === true && stream && (
                    <Button onClick={handleCapture} className="w-full">
                        <Camera className="mr-2 h-4 w-4" /> Capture Image
                    </Button>
                )}
            </div>
        </div>
    );
};

