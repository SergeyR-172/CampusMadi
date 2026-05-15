import { useLayoutEffect, useRef, useState } from "react";

import { Bold, Italic, List, ListChecks, ListOrdered, Paperclip, Save, Underline } from "lucide-react";

import { cn } from "#/shared/lib";

type Props = {
  initialTitle?: string;
  initialBody?: string;
  onSave: (title: string, body: string) => void;
  isLoading?: boolean;
};

type ToolbarBtnProps = {
  onMouseDown?: (e: React.MouseEvent) => void;
  onClick?: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
};

const ToolbarBtn = ({ onMouseDown, onClick, disabled, title, children }: ToolbarBtnProps) => (
  <button
    type="button"
    title={title}
    disabled={disabled}
    onMouseDown={onMouseDown}
    onClick={onClick}
    className={cn(
      "flex h-7 w-7 items-center justify-center rounded text-foreground transition-colors hover:bg-gray-100 active:bg-gray-200",
      disabled && "cursor-not-allowed opacity-40",
    )}
  >
    {children}
  </button>
);

export const NoteEditor = ({ initialTitle = "", initialBody = "", onSave, isLoading }: Props) => {
  const [title, setTitle] = useState(initialTitle);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Store initial body in a ref so the layout effect has no reactive deps
  const initialBodyRef = useRef(initialBody);

  useLayoutEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.innerHTML = initialBodyRef.current;
    }
  }, []);

  // onMouseDown + preventDefault keeps focus inside the contentEditable
  const fmt = (command: string, value?: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.execCommand(command, false, value);
    bodyRef.current?.focus();
  };

  const handleSave = () => {
    onSave(title, bodyRef.current?.innerHTML ?? "");
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-0.5 border-b border-gray-100 pb-3">
        <ToolbarBtn onMouseDown={fmt("bold")} title="Жирный">
          <Bold size={15} />
        </ToolbarBtn>
        <ToolbarBtn onMouseDown={fmt("italic")} title="Курсив">
          <Italic size={15} />
        </ToolbarBtn>
        <ToolbarBtn onMouseDown={fmt("underline")} title="Подчёркнутый">
          <Underline size={15} />
        </ToolbarBtn>
        <ToolbarBtn onMouseDown={fmt("insertOrderedList")} title="Нумерованный список">
          <ListOrdered size={15} />
        </ToolbarBtn>
        <ToolbarBtn onMouseDown={fmt("insertUnorderedList")} title="Маркированный список">
          <List size={15} />
        </ToolbarBtn>
        <ToolbarBtn onMouseDown={fmt("insertText", "☐ ")} title="Список задач">
          <ListChecks size={15} />
        </ToolbarBtn>
        <ToolbarBtn disabled title="Прикрепить файл (скоро)">
          <Paperclip size={15} />
        </ToolbarBtn>

        <div className="ml-auto">
          <ToolbarBtn onClick={handleSave} disabled={isLoading} title="Сохранить">
            <Save size={15} />
          </ToolbarBtn>
        </div>
      </div>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Заголовок"
        className="mb-3 w-full text-base font-semibold text-foreground placeholder:text-gray-400 focus:outline-none"
      />

      {/* Body */}
      <div
        ref={bodyRef}
        contentEditable
        suppressContentEditableWarning
        className="min-h-[80px] text-sm text-foreground focus:outline-none [&_ol]:list-decimal [&_ol]:pl-4 [&_ul]:list-disc [&_ul]:pl-4"
      />
    </div>
  );
};
