"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { v4 as uuidv4 } from "uuid";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/hooks/use-toast";

interface Space {
  id: string;
  name: string;
  description?: string;
  goal?: string;
}

interface Action {
  id: string;
  name: string;
  spaceId: string;
  description?: string;
  points: number;
}

const actionSchema = z.object({
  name: z.string().min(2, {
    message: "Action name must be at least 2 characters.",
  }),
  description: z.string().optional(),
  points: z.number().min(1, {
    message: "Points must be at least 1.",
  }),
});

export default function SpaceDetailPage({
  params,
}: {
  params: { spaceId: string };
}) {
  const { spaceId } = params;
  const [space, setSpace] = useState<Space | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    const storedSpaces = localStorage.getItem("spaces");
    if (storedSpaces) {
      const spaces: Space[] = JSON.parse(storedSpaces);
      const foundSpace = spaces.find((s) => s.id === spaceId);
      if (foundSpace) {
        setSpace(foundSpace);
      }
    }

    // Load actions from local storage based on spaceId
    const storedActions = localStorage.getItem(`actions-${spaceId}`);
    if (storedActions) {
      const parsedActions: Action[] = JSON.parse(storedActions);
      setActions(parsedActions);

      // Calculate initial total points
      const initialPoints = parsedActions.reduce(
        (acc, action) => acc + action.points,
        0
      );
      setTotalPoints(initialPoints);
    } else {
      setTotalPoints(0); // Reset points if no actions are found
    }
  }, [spaceId]);

  useEffect(() => {
    // Save actions to local storage whenever actions change
    localStorage.setItem(`actions-${spaceId}`, JSON.stringify(actions));
  }, [actions, spaceId]);

  const handleActionClick = (action: Action) => {
    setTotalPoints((prevPoints) => prevPoints + action.points);
    toast({
      title: "Action Logged!",
      description: `You earned ${action.points} points for completing "${action.name}".`,
    });
  };

  const ActionForm = () => {
    const form = useForm<z.infer<typeof actionSchema>>({
      resolver: zodResolver(actionSchema),
      defaultValues: {
        name: "",
        description: "",
        points: 1,
      },
    });

    async function onSubmit(values: z.infer<typeof actionSchema>) {
      const id = uuidv4(); // Generate a unique ID
      const newAction: Action = { ...values, id, spaceId: spaceId };

      // Update actions state
      setActions((prevActions) => [...prevActions, newAction]);

      toast({
        title: "Action created!",
        description: `Action "${values.name}" has been successfully created.`,
      });

      form.reset(); // Clear the form
    }

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Action Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter action name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="Enter action description" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="points"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Points</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter points for action"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Create Action</Button>
        </form>
      </Form>
    );
  };

  if (!space) {
    return <div>Space not found</div>;
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen py-8">
      <h1 className="text-4xl font-bold mb-4">{space.name}</h1>
      <p className="text-lg mb-8">{space.description}</p>

      <div className="flex space-x-4 mb-8">
        <Button variant="secondary">
          <Edit className="mr-2 h-5 w-5" />
          Edit Space
        </Button>
        <Button variant="destructive">
          <Trash2 className="mr-2 h-5 w-5" />
          Delete Space
        </Button>
      </div>

      <h2 className="text-2xl font-bold mb-4">Actions</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-6xl">
        {actions.map((action) => (
          <Button key={action.id} onClick={() => handleActionClick(action)}>
            {action.name} (+{action.points} points)
          </Button>
        ))}
      </div>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Plus className="mr-2 h-5 w-5" />
            Add Action
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Action</DialogTitle>
            <DialogDescription>
              Create a new action for this space.
            </DialogDescription>
          </DialogHeader>
          <ActionForm />
        </DialogContent>
      </Dialog>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-2">Total Points:</h2>
        <p className="text-lg">{totalPoints}</p>
      </div>
    </div>
  );
}
