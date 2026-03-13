import { useMemo, useState, type DragEventHandler } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { formatMessage, type MessageCatalog } from "../i18n";

interface FileDropProps {
  label: string;
  description: string;
  buttonLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  accept: string[];
  multiple?: boolean;
  files: string[];
  copy: MessageCatalog["fileDrop"];
  onFilesSelected: (paths: string[]) => void;
}

const getBaseName = (path: string) => path.split(/[\\/]/).pop() ?? path;

const getDroppedPath = (file: File) =>
  (file as File & { path?: string }).path ?? null;

function FileDrop({
  label,
  description,
  buttonLabel,
  emptyTitle,
  emptyDescription,
  accept,
  multiple = false,
  files,
  copy,
  onFilesSelected,
}: FileDropProps) {
  const [dragging, setDragging] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  const extensionText = useMemo(
    () => accept.map((item) => `.${item}`).join(" / "),
    [accept],
  );

  const filterPaths = (paths: string[]) =>
    paths.filter((path) =>
      accept.some((extension) =>
        path.toLowerCase().endsWith(`.${extension.toLowerCase()}`),
      ),
    );

  const chooseFile = async () => {
    setLocalMessage(null);
    try {
      const selected = await open({
        filters: [
          {
            extensions: accept,
            name: label,
          },
        ],
        multiple,
        title: formatMessage(copy.dialogTitle, { label }),
      });

      if (!selected) {
        return;
      }

      const paths = Array.isArray(selected) ? selected : [selected];
      onFilesSelected(filterPaths(paths));
    } catch (error) {
      setLocalMessage(
        error instanceof Error ? error.message : copy.pickerFailed,
      );
    }
  };

  const onDrop: DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    setDragging(false);
    setLocalMessage(null);

    const droppedPaths = Array.from(event.dataTransfer.files)
      .map(getDroppedPath)
      .filter((value): value is string => Boolean(value));

    if (droppedPaths.length === 0) {
      setLocalMessage(copy.dropPathUnavailable);
      return;
    }

    const filtered = filterPaths(droppedPaths);
    if (filtered.length === 0) {
      setLocalMessage(
        formatMessage(copy.invalidType, { extensions: extensionText }),
      );
      return;
    }

    onFilesSelected(multiple ? filtered : [filtered[0]]);
  };

  return (
    <div
      className={`file-drop ${dragging ? "is-dragging" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setDragging(false);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDrop={onDrop}
    >
      <div className="file-drop-top">
        <div>
          <h3 className="file-drop-title">{label}</h3>
          <p className="file-drop-copy">
            {description} 支持拖拽或点击选择，接受格式 {extensionText}
          </p>
        </div>
        <button className="secondary-btn" type="button" onClick={() => void chooseFile()}>
          {buttonLabel}
        </button>
      </div>

      <div className="file-drop-body">
        {files.length > 0 ? (
          <div className="selected-list">
            {files.map((file) => (
              <div className="selected-item" key={file}>
                <span className="selected-name">{getBaseName(file)}</span>
                <span className="selected-path">{file}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="selected-item">
            <span className="selected-name">{emptyTitle}</span>
            <span className="selected-path">{emptyDescription}</span>
          </div>
        )}

        {localMessage ? (
          <div className="message message-warning">{localMessage}</div>
        ) : null}
      </div>
    </div>
  );
}

export default FileDrop;
