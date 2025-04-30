/**
 * @fileOverview Home page component displaying the list of Spaces.
 */
"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from "react";
import { useSpaceContext } from "@/contexts/SpaceContext"; // Use the refactored context
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Shadcn select
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

// Keep Space interface local if only used here, otherwise import from domain
// import type { Space } from '@/core/domain/Space';

type SortKey = "dateCreated" | "dateModified";

export default function Home() {
  const router = useRouter();
  const { spaces, isLoading, error, deleteSpace, loadSpaces } = useSpaceContext(); // Get data and actions from context
  const [sortBy, setSortBy] = useState<SortKey>("dateCreated");

  // No need for local useEffect to load spaces, context handles initial load.
  // We might need a refresh button or pull-to-refresh later.

  const handleCreateSpace = () => {
    router.push('/new-space');
  };

  const handleSpaceClick = (spaceId: string) => {
    router.push(`/space/${spaceId}`);
  };

  const handleDeleteConfirm = async (spaceId: string) => {
    await deleteSpace(spaceId);
    // Context state updates should trigger re-render
  };

  const sortedSpaces = useMemo(() => {
    return [...spaces].sort((a, b) => {
      const dateA = new Date(a[sortBy]).getTime();
      const dateB = new Date(b[sortBy]).getTime();
      // Sort descending (newest first)
      return dateB - dateA;
    });
  }, [spaces, sortBy]);

  return (
    <div className="flex flex-col items-center justify-start min-h-screen py-8 bg-background p-4">
      <header className="w-full text-center mb-8">
        <h1 className="text-4xl font-bold text-primary">Welcome to OkapiFlow</h1>
        <p className="text-lg text-foreground mt-2">
          Your gamified process improvement companion.
        </p>
      </header>

      <main className="w-full max-w-6xl">
        <section className="mb-8 flex justify-center sm:justify-start">
          <Button
            size="lg"
            onClick={handleCreateSpace}
            disabled={isLoading}
            className="bg-primary text-primary-foreground hover:bg-primary/90" // Ensure styling consistency
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
                    className="bg-card rounded-lg overflow-hidden card-shadow transition-shadow duration-300 hover:shadow-lg flex flex-col" // Added flex flex-col
                    key={space.id}
                >
                    <CardHeader
                        className="cursor-pointer p-4" // Adjust padding
                        onClick={() => handleSpaceClick(space.id)}
                    >
                    <CardTitle className="text-xl font-bold mb-1 truncate">{space.name}</CardTitle> {/* Smaller title, truncate */}
                     <div className="flex space-x-2 mt-1"> {/* Images side-by-side */}
                         {space.beforeImage && (
                            <img src={space.beforeImage} alt="Before" className="rounded-md max-h-24 object-cover flex-1" /> // Smaller images
                         )}
                          {space.afterImage && (
                            <img src={space.afterImage} alt="After" className="rounded-md max-h-24 object-cover flex-1" /> // Smaller images
                          )}
                     </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 flex-grow"> {/* Adjust padding, flex-grow */}
                    <CardDescription className="text-foreground mb-2 line-clamp-2">{space.description || "No description"}</CardDescription> {/* Line clamp */}
                    {space.goal && <CardDescription className="text-sm text-primary mb-2">Goal: {space.goal}</CardDescription>}
                    <div className="space-y-1 text-xs text-muted-foreground mt-auto"> {/* mt-auto pushes dates to bottom */}
                         <p>
                            Created: {format(new Date(space.dateCreated), 'MMM dd, yyyy')}
                         </p>
                         <p>
                            Modified: {format(new Date(space.dateModified), 'MMM dd, yyyy')}
                         </p>
                         <p>
                            Total Time: {space.totalClockedInTime} min
                         </p>
                    </div>

                    </CardContent>
                     <div className="p-4 pt-0 mt-auto"> {/* Ensure delete button is at bottom */}
                        <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full">Delete</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the space
                                and all associated actions, logs, waste entries, and comments.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="flex justify-end gap-2 mt-4">
                                 <AlertDialogCancel asChild>
                                    <Button variant="secondary">Cancel</Button>
                                </AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteConfirm(space.id)} className={buttonVariants({variant: "destructive"})}>
                                    Delete
                                </AlertDialogAction>
                            </div>
                        </AlertDialogContent>
                        </AlertDialog>
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

// Utility function for button variants if needed, or rely on Shadcn's variants
const buttonVariants = ({ variant }: { variant: "destructive" | "secondary" | "default" }) => {
    switch(variant) {
        case "destructive": return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
        case "secondary": return "bg-secondary text-secondary-foreground hover:bg-secondary/80";
        default: return "bg-primary text-primary-foreground hover:bg-primary/90";
    }
};
