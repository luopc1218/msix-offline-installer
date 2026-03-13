import FileDrop from "./FileDrop";
import { formatMessage, type MessageCatalog } from "../i18n";
import type { InstallMode, PackageMetadata } from "../services/tauriService";

interface InstallerPanelProps {
  copy: MessageCatalog;
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
  copy,
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
  const installerCopy = copy.installer;
  const candidatePaths = metadata?.siblingDependencyCandidates.map((item) => item.path) ?? [];

  return (
    <section className="panel installer-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">{installerCopy.panelTitle}</h2>
          <p className="panel-subtitle">{installerCopy.panelSubtitle}</p>
        </div>
        <span className="panel-badge">{installerCopy.adminBadge}</span>
      </div>

      <div className="stack">
        <div className="drop-grid">
          <FileDrop
            accept={["msix", "msixbundle", "appx", "appxbundle"]}
            buttonLabel={installerCopy.packageButton}
            copy={copy.fileDrop}
            description={installerCopy.packageDescription}
            emptyDescription={installerCopy.emptyDescription}
            emptyTitle={installerCopy.emptyTitle}
            files={packagePath ? [packagePath] : []}
            label={installerCopy.packageLabel}
            onFilesSelected={onPackageSelected}
          />

          <FileDrop
            accept={["xml"]}
            buttonLabel={installerCopy.licenseButton}
            copy={copy.fileDrop}
            description={installerCopy.licenseDescription}
            emptyDescription={installerCopy.emptyDescription}
            emptyTitle={installerCopy.emptyTitle}
            files={licensePath ? [licensePath] : []}
            label={installerCopy.licenseLabel}
            onFilesSelected={onLicenseSelected}
          />

          <FileDrop
            accept={["appx", "msix"]}
            buttonLabel={installerCopy.dependencyButton}
            copy={copy.fileDrop}
            description={installerCopy.dependencyDescription}
            emptyDescription={installerCopy.emptyDescription}
            emptyTitle={installerCopy.emptyTitle}
            files={dependencyPaths}
            label={installerCopy.dependencyLabel}
            multiple
            onFilesSelected={onDependencySelected}
          />
        </div>

        <div className="stack">
          <div>
            <h3 className="section-title">{installerCopy.modeTitle}</h3>
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
                  {installerCopy.currentUserTitle}
                  <span className="panel-badge">{installerCopy.currentUserBadge}</span>
                </span>
                <span className="mode-copy">
                  {installerCopy.currentUserDescription}
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
                  {installerCopy.provisionedTitle}
                  <span className="panel-badge">{installerCopy.provisionedBadge}</span>
                </span>
                <span className="mode-copy">
                  {installerCopy.provisionedDescription}
                </span>
              </label>
            </div>
          </div>

          {parsingManifest ? (
            <div className="message message-info">{installerCopy.parsingManifest}</div>
          ) : null}
          {infoMessage ? <div className="message message-info">{infoMessage}</div> : null}
          {mode === "current-user" && licensePath ? (
            <div className="message message-warning">
              {installerCopy.currentUserLicenseWarning}
            </div>
          ) : null}
          {mode === "provisioned" && !licensePath ? (
            <div className="message message-warning">
              {installerCopy.provisionedNoLicenseWarning}
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
            {installing
              ? installerCopy.installingButton
              : installerCopy.installButton}
          </button>
          <button className="secondary-btn" type="button" onClick={onClearDependencies}>
            {installerCopy.clearDependenciesButton}
          </button>
          <button className="secondary-btn" type="button" onClick={onClearLogs}>
            {installerCopy.clearLogsButton}
          </button>
        </div>

        {metadata ? (
          <div className="insight-grid">
            <div className="insight-card">
              <h3 className="section-title">{installerCopy.metadataTitle}</h3>
              <div className="meta-grid">
                <div className="meta-item">
                  <span className="meta-label">
                    {installerCopy.metadataPackageName}
                  </span>
                  <span className="meta-value">{metadata.packageName}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">{installerCopy.metadataVersion}</span>
                  <span className="meta-value">{metadata.version}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">
                    {installerCopy.metadataArchitecture}
                  </span>
                  <span className="meta-value">{metadata.architecture}</span>
                </div>
              </div>
              {metadata.displayName ? (
                <div className="message message-info">
                  {installerCopy.displayNamePrefix}: {metadata.displayName}
                </div>
              ) : null}
            </div>

            <div className="insight-card">
              <div className="candidate-toolbar">
                <h3 className="section-title">
                  {installerCopy.manifestDependenciesTitle}
                </h3>
                {candidatePaths.length > 0 ? (
                  <button
                    className="chip-btn"
                    type="button"
                    onClick={() => onAdoptDetectedDependencies(candidatePaths)}
                  >
                    {installerCopy.adoptAllDependencies}
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
                          {formatMessage(installerCopy.manifestDependencyLine, {
                            architecture:
                              dependency.architecture ?? copy.common.notDeclared,
                            version: dependency.minVersion ?? copy.common.notDeclared,
                          })}
                        </span>
                      </div>
                      <span className="panel-badge">{installerCopy.manifestTag}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="message message-info">
                  {installerCopy.manifestDependenciesEmpty}
                </div>
              )}
            </div>

            <div className="insight-card">
              <div className="candidate-toolbar">
                <h3 className="section-title">
                  {installerCopy.siblingDependenciesTitle}
                </h3>
                <span className="panel-badge">
                  {formatMessage(installerCopy.siblingCandidateCount, {
                    count: metadata.siblingDependencyCandidates.length,
                  })}
                </span>
              </div>

              {metadata.siblingDependencyCandidates.length > 0 ? (
                <div className="dependency-list">
                  {metadata.siblingDependencyCandidates.map((candidate) => (
                    <div className="dependency-item" key={candidate.path}>
                      <div className="dependency-copy">
                        <span className="dependency-name">{candidate.fileName}</span>
                        <span className="dependency-meta">
                          {formatMessage(installerCopy.detectedArchitecture, {
                            architecture: candidate.architecture,
                          })}
                        </span>
                      </div>
                      <button
                        className="chip-btn"
                        type="button"
                        onClick={() =>
                          onAdoptDetectedDependencies([candidate.path])
                        }
                      >
                        {installerCopy.addDependency}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="message message-info">
                  {installerCopy.siblingDependenciesEmpty}
                </div>
              )}
            </div>

            {metadata.packageKind === "bundle" ? (
              <div className="insight-card">
                <h3 className="section-title">{installerCopy.bundlePackagesTitle}</h3>
                {metadata.bundledPackages.length > 0 ? (
                  <div className="bundle-list">
                    {metadata.bundledPackages.map((bundle) => (
                      <div className="bundle-item" key={bundle.fileName}>
                        <div className="bundle-copy">
                          <span className="bundle-name">{bundle.fileName}</span>
                          <span className="bundle-meta">
                            {formatMessage(installerCopy.bundlePackageLine, {
                              architecture: bundle.architecture,
                              packageType: bundle.packageType,
                              version:
                                bundle.version ?? copy.common.versionNotDeclared,
                            })}
                          </span>
                        </div>
                        <span className="panel-badge">{installerCopy.bundleTag}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="message message-info">
                    {installerCopy.bundlePackagesEmpty}
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
