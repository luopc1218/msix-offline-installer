import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { listen } from "@tauri-apps/api/event";
import InstallerPanel from "./components/InstallerPanel";
import LogPanel, { type LogEntry } from "./components/LogPanel";
import {
  detectSystemLocale,
  formatMessage,
  messages,
  readLanguagePreference,
  resolveLocale,
  type LanguagePreference,
  type MessageCatalog,
  type SupportedLocale,
  writeLanguagePreference,
} from "./i18n";
import {
  type InstallMode,
  type PackageMetadata,
  type PowerShellLogEvent,
  type PowerShellStatusEvent,
  installMsixPackage,
  parseMsixManifest,
} from "./services/tauriService";
import "./App.css";

type StatusState =
  | { kind: "idle" }
  | { kind: "logsCleared" }
  | { kind: "preparingInstall" }
  | { kind: "startingPowerShell" }
  | { kind: "installing" }
  | { kind: "installSucceeded"; exitCode: number }
  | { kind: "installFailed"; exitCode: number };

type InfoState =
  | null
  | { kind: "manifestReady" }
  | { kind: "bundleManifestReady"; count: number };

const createLog = (
  id: number,
  stream: LogEntry["stream"],
  message: string,
): LogEntry => ({
  id,
  message,
  stream,
});

const resolveStatusText = (copy: MessageCatalog, status: StatusState) => {
  switch (status.kind) {
    case "logsCleared":
      return copy.status.logsCleared;
    case "preparingInstall":
      return copy.status.preparingInstall;
    case "startingPowerShell":
      return copy.status.startingPowerShell;
    case "installing":
      return copy.status.installing;
    case "installSucceeded":
      return formatMessage(copy.status.installSucceeded, {
        exitCode: status.exitCode,
      });
    case "installFailed":
      return formatMessage(copy.status.installFailed, {
        exitCode: status.exitCode,
      });
    case "idle":
    default:
      return copy.status.idle;
  }
};

const resolveInfoMessage = (copy: MessageCatalog, infoState: InfoState) => {
  if (!infoState) {
    return null;
  }

  if (infoState.kind === "bundleManifestReady") {
    return formatMessage(copy.status.bundleManifestReady, {
      count: infoState.count,
    });
  }

  return copy.status.manifestReady;
};

function App() {
  const nextLogId = useRef(1);
  const systemLocale = useMemo(detectSystemLocale, []);
  const [languagePreference, setLanguagePreference] = useState<LanguagePreference>(
    () => readLanguagePreference(),
  );
  const locale = resolveLocale(languagePreference, systemLocale);
  const copy = messages[locale];

  const [packagePath, setPackagePath] = useState<string | null>(null);
  const [licensePath, setLicensePath] = useState<string | null>(null);
  const [dependencyPaths, setDependencyPaths] = useState<string[]>([]);
  const [mode, setMode] = useState<InstallMode>("current-user");
  const [metadata, setMetadata] = useState<PackageMetadata | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [statusState, setStatusState] = useState<StatusState>({ kind: "idle" });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoState, setInfoState] = useState<InfoState>(null);
  const [commandPreview, setCommandPreview] = useState<string | null>(null);
  const [parsingManifest, setParsingManifest] = useState(false);
  const [installing, setInstalling] = useState(false);

  const statusText = resolveStatusText(copy, statusState);
  const infoMessage = resolveInfoMessage(copy, infoState);
  const systemLanguageLabel =
    systemLocale === "zh-CN"
      ? copy.app.languageChinese
      : copy.app.languageEnglish;

  const appendLog = (stream: LogEntry["stream"], message: string) => {
    const id = nextLogId.current;
    nextLogId.current += 1;
    setLogs((current) => [...current, createLog(id, stream, message)]);
  };

  const handlePowerShellStatus = useEffectEvent(
    (payload: PowerShellStatusEvent, currentLocale: SupportedLocale) => {
      const currentCopy = messages[currentLocale];
      if (payload.stage === "starting") {
        setStatusState({ kind: "startingPowerShell" });
        appendLog("system", currentCopy.logs.startingPowerShell);
        return;
      }

      if (payload.stage === "completed") {
        const exitCode = payload.exitCode ?? -1;
        if (payload.success === false) {
          setStatusState({ kind: "installFailed", exitCode });
          appendLog(
            "stderr",
            formatMessage(currentCopy.logs.installFailed, { exitCode }),
          );
        } else {
          setStatusState({ kind: "installSucceeded", exitCode });
          appendLog(
            "system",
            formatMessage(currentCopy.logs.installSucceeded, { exitCode }),
          );
        }
        return;
      }

      setStatusState({ kind: "installing" });
    },
  );

  useEffect(() => {
    writeLanguagePreference(languagePreference);
  }, [languagePreference]);

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
          handlePowerShellStatus(payload, locale);
        },
      );
    };

    void setupListeners();

    return () => {
      unlistenLog?.();
      unlistenStatus?.();
    };
  }, [handlePowerShellStatus, locale]);

  useEffect(() => {
    if (!packagePath) {
      setMetadata(null);
      setInfoState(null);
      return;
    }

    let cancelled = false;
    setParsingManifest(true);
    setInfoState(null);
    setErrorMessage(null);

    void parseMsixManifest(packagePath)
      .then((result) => {
        if (cancelled) {
          return;
        }

        setMetadata(result);
        setInfoState(
          result.packageKind === "bundle"
            ? {
                kind: "bundleManifestReady",
                count: result.bundledPackages.length,
              }
            : { kind: "manifestReady" },
        );
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : copy.errors.parseManifestFallback;
        setMetadata(null);
        setInfoState(null);
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
  }, [copy.errors.parseManifestFallback, packagePath]);

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
    setInfoState(null);
    setStatusState({ kind: "idle" });
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
    setStatusState({ kind: "logsCleared" });
    setCommandPreview(null);
  };

  const handleInstall = async () => {
    if (!packagePath) {
      setErrorMessage(copy.errors.selectPackageFirst);
      return;
    }

    setLogs([]);
    setCommandPreview(null);
    setErrorMessage(null);
    setStatusState({ kind: "preparingInstall" });
    setInstalling(true);

    try {
      const result = await installMsixPackage({
        dependencyPaths,
        licensePath,
        locale,
        mode,
        packagePath,
      });

      setCommandPreview(result.command);

      for (const warning of result.warnings) {
        appendLog("system", warning);
      }

      if (!result.success) {
        setErrorMessage(
          formatMessage(copy.status.installFailed, { exitCode: result.exitCode }),
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : copy.errors.installFallback;
      setStatusState({ kind: "installFailed", exitCode: -1 });
      setErrorMessage(message);
      appendLog("stderr", message);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="app-topbar">
        <div className="app-title-group">
          <h1>{copy.app.title}</h1>
          <p>{copy.app.summary}</p>
        </div>

        <div className="app-toolbar">
          <label className="toolbar-field">
            <span className="toolbar-label">{copy.app.languageLabel}</span>
            <select
              className="language-select"
              value={languagePreference}
              onChange={(event) =>
                setLanguagePreference(event.target.value as LanguagePreference)
              }
            >
              <option value="system">
                {copy.app.languageSystem} ({systemLanguageLabel})
              </option>
              <option value="zh-CN">{copy.app.languageChinese}</option>
              <option value="en-US">{copy.app.languageEnglish}</option>
            </select>
          </label>
          <p className="toolbar-help">{copy.app.languageHint}</p>
        </div>
      </header>

      <section className="workspace-grid">
        <InstallerPanel
          copy={copy}
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
          copy={copy}
          logs={logs}
          statusText={statusText}
        />
      </section>
    </main>
  );
}

export default App;
