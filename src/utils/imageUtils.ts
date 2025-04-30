/**
 * @fileOverview Utility functions for handling image file inputs.
 */
import type React from 'react';
import { toast } from "@/hooks/use-toast";

const MAX_IMAGE_SIZE_MB = 5; // Max image size in megabytes
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

/**
 * Handles the change event of a file input, reads the selected image as a Data URI,
 * performs basic validation (size, type), and calls the provided setter function.
 *
 * @param event - The React change event from the file input element.
 * @param setImage - A state setter function (e.g., from useState) to store the resulting Data URI string or null.
 */
export const handleImageUploadUtil = (
    event: React.ChangeEvent<HTMLInputElement>,
    setImage: (value: string | null) => void
): void => {
  const file = event.target.files?.[0];

  // Reset image state if no file is selected or selection is cancelled
  if (!file) {
    setImage(null);
    // Clear the file input value to allow re-selecting the same file if needed
    event.target.value = '';
    return;
  }

  // --- Validation ---

  // Check file type (allow common image types)
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  if (!allowedTypes.includes(file.type)) {
    toast({
      title: "Invalid File Type",
      description: `Please select a valid image file (${allowedTypes.map(t => t.split('/')[1]).join(', ')}).`,
      variant: "destructive",
    });
    setImage(null); // Clear potentially previously selected valid image
    event.target.value = ''; // Clear the file input
    return;
  }

  // Check file size
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    toast({
      title: "File Too Large",
      description: `Image size cannot exceed ${MAX_IMAGE_SIZE_MB}MB.`,
      variant: "destructive",
    });
     setImage(null); // Clear potentially previously selected valid image
     event.target.value = ''; // Clear the file input
    return;
  }

  // --- Read File ---
  const reader = new FileReader();

  reader.onloadend = () => {
    const result = reader.result as string;
    // Basic check if the result looks like a data URI
    if (result && result.startsWith('data:image')) {
        setImage(result);
    } else {
        console.error("FileReader failed to produce a valid Data URI.");
        toast({
            title: "Read Error",
            description: "Could not read the selected image file.",
            variant: "destructive",
          });
        setImage(null);
        event.target.value = ''; // Clear the file input on error too
    }
  };

  reader.onerror = (error) => {
    console.error("FileReader error:", error);
    toast({
        title: "Read Error",
        description: "An error occurred while reading the image file.",
        variant: "destructive",
      });
    setImage(null);
    event.target.value = ''; // Clear the file input
  };

  // Read the file as a Data URL
  reader.readAsDataURL(file);
};
