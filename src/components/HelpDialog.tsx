import { Keyboard, MousePointer2, HardDrive, ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
const shortcuts = [
  ['Select', 'V or 1'],
  ['Hand / pan', 'H or Space + drag'],
  ['Rectangle', 'R'],
  ['Arrow / connection', 'A'],
  ['Freehand draw', 'P'],
  ['Text', 'T'],
  ['Undo', '⌘ / Ctrl + Z'],
  ['Redo', '⌘ / Ctrl + Shift + Z'],
  ['Duplicate selection', '⌘ / Ctrl + D'],
  ['Group selection', '⌘ / Ctrl + G'],
  ['Zoom to fit', 'Shift + 1'],
]
export function HelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="help-dialog sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>A few shortcuts to your next big idea.</DialogTitle>
          <DialogDescription>Less time looking for tools. More time thinking.</DialogDescription>
        </DialogHeader>
        <div className="help-section">
          <h3>
            <MousePointer2 size={17} /> Make yourself at home
          </h3>
          <p>
            Click a component to add it to the center of your canvas, or drag it into place. Choose
            the arrow tool (A) and drag from one component to another. Drop the endpoints on or near
            the cards to attach them; the arrow follows when you move either component. Hold ⌘ /
            Ctrl while drawing to leave an arrow unattached. Double-click a label to edit it.
            Shift-click to select multiple items.
          </p>
        </div>
        <div className="help-section">
          <h3>
            <Keyboard size={17} /> Canvas shortcuts
          </h3>
          <div className="shortcut-grid">
            {shortcuts.map(([label, key]) => (
              <div key={label}>
                <span>{label}</span>
                <kbd>{key}</kbd>
              </div>
            ))}
          </div>
        </div>
        <div className="help-local">
          <HardDrive size={20} />
          <div>
            <strong>Your workspace lives in this browser.</strong>
            <p>
              Changes save automatically on this device. Clearing site data removes your diagrams.
              Exports and cloud sync are not included in this version.
            </p>
          </div>
        </div>
        <div className="help-links">
          <a
            href="https://github.com/donnemartin/system-design-primer"
            target="_blank"
            rel="noreferrer"
          >
            System Design Primer <ExternalLink size={12} />
          </a>
          <a
            href="https://github.com/ByteByteGoHq/system-design-101"
            target="_blank"
            rel="noreferrer"
          >
            System Design 101 <ExternalLink size={12} />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  )
}
