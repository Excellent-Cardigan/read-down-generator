import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Keyboard } from 'lucide-react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import PropTypes from 'prop-types';

const KeyboardShortcutsModal = ({ 
  onRender, 
  onDownload, 
  onUndo, 
  onRedo, 
  isRendering, 
  hasPatterns 
}) => {
  const { shortcuts } = useKeyboardShortcuts({
    onRender,
    onDownload,
    onUndo,
    onRedo,
    isRendering,
    hasPatterns
  });

  const shortcutItems = [
    { action: 'Render Pattern', shortcut: shortcuts.render, available: !isRendering },
    { action: 'Download Pattern', shortcut: shortcuts.download, available: hasPatterns },
    { action: 'Undo', shortcut: shortcuts.undo, available: !!onUndo },
    { action: 'Redo', shortcut: shortcuts.redo, available: !!onRedo }
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Keyboard className="h-4 w-4" />
          Shortcuts
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use these keyboard shortcuts to work faster:
          </p>
          <div className="space-y-3">
            {shortcutItems.map((item, index) => (
              <div 
                key={index} 
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  item.available 
                    ? 'bg-background border-border' 
                    : 'bg-muted/50 border-muted text-muted-foreground'
                }`}
              >
                <span className="text-sm font-medium">{item.action}</span>
                <kbd className={`px-2 py-1 text-xs font-mono rounded bg-muted border ${
                  item.available ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {item.shortcut}
                </kbd>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              💡 Tip: Shortcuts won&apos;t work when typing in text fields
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

KeyboardShortcutsModal.propTypes = {
  onRender: PropTypes.func,
  onDownload: PropTypes.func,
  onUndo: PropTypes.func,
  onRedo: PropTypes.func,
  isRendering: PropTypes.bool,
  hasPatterns: PropTypes.bool
};

export default KeyboardShortcutsModal; 