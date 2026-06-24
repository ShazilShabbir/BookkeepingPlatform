import { useRouter } from 'next/router';

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
}

export default function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-surface-900 truncate">{title}</h1>
        <p className="text-sm text-surface-500 truncate">{subtitle}</p>
      </div>
    </div>
  );
}
