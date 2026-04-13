const variants: Record<string, string> = {
  draft: 'bg-gray-700 text-gray-300',
  sent: 'bg-blue-900/50 text-blue-300',
  paid: 'bg-green-900/50 text-green-300',
  overdue: 'bg-red-900/50 text-red-300',
  not_started: 'bg-gray-700 text-gray-300',
  in_progress: 'bg-amber-900/50 text-amber-300',
  completed: 'bg-green-900/50 text-green-300',
};

const labels: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        variants[status] || 'bg-gray-700 text-gray-300'
      }`}
    >
      {labels[status] || status}
    </span>
  );
}
