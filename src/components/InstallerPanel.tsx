import FileDrop from "./FileDrop";
import type { InstallMode, PackageMetadata } from "../services/tauriService";

interface InstallerPanelProps {
  packagePath: string | null;
  licensePath: string | null;
  dependencyPaths: string[];
  mode: InstallMode;
  metadata: PackageMetadata | null;
  parsingManifest: boolean;
  installing: boolean;
  errorMessage: string | null;
  infoMessage: string | null;
  onPackageSelected: (paths: string[]) => void;
  onLicenseSelected: (paths: string[]) => void;
  onDependencySelected: (paths: string[]) => void;
  onModeChange: (mode: InstallMode) => void;
  onInstall: () => void;
  onAdoptDetectedDependencies: (paths: string[]) => void;
  onClearDependencies: () => void;
  onClearLogs: () => void;
}

function InstallerPanel({
  packagePath,
  licensePath,
  dependencyPaths,
  mode,
  metadata,
  parsingManifest,
  installing,
  errorMessage,
  infoMessage,
  onPackageSelected,
  onLicenseSelected,
  onDependencySelected,
  onModeChange,
  onInstall,
  onAdoptDetectedDependencies,
  onClearDependencies,
  onClearLogs,
}: InstallerPanelProps) {
  const candidatePaths = metadata?.siblingDependencyCandidates.map((item) => item.path) ?? [];

  return (
    <section className="panel installer-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">安装配置</h2>
          <p className="panel-subtitle">
            选择主安装包、可选的 `license.xml` 与 dependency 依赖包，然后选择安装模式并执行。
          </p>
        </div>
        <span className="panel-badge">管理员权限运行</span>
      </div>

      <div className="stack">
        <div className="drop-grid">
          <FileDrop
            accept={["msix", "msixbundle", "appx", "appxbundle"]}
            buttonLabel="选择安装包"
            description="主安装包，支持单文件拖拽"
            files={packagePath ? [packagePath] : []}
            label="安装包"
            onFilesSelected={onPackageSelected}
          />

          <FileDrop
            accept={["xml"]}
            buttonLabel="选择许可证"
            description="离线许可证，可不填"
            files={licensePath ? [licensePath] : []}
            label="许可证"
            onFilesSelected={onLicenseSelected}
          />

          <FileDrop
            accept={["appx", "msix"]}
            buttonLabel="选择依赖包"
            description="可多选 dependency 依赖包"
            files={dependencyPaths}
            label="依赖包"
            multiple
            onFilesSelected={onDependencySelected}
          />
        </div>

        <div className="stack">
          <div>
            <h3 className="panel-title">安装模式</h3>
            <div className="mode-grid">
              <label
                className={`mode-card ${mode === "current-user" ? "is-active" : ""}`}
              >
                <input
                  checked={mode === "current-user"}
                  name="install-mode"
                  type="radio"
                  onChange={() => onModeChange("current-user")}
                />
                <span className="mode-title">
                  当前用户安装
                  <span className="panel-badge">Add-AppxPackage</span>
                </span>
                <span className="mode-copy">
                  直接给当前登录用户安装。适合临时部署或单机测试，不需要预置到新用户账户。
                </span>
              </label>

              <label
                className={`mode-card ${mode === "provisioned" ? "is-active" : ""}`}
              >
                <input
                  checked={mode === "provisioned"}
                  name="install-mode"
                  type="radio"
                  onChange={() => onModeChange("provisioned")}
                />
                <span className="mode-title">
                  系统预安装
                  <span className="panel-badge">Add-AppxProvisionedPackage</span>
                </span>
                <span className="mode-copy">
                  写入系统预安装映像，适合批量部署。支持 `license.xml`，通常更适合离线商店包。
                </span>
              </label>
            </div>
          </div>

          {parsingManifest ? (
            <div className="message message-info">正在解析清单和同目录依赖候选...</div>
          ) : null}
          {infoMessage ? <div className="message message-info">{infoMessage}</div> : null}
          {mode === "current-user" && licensePath ? (
            <div className="message message-warning">
              当前用户模式底层使用 `Add-AppxPackage`。这个 PowerShell 命令本身不支持
              `-LicensePath`，因此所选 `license.xml` 会被记录但不会传入命令。
            </div>
          ) : null}
          {errorMessage ? <div className="message message-error">{errorMessage}</div> : null}
        </div>

        <div className="install-actions">
          <button
            className="primary-btn"
            disabled={!packagePath || installing}
            type="button"
            onClick={onInstall}
          >
            {installing ? "安装中..." : "开始安装"}
          </button>
          <button className="secondary-btn" type="button" onClick={onClearDependencies}>
            清空依赖
          </button>
          <button className="secondary-btn" type="button" onClick={onClearLogs}>
            清空日志
          </button>
        </div>

        {metadata ? (
          <div className="insight-grid">
            <div className="insight-card">
              <h3 className="insight-title">清单信息</h3>
              <div className="meta-grid">
                <div className="meta-item">
                  <span className="meta-label">Package Name</span>
                  <span className="meta-value">{metadata.packageName}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Version</span>
                  <span className="meta-value">{metadata.version}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Architecture</span>
                  <span className="meta-value">{metadata.architecture}</span>
                </div>
              </div>
              {metadata.displayName ? (
                <div className="message message-info" style={{ marginTop: 14 }}>
                  DisplayName: {metadata.displayName}
                </div>
              ) : null}
            </div>

            <div className="insight-card">
              <div className="candidate-toolbar">
                <h3 className="insight-title">Manifest 依赖</h3>
                {candidatePaths.length > 0 ? (
                  <button
                    className="chip-btn"
                    type="button"
                    onClick={() => onAdoptDetectedDependencies(candidatePaths)}
                  >
                    一键加入候选依赖
                  </button>
                ) : null}
              </div>

              {metadata.manifestDependencies.length > 0 ? (
                <div className="dependency-list">
                  {metadata.manifestDependencies.map((dependency) => (
                    <div className="dependency-item" key={dependency.name}>
                      <div className="dependency-copy">
                        <span className="dependency-name">{dependency.name}</span>
                        <span className="dependency-meta">
                          最低版本 {dependency.minVersion ?? "未声明"} · 架构{" "}
                          {dependency.architecture ?? "未声明"}
                        </span>
                      </div>
                      <span className="panel-badge">Manifest</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="message message-info">
                  当前清单没有显式声明 `PackageDependency`。
                </div>
              )}
            </div>

            <div className="insight-card">
              <div className="candidate-toolbar">
                <h3 className="insight-title">同目录候选依赖</h3>
                <span className="panel-badge">
                  {metadata.siblingDependencyCandidates.length} 个候选
                </span>
              </div>

              {metadata.siblingDependencyCandidates.length > 0 ? (
                <div className="dependency-list">
                  {metadata.siblingDependencyCandidates.map((candidate) => (
                    <div className="dependency-item" key={candidate.path}>
                      <div className="dependency-copy">
                        <span className="dependency-name">{candidate.fileName}</span>
                        <span className="dependency-meta">
                          识别架构 {candidate.architecture}
                        </span>
                      </div>
                      <button
                        className="chip-btn"
                        type="button"
                        onClick={() =>
                          onAdoptDetectedDependencies([candidate.path])
                        }
                      >
                        加入依赖
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="message message-info">
                  未在安装包同目录发现 `.appx` 或 `.msix` 依赖候选。
                </div>
              )}
            </div>

            {metadata.packageKind === "bundle" ? (
              <div className="insight-card">
                <h3 className="insight-title">Bundle 内部包</h3>
                {metadata.bundledPackages.length > 0 ? (
                  <div className="bundle-list">
                    {metadata.bundledPackages.map((bundle) => (
                      <div className="bundle-item" key={bundle.fileName}>
                        <div className="bundle-copy">
                          <span className="bundle-name">{bundle.fileName}</span>
                          <span className="bundle-meta">
                            {bundle.packageType} · {bundle.architecture} ·{" "}
                            {bundle.version ?? "未声明版本"}
                          </span>
                        </div>
                        <span className="panel-badge">Bundle</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="message message-info">
                    该 bundle 没有解析出内部包清单。
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default InstallerPanel;
