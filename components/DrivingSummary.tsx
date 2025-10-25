import React from 'https://esm.sh/react@18.2.0';
import { Loader, ShieldCheck } from 'https://esm.sh/lucide-react@0.378.0';

interface DrivingSummaryProps {
  summary: string | null;
  isLoading: boolean;
}

const DrivingSummary: React.FC<DrivingSummaryProps> = ({ summary, isLoading }) => {
  if (isLoading) {
    return (
      <div className="mt-4 p-4 bg-secondary-background-color/50 rounded-lg text-center">
        <Loader className="w-6 h-6 text-light-primary-color animate-spin mx-auto mb-2" />
        <p className="text-secondary-text-color">AI is analyzing the trip data...</p>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-secondary-background-color/50 rounded-lg">
      <h4 className="text-md font-semibold mb-2 flex items-center text-light-primary-color">
        <ShieldCheck className="w-5 h-5 mr-2" />
        AI Driving Summary
      </h4>
      <p className="text-secondary-text-color leading-relaxed text-sm">{summary}</p>
    </div>
  );
};

export default DrivingSummary;
