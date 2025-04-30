/**
 * @fileOverview Utility functions for handling and formatting dates.
 */

import { format as formatFns } from 'date-fns';

/**
 * Formats a Date object into a short date string (e.g., "MMM dd, yyyy").
 * Returns 'Invalid Date' if the input is not a valid Date.
 * @param date - The Date object to format.
 * @returns The formatted date string or 'Invalid Date'.
 */
export const formatShortDate = (date: Date | string | number | undefined | null): string => {
  if (!date) return 'N/A';
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    return formatFns(dateObj, 'MMM dd, yyyy');
  } catch (e) {
    console.error("Error formatting short date:", e);
    return 'Invalid Date';
  }
};

/**
 * Formats a Date object into a time string (e.g., "hh:mm a").
 * Returns 'Invalid Date' if the input is not a valid Date.
 * @param date - The Date object to format.
 * @returns The formatted time string or 'Invalid Date'.
 */
export const formatTime = (date: Date | string | number | undefined | null): string => {
  if (!date) return 'N/A';
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    return formatFns(dateObj, 'hh:mm a');
  } catch (e) {
    console.error("Error formatting time:", e);
    return 'Invalid Date';
  }
};

/**
 * Formats a Date object into a detailed date and time string (e.g., "MMM dd, yyyy hh:mm a").
 * Returns 'Invalid Date' if the input is not a valid Date.
 * @param date - The Date object to format.
 * @returns The formatted date-time string or 'Invalid Date'.
 */
export const formatDateTime = (date: Date | string | number | undefined | null): string => {
    if (!date) return 'N/A';
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
      }
      return formatFns(dateObj, 'MMM dd, yyyy hh:mm a');
    } catch (e) {
      console.error("Error formatting date-time:", e);
      return 'Invalid Date';
    }
  };


/**
 * Formats a duration in seconds into an HH:MM:SS string.
 * @param timeInSeconds - The duration in seconds.
 * @returns The formatted time string (e.g., "01:23:45").
 */
export const formatElapsedTime = (timeInSeconds: number): string => {
  if (typeof timeInSeconds !== 'number' || timeInSeconds < 0) {
      return '00:00:00';
  }
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = Math.floor(timeInSeconds % 60); // Use floor to avoid fractional seconds

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};
