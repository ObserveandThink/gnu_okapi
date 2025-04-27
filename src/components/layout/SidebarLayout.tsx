"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import React from "react";

export const SidebarLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Card>
            <CardHeader>
              <CardTitle>OkapiFlow</CardTitle>
            </CardHeader>
            <CardContent>
              Gamified Process Improvement
            </CardContent>
          </Card>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Spaces</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Create New Space</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter></SidebarFooter>
        <SidebarRail />
      </Sidebar>
      {children}
    </SidebarProvider>
  );
};

const SidebarGroupLabel = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="px-4 py-2 text-sm font-medium text-muted-foreground">
      {children}
    </div>
  );
};
