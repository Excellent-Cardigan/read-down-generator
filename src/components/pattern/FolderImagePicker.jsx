import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import PropTypes from 'prop-types';

export default function FolderImagePicker({ open, onOpenChange, images, onApply, title }) {
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    if (open) {
      setSelected(new Set(images.map(img => img.name)));
    }
  }, [open, images]);

  const toggle = (name) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleApply = () => {
    onApply(images.filter(img => selected.has(img.name)));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {images.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No images found. Add PNG files to the folder and restart the dev server.
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-2 py-2 max-h-72 overflow-y-auto">
            {images.map(img => {
              const isSelected = selected.has(img.name);
              return (
                <button
                  key={img.name}
                  onClick={() => toggle(img.name)}
                  className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all ${
                    isSelected ? 'border-primary opacity-100' : 'border-transparent opacity-40 hover:opacity-60'
                  }`}
                >
                  <img src={img.preview} alt={img.name} className="w-full h-full object-cover" />
                </button>
              );
            })}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleApply} disabled={selected.size === 0}>
            Apply ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

FolderImagePicker.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  images: PropTypes.array.isRequired,
  onApply: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
};
