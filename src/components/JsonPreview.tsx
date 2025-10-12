import { useState } from "react";
import { createPortal } from "react-dom";
import { Eye, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface JsonPreviewProps {
  data: unknown;
  title: string;
  buttonLabel?: string;
  className?: string;
}

const modalRoot = typeof document !== "undefined" ? document.body : null;

export const JsonPreview = ({ data, title, buttonLabel, className }: JsonPreviewProps) => {
  const [open, setOpen] = useState(false);

  if (data === null || data === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur">
      <div className="relative w-[min(90vw,680px)] max-h-[85vh] overflow-hidden rounded-lg border border-border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <Button variant="ghost" size="icon" onClick={handleClose} aria-label="Close JSON preview">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-[75vh] overflow-auto px-4 py-3">
          <pre className="whitespace-pre-wrap break-all text-xs leading-relaxed text-foreground">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleOpen}
        className={cn("h-8 w-8", className)}
        aria-label={`Ver ${title}`}
        title={`Ver ${title}`}
      >
        <Eye className="h-4 w-4" />
        {buttonLabel ? <span className="sr-only">{buttonLabel}</span> : null}
      </Button>
      {open && modalRoot ? createPortal(content, modalRoot) : null}
    </>
  );
};
