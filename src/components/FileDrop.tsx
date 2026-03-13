import { useMemo, useState, type DragEventHandler } from "react";
import { open } from "@tauri-apps/plugin-dialog";

interface FileDropProps {
  label: string;
  description: string;
  buttonLabel: string;
  accept: string[];
  multiple?: boolean;
  files: string[];
  onFilesSelected: (paths: string[]) => void;
}

const getBaseName = (path: string) => path.split(/[\\/]/).pop() ?? path;

const getDroppedPath = (file: File) =>
  (file as File & { path?: string }).path ?? null;

function FileDrop({
  label,
  description,
  buttonLabel,
  accept,
  multiple = false,
  files,
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
        title: `选择${label}`,
      });

      if (!selected) {
        return;
      }

      const paths = Array.isArray(selected) ? selected : [selected];
      onFilesSelected(filterPaths(paths));
    } catch (error) {
      setLocalMessage(
        error instanceof Error ? error.message : "打开文件选择器失败。",
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
      setLocalMessage("当前拖拽没有拿到文件路径，请改用“选择文件”按钮。");
      return;
    }

    const filtered = filterPaths(droppedPaths);
    if (filtered.length === 0) {
      setLocalMessage(`拖入文件类型不匹配，仅支持 ${extensionText}`);
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
            <span className="selected-name">尚未选择文件</span>
            <span className="selected-path">将文件拖到这里，或点击右上角按钮</span>
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
