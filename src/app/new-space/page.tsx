/**
 * @fileOverview Page component for creating a new Space.
 */
"use client";

import { useRouter } from "next/navigation";
import { useState } from 'react';
import type React from 'react';
import { useSpaceContext } from "@/contexts/SpaceContext"; // Use the refactored context
import { toast } from "@/hooks/use-toast"; // Keep using existing toast hook
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { handleImageUploadUtil } from '@/utils/imageUtils'; // Import utility

export default function NewSpacePage() {
  const router = useRouter();
  const { createSpace, isLoading, error } = useSpaceContext(); // Get createSpace function from context
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, setImage: (value: string | null) => void) => {
    handleImageUploadUtil(event, setImage); // Use the utility function
  };

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Space name is required.",
        variant: "destructive",
      });
      return;
    }

    const spaceData = {
      name: name.trim(),
      description: description.trim(),
      goal: goal.trim(),
      beforeImage,
      afterImage,
    };

    const createdSpace = await createSpace(spaceData); // Use context function

    if (createdSpace) {
        toast({
            title: "Space created!",
            description: `Space "${createdSpace.name}" has been successfully created.`,
        });
        router.push("/"); // Navigate back to home page after successful creation
    } else {
        // Error handling is done within the context hook using toast
        // You could add specific UI feedback here if needed
        console.error("Failed to create space (handled by context).");
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-md card-shadow">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Create New Space</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Space Name */}
            <div>
              <Label htmlFor="name">Space Name *</Label>
              <Input
                type="text"
                id="name"
                placeholder="Enter space name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="text-foreground"
                aria-required="true"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter space description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-foreground"
              />
            </div>

            {/* Goal */}
            <div>
              <Label htmlFor="goal">Goal</Label>
              <Input
                type="text"
                id="goal"
                placeholder="Enter space goal (optional)"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="text-foreground"
              />
            </div>

            {/* Before Image */}
            <div>
              <Label htmlFor="beforeImage">Before Image</Label>
              <Input
                type="file"
                id="beforeImage"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, setBeforeImage)}
                 className="text-foreground file:text-foreground"
              />
              {beforeImage && (
                <img src={beforeImage} alt="Before preview" className="mt-2 rounded max-h-40 object-cover" />
              )}
            </div>

            {/* After Image */}
            <div>
              <Label htmlFor="afterImage">After Image</Label>
              <Input
                type="file"
                id="afterImage"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, setAfterImage)}
                className="text-foreground file:text-foreground"
              />
              {afterImage && (
                <img src={afterImage} alt="After preview" className="mt-2 rounded max-h-40 object-cover" />
              )}
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Space"}
            </Button>

             {/* Display Context Error */}
             {error && (
                <p className="text-sm text-destructive mt-2">{error}</p>
             )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
