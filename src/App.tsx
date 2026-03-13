import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import InstallerPanel from "./components/InstallerPanel";
import LogPanel, { type LogEntry } from "./components/LogPanel";
import {
  type InstallMode,
  type PackageMetadata,
  type PowerShellLogEvent,
  type PowerShellStatusEvent,
  installMsixPackage,
  parseMsixManifest,
} from "./services/tauriService";
import "./App.css";

const createLog = (
  id: number,
  stream: LogEntry["stream"],
  message: string,
): LogEntry => ({
  id,
  message,
  stream,
});

function App() {
  const nextLogId = useRef(1);
  const [packagePath, setPackagePath] = useState<string | null>(null);
  const [licensePath, setLicensePath] = useState<string | null>(null);
  const [dependencyPaths, setDependencyPaths] = useState<string[]>([]);
  const [mode, setMode] = useState<InstallMode>("current-user");
  const [metadata, setMetadata] = useState<PackageMetadata | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [statusText, setStatusText] = useState("等待选择安装包");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [commandPreview, setCommandPreview] = useState<string | null>(null);
  const [parsingManifest, setParsingManifest] = useState(false);
  const [installing, setInstalling] = useState(false);

  const appendLog = (stream: LogEntry["stream"], message: string) => {
    const id = nextLogId.current;
    nextLogId.current += 1;
    setLogs((current) => [...current, createLog(id, stream, message)]);
  };

  useEffect(() => {
    let unlistenLog: (() => void) | undefined;
    let unlistenStatus: (() => void) | undefined;

    const setupListeners = async () => {
      unlistenLog = await listen<PowerShellLogEvent>("ps-log", ({ payload }) => {
        appendLog(payload.stream === "stderr" ? "stderr" : "stdout", payload.message);
      });

      unlistenStatus = await listen<PowerShellStatusEvent>(
        "ps-status",
        ({ payload }) => {
          if (!payload.message) {
            return;
          }

          setStatusText(payload.message);
          appendLog(payload.success === false ? "stderr" : "system", payload.message);
        },
      );
    };

    void setupListeners();

    return () => {
      unlistenLog?.();
      unlistenStatus?.();
    };
  }, []);

  useEffect(() => {
    if (!packagePath) {
      setMetadata(null);
      setInfoMessage(null);
      return;
    }

    let cancelled = false;
    setParsingManifest(true);
    setInfoMessage("正在解析 AppxManifest...");
    setErrorMessage(null);

    void parseMsixManifest(packagePath)
      .then((result) => {
        if (cancelled) {
          return;
        }

        setMetadata(result);
        setInfoMessage(
          result.packageKind === "bundle"
            ? `已解析 bundle 清单，包含 ${result.bundledPackages.length} 个内部包。`
            : "已解析安装包清单。",
        );
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "解析清单失败，请确认安装包未损坏。";
        setMetadata(null);
        setInfoMessage(null);
        setErrorMessage(message);
      })
      .finally(() => {
        if (!cancelled) {
          setParsingManifest(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [packagePath]);

  const handlePackageSelected = (paths: string[]) => {
    const [selected] = paths;
    if (!selected) {
      return;
    }

    setPackagePath(selected);
    setDependencyPaths([]);
    setMetadata(null);
    setCommandPreview(null);
    setErrorMessage(null);
    setInfoMessage(null);
  };

  const handleLicenseSelected = (paths: string[]) => {
    setLicensePath(paths[0] ?? null);
    setErrorMessage(null);
  };

  const handleDependencySelected = (paths: string[]) => {
    setDependencyPaths(Array.from(new Set(paths)));
    setErrorMessage(null);
  };

  const handleAdoptDetectedDependencies = (paths: string[]) => {
    setDependencyPaths((current) => Array.from(new Set([...current, ...paths])));
  };

  const handleClearLogs = () => {
    setLogs([]);
    setStatusText("日志已清空");
    setCommandPreview(null);
  };

  const handleInstall = async () => {
    if (!packagePath) {
      setErrorMessage("请先选择 msix 或 msixbundle 安装包。");
      return;
    }

    setLogs([]);
    setCommandPreview(null);
    setErrorMessage(null);
    setStatusText("正在准备安装...");
    setInstalling(true);

    try {
      const result = await installMsixPackage({
        dependencyPaths,
        licensePath,
        mode,
        packagePath,
      });

      setCommandPreview(result.command);

      for (const warning of result.warnings) {
        appendLog("system", warning);
      }

      if (result.success) {
        setStatusText(`安装完成，退出码 ${result.exitCode}`);
        appendLog("system", `安装成功，退出码 ${result.exitCode}`);
      } else {
        const message = `安装失败，退出码 ${result.exitCode}`;
        setStatusText(message);
        setErrorMessage(message);
        appendLog("stderr", message);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "执行安装命令失败，请稍后重试。";
      setStatusText(message);
      setErrorMessage(message);
      appendLog("stderr", message);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="app-hero">
        <div className="hero-copy">
          <p className="hero-kicker">Windows Offline Deployment Console</p>
          <h1>MSIX离线安装器</h1>
          <p className="hero-summary">
            在无网络环境下安装 `msix`、`msixbundle` 与可选的 `license.xml`，
            同时实时查看 PowerShell 输出、解析清单信息并管理依赖包。
          </p>
        </div>
        <div className="hero-aside">
          <span className="hero-chip">Tauri v2</span>
          <span className="hero-chip">React + TypeScript</span>
          <span className="hero-chip">PowerShell 实时日志</span>
        </div>
      </header>

      <section className="workspace-grid">
        <InstallerPanel
          dependencyPaths={dependencyPaths}
          errorMessage={errorMessage}
          infoMessage={infoMessage}
          installing={installing}
          licensePath={licensePath}
          metadata={metadata}
          mode={mode}
          packagePath={packagePath}
          parsingManifest={parsingManifest}
          onAdoptDetectedDependencies={handleAdoptDetectedDependencies}
          onClearDependencies={() => setDependencyPaths([])}
          onClearLogs={handleClearLogs}
          onDependencySelected={handleDependencySelected}
          onInstall={handleInstall}
          onLicenseSelected={handleLicenseSelected}
          onModeChange={setMode}
          onPackageSelected={handlePackageSelected}
        />

        <LogPanel
          commandPreview={commandPreview}
          logs={logs}
          statusText={statusText}
        />
      </section>
    </main>
  );
}

export default App;
