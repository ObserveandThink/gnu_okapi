/**
 * @fileOverview Home page component displaying the list of Spaces.
 */
"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from "react";
import { useSpaceContext } from "@/contexts/SpaceContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatShortDate } from '@/utils/dateUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, Trash2 } from 'lucide-react'; // Removed Gamepad2 icon

type SortKey = "dateCreated" | "dateModified";

export default function Home() {
  const router = useRouter();
  const { spaces, isLoading, error, deleteSpace, loadSpaces, duplicateSpace } = useSpaceContext();
  const [sortBy, setSortBy] = useState<SortKey>("dateModified"); // Default sort by modified

  useEffect(() => {
    // Context handles initial load
  }, []); // Empty dependency array

  const handleCreateSpace = () => {
    router.push('/new-space');
  };

  const handleSpaceClick = (spaceId: string) => {
    router.push(`/space/${spaceId}`);
  };

  // Removed handleGameClick as the game page is deleted

  const handleDeleteConfirm = async (spaceId: string) => {
    await deleteSpace(spaceId);
  };

  const handleDuplicateConfirm = async (spaceId: string) => {
    await duplicateSpace(spaceId);
    // Context state updates should trigger re-render
  };

  const sortedSpaces = useMemo(() => {
    return [...spaces].sort((a, b) => {
      // Handle potential invalid dates if necessary, though should be Date objects from context
      const dateA = new Date(a[sortBy] || 0).getTime();
      const dateB = new Date(b[sortBy] || 0).getTime();
      // Sort descending (newest first)
      return dateB - dateA;
    });
  }, [spaces, sortBy]);

  return (
    <div className="flex flex-col items-center justify-start min-h-screen py-8 bg-background p-4">
      <header className="w-full text-center mb-8">
        <h1 className="text-4xl font-bold text-primary">Welcome to OkapiFlow</h1>
        <p className="text-lg text-foreground mt-2">
          Your process improvement companion. {/* Simplified description */}
        </p>
      </header>

      <main className="w-full max-w-6xl">
        <section className="mb-8 flex justify-center sm:justify-start">
          <Button
            size="lg"
            onClick={handleCreateSpace}
            disabled={isLoading} // Disable button during initial load
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Create New Space
          </Button>
        </section>

        <section>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
            <h2 className="text-2xl font-bold text-foreground">Your Spaces</h2>
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort by:</span>
                 <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortKey)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sort by..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="dateModified">Last Modified</SelectItem>
                        <SelectItem value="dateCreated">Date Created</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && spaces.length === 0 && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="bg-card p-4">
                        <CardHeader>
                             <Skeleton className="h-6 w-3/4 mb-2" />
                        </CardHeader>
                        <CardContent>
                             <Skeleton className="h-20 w-full mb-2" />
                             <Skeleton className="h-4 w-full mb-1" />
                             <Skeleton className="h-4 w-1/2" />
                             <Skeleton className="h-8 w-full mt-4" />
                        </CardContent>
                    </Card>
                ))}
            </div>
          )}

           {/* Error State */}
          {error && !isLoading && (
             <div className="text-center text-destructive mt-4">
                <p>Error loading spaces: {error}</p>
                <Button onClick={loadSpaces} variant="outline" className="mt-2">Retry</Button>
            </div>
          )}


          {/* Empty State */}
          {!isLoading && !error && spaces.length === 0 && (
             <div className="text-center text-muted-foreground mt-8">
                <p>No spaces created yet. Get started by creating one!</p>
            </div>
          )}

          {/* Display Spaces */}
          {!isLoading && !error && spaces.length > 0 && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedSpaces.map((space) => (
                <Card
                    className="bg-card rounded-lg overflow-hidden shadow-md transition-shadow duration-300 hover:shadow-lg flex flex-col"
                    key={space.id}
                >
                    <CardHeader
                        className="cursor-pointer p-4"
                        onClick={() => handleSpaceClick(space.id)}
                    >
                    <CardTitle className="text-xl font-bold mb-1 truncate">{space.name}</CardTitle>
                     <div className="flex space-x-2 mt-1">
                         {space.beforeImage && (
                            <img data-ai-hint="workspace before" src={space.beforeImage} alt="Before" className="rounded-md max-h-24 object-cover flex-1" />
                         )}
                          {space.afterImage && (
                            <img data-ai-hint="workspace after" src={space.afterImage} alt="After" className="rounded-md max-h-24 object-cover flex-1" />
                          )}
                     </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 flex-grow">
                    <CardDescription className="text-foreground mb-2 line-clamp-2">{space.description || "No description"}</CardDescription>
                    {space.goal && <CardDescription className="text-sm text-primary mb-2">Goal: {space.goal}</CardDescription>}
                    <div className="space-y-1 text-xs text-muted-foreground mt-auto">
                         <p>
                            Created: {formatShortDate(space.dateCreated)}
                         </p>
                         <p>
                            Modified: {formatShortDate(space.dateModified)}
                         </p>
                         <p>
                            Total Time: {space.totalClockedInTime} min
                         </p>
                    </div>

                    </CardContent>
                     <div className="p-4 pt-0 mt-auto flex gap-2 items-stretch"> {/* Container for buttons */}
                         {/* Duplicate Button */}
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" size="icon" className="h-auto w-10" title="Duplicate Space">
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Duplicate Space?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will create a copy of "{space.name}" with its actions. Log entries, comments, waste, and clocked time will not be copied.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                     <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDuplicateConfirm(space.id)}>
                                        Duplicate
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        {/* Delete Button */}
                        <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" className="h-auto w-10" title="Delete Space">
                                <Trash2 className="h-4 w-4" /> {/* Use Trash2 icon */}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the space "{space.name}"
                                and all associated actions, logs, waste entries, and comments.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                             <AlertDialogFooter>
                                 <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteConfirm(space.id)}>
                                    Delete
                                </AlertDialogAction>
                             </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>

                         {/* Button to go to the space details (occupies remaining space) */}
                        <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleSpaceClick(space.id)}
                            title="Go to Space Details"
                         >
                            Open Space
                         </Button>
                     </div>
                </Card>
                ))}
             </div>
            )}
        </section>
      </main>
    </div>
  );
}
