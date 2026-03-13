import { useEffect, useRef } from "react";
import type { MessageCatalog } from "../i18n";

export interface LogEntry {
  id: number;
  stream: "stdout" | "stderr" | "system";
  message: string;
}

interface LogPanelProps {
  copy: MessageCatalog;
  logs: LogEntry[];
  statusText: string;
  commandPreview: string | null;
}

function LogPanel({ copy, logs, statusText, commandPreview }: LogPanelProps) {
  const streamRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = streamRef.current;
    if (!element) {
      return;
    }

    element.scrollTop = element.scrollHeight;
  }, [logs]);

  return (
    <section className="panel log-panel">
      <div className="log-toolbar">
        <div>
          <h2 className="panel-title">{copy.logPanel.title}</h2>
          <p className="panel-subtitle">{copy.logPanel.subtitle}</p>
        </div>
        <span className="status-pill">{statusText}</span>
      </div>

      {commandPreview ? (
        <div className="command-preview">
          <span className="command-label">{copy.logPanel.commandLabel}</span>
          <code>{commandPreview}</code>
        </div>
      ) : null}

      <div className="log-stream" ref={streamRef}>
        {logs.length > 0 ? (
          logs.map((log) => (
            <div className={`log-line ${log.stream}`} key={log.id}>
              <span className="log-tag">{log.stream}</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))
        ) : (
          <div className="log-empty">
            <p>{copy.logPanel.emptyTitle}</p>
            <p>{copy.logPanel.emptyDescription}</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default LogPanel;
