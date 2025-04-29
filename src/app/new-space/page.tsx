"use client";

import { useRouter } from "next/navigation";
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewSpacePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, setImage: (value: string | null) => void) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!name) {
      toast({
        title: "Error",
        description: "Space name is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      const id = uuidv4();
      const now = new Date();
      const newSpace = { 
        id, 
        name, 
        description, 
        goal, 
        beforeImage, 
        afterImage,
        dateCreated: now,
        dateModified: now,
        totalClockedInTime: 0,
      };

      const storedSpaces = localStorage.getItem("spaces");
      const existingSpaces = storedSpaces ? JSON.parse(storedSpaces) : [];

      const updatedSpaces = [...existingSpaces, newSpace];
      localStorage.setItem("spaces", JSON.stringify(updatedSpaces));

      toast({
        title: "Space created!",
        description: `Space "${name}" has been successfully created.`,
      });
      router.push("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create space.",
        variant: "destructive",
      });
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
            <div>
              <Label htmlFor="name" className="block text-sm font-medium text-foreground">Space Name</Label>
              <Input
                type="text"
                id="name"
                className="w-full p-2 border rounded text-foreground"
                placeholder="Enter space name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="description" className="block text-sm font-medium text-foreground">Description</Label>
              <Textarea
                id="description"
                className="w-full p-2 border rounded text-foreground"
                placeholder="Enter space description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="goal" className="block text-sm font-medium text-foreground">Goal (Optional)</Label>
              <Input
                type="text"
                id="goal"
                className="w-full p-2 border rounded text-foreground"
                placeholder="Enter space goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="beforeImage" className="block text-sm font-medium text-foreground">Before Image (Optional)</Label>
              <Input
                type="file"
                id="beforeImage"
                accept="image/*"
                className="w-full p-2 border rounded"
                type="file"
                onChange={(e) => handleImageUpload(e, setBeforeImage)}
              />
              {beforeImage && (
                <img src={beforeImage} alt="Before" className="mt-2 rounded max-h-40 object-cover" />
              )}
            </div>
            <div>
              <Label htmlFor="afterImage" className="block text-sm font-medium text-foreground">After Image (Optional)</Label>
              <Input
                type="file"
                id="afterImage"
                accept="image/*"
                className="w-full p-2 border rounded"
                type="file"
                onChange={(e) => handleImageUpload(e, setAfterImage)}
              />
              {afterImage && (
                <img src={afterImage} alt="After" className="mt-2 rounded max-h-40 object-cover" />
              )}
            </div>
            <Button type="submit" className="w-full bg-primary text-primary-foreground rounded p-3 font-bold">
              Create Space
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
