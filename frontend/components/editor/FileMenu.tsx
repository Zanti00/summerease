"use client";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface FileMenuProps {
  onSave: () => void;
  isSaving: boolean;
  onDownload: () => void;
  isDownloadDisabled: boolean;
  onRename: () => void;
  onPrint: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

export function FileMenu({
  onSave,
  isSaving,
  onDownload,
  isDownloadDisabled,
  onRename,
  onPrint,
  onDelete,
}: FileMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="h-auto py-1 px-3 text-sm font-normal text-foreground hover:bg-muted rounded-sm bg-transparent border-0 focus-visible:ring-0 outline-none cursor-pointer">
        File
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40 bg-popover text-popover-foreground border border-border shadow-md rounded-md p-1">
        <DropdownMenuItem 
          onClick={onSave} 
          disabled={isSaving}
          className="cursor-pointer"
        >
          Save
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={onDownload} 
          disabled={isDownloadDisabled}
          className="cursor-pointer"
        >
          Download
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={onRename}
          className="cursor-pointer"
        >
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={onPrint}
          className="cursor-pointer"
        >
          Print
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={onDelete}
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


