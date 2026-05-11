import { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('bg-white rounded-2xl shadow-md p-6', className)}>{children}</div>;
}

export function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-serif text-green-900 font-bold">{title}</h2>
      {action}
    </div>
  );
}
