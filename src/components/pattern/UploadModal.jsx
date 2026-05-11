import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ImageUploader from './ImageUploader';
import PropTypes from 'prop-types';

export default function UploadModal({ open, onOpenChange, images, onImagesChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Custom Images</DialogTitle>
        </DialogHeader>
        <ImageUploader images={images} setImages={onImagesChange} />
      </DialogContent>
    </Dialog>
  );
}

UploadModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  images: PropTypes.array.isRequired,
  onImagesChange: PropTypes.func.isRequired,
};
