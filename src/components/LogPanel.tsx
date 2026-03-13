import { useEffect, useRef } from "react";

export interface LogEntry {
  id: number;
  stream: "stdout" | "stderr" | "system";
  message: string;
}

interface LogPanelProps {
  logs: LogEntry[];
  statusText: string;
  commandPreview: string | null;
}

function LogPanel({ logs, statusText, commandPreview }: LogPanelProps) {
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
          <h2 className="panel-title">日志输出</h2>
          <p className="panel-subtitle">
            PowerShell stdout / stderr 会实时回显到这里。
          </p>
        </div>
        <span className="status-pill">{statusText}</span>
      </div>

      {commandPreview ? (
        <div className="command-preview">{commandPreview}</div>
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
            <p>PowerShell log</p>
            <p>点击“开始安装”后，这里会实时显示执行输出。</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default LogPanel;
