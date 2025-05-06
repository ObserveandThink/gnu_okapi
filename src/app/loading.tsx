// src/app/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Loading() {
  // You can add any UI inside Loading, including a Skeleton.
  return (
     <div className="flex flex-col items-center justify-start min-h-screen py-4 bg-background p-2">
         {/* Mimic the structure of the SpaceDetailPage */}
         <Card className="w-full max-w-4xl mb-2">
            <CardHeader className="p-2 flex flex-row items-center justify-between">
                <Skeleton className="h-6 w-1/2" /> {/* Placeholder for title */}
                <Skeleton className="h-8 w-16" /> {/* Placeholder for back button */}
            </CardHeader>
         </Card>
         <Card className="w-full max-w-4xl mb-2">
            <CardContent className="p-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                <Skeleton className="h-10 w-full" /> {/* Placeholder for clock button */}
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </CardContent>
         </Card>
         <div className="w-full max-w-4xl space-y-4 mt-2">
            <Skeleton className="h-24 w-full" /> {/* Actions placeholder */}
            <Skeleton className="h-40 w-full" /> {/* To-Do placeholder */}
            <Skeleton className="h-16 w-full" /> {/* Waste placeholder */}
            <Skeleton className="h-16 w-full" /> {/* Log placeholder */}
            <Skeleton className="h-20 w-full" /> {/* Comment placeholder */}
         </div>
     </div>
   );
}
