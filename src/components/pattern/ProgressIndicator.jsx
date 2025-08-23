import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import PropTypes from 'prop-types';

const ProgressIndicator = ({ 
  progress = 0, 
  isRendering = false, 
  message = 'Generating pattern...',
  className = ''
}) => {
  if (!isRendering) return null;

  return (
    <div 
      className={`fixed top-4 right-4 w-80 h-24 bg-background border rounded-lg shadow-lg p-4 z-[9999] ${className}`}
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        willChange: 'transform',
        contain: 'layout style paint'
      }}
    >
      <div className="flex items-center space-x-3 mb-3 h-12">
        <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="text-sm font-medium truncate">{message}</p>
          <p className="text-xs text-muted-foreground truncate">
            {progress > 0 ? `${Math.round(progress)}% complete` : 'Processing...'}
          </p>
        </div>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
};

ProgressIndicator.propTypes = {
  progress: PropTypes.number,
  isRendering: PropTypes.bool,
  message: PropTypes.string,
  className: PropTypes.string
};

export default ProgressIndicator; 