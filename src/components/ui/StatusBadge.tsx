import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Check, X, Clock, Play } from 'lucide-react';
import { Badge } from './badge';

type Status = 'draft' | 'pending' | 'queued' | 'processing' | 'completed' | 'failed';

interface StatusBadgeProps {
  status: Status;
  className?: string;
  showIcon?: boolean;
}

const statusConfig: Record<Status, { label: string; icon: React.ReactNode; className: string }> = {
  draft: {
    label: 'Draft',
    icon: <Clock className="w-3 h-3" />,
    className: 'status-draft',
  },
  pending: {
    label: 'Pending',
    icon: <Clock className="w-3 h-3" />,
    className: 'status-draft',
  },
  queued: {
    label: 'Queued',
    icon: <Play className="w-3 h-3" />,
    className: 'status-processing',
  },
  processing: {
    label: 'Processing',
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
    className: 'status-processing',
  },
  completed: {
    label: 'Completed',
    icon: <Check className="w-3 h-3" />,
    className: 'status-completed',
  },
  failed: {
    label: 'Failed',
    icon: <X className="w-3 h-3" />,
    className: 'status-failed',
  },
};

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium border-0',
        config.className,
        className
      )}
    >
      {showIcon && config.icon}
      {config.label}
    </Badge>
  );
}
