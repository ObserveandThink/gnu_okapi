"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

const spaceSchema = z.object({
  name: z.string().min(2, {
    message: "Space name must be at least 2 characters.",
  }),
  description: z.string().optional(),
  goal: z.string().optional(),
});

export default function NewSpacePage() {
  const router = useRouter();
  const form = useForm<z.infer<typeof spaceSchema>>({
    resolver: zodResolver(spaceSchema),
    defaultValues: {
      name: "",
      description: "",
      goal: "",
    },
  });

  async function onSubmit(values: z.infer<typeof spaceSchema>) {
    // Simulate saving to a database
    await new Promise((resolve) => setTimeout(resolve, 500));
    toast({
      title: "Space created!",
      description: `Space "${values.name}" has been successfully created.`,
    });
    router.push("/");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-4xl font-bold mb-4">Create New Space</h1>
      <div className="w-full max-w-md border rounded-lg p-6 bg-card text-card-foreground shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Space Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter space name" {...field} />
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
                    <Textarea
                      placeholder="Enter space description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter space goal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Create Space</Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
