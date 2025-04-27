import { SidebarLayout } from '@/components/layout/SidebarLayout';

export default function Home() {
  return (
    <SidebarLayout>
      <div className="p-4">
        <h1>Welcome to OkapiFlow</h1>
        <p>Get started by creating your first Space!</p>
      </div>
    </SidebarLayout>
  );
}
