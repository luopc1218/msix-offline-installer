export const supportedLocales = ["zh-CN", "en-US"] as const;

export type SupportedLocale = (typeof supportedLocales)[number];
export type LanguagePreference = SupportedLocale | "system";

const LANGUAGE_STORAGE_KEY = "msix-offline-installer.language";

export const messages = {
  "zh-CN": {
    common: {
      unknown: "未知",
      notDeclared: "未声明",
      versionNotDeclared: "未声明版本",
    },
    app: {
      title: "MSIX 离线安装器",
      summary:
        "用于在无网络环境下安装 msix、msixbundle 与离线许可证，并实时查看安装日志与依赖信息。",
      languageLabel: "界面语言",
      languageHint: "默认跟随系统语言，也可以手动切换。",
      languageSystem: "跟随系统",
      languageChinese: "简体中文",
      languageEnglish: "English",
    },
    status: {
      idle: "等待选择安装包",
      logsCleared: "日志已清空",
      preparingInstall: "正在准备安装...",
      startingPowerShell: "正在启动 PowerShell...",
      installing: "正在执行安装命令...",
      installSucceeded: "安装完成，退出码 {exitCode}",
      installFailed: "安装失败，退出码 {exitCode}",
      manifestParsing: "正在解析 AppxManifest...",
      manifestReady: "已解析安装包清单。",
      bundleManifestReady: "已解析 bundle 清单，包含 {count} 个内部包。",
    },
    logs: {
      startingPowerShell: "PowerShell 已启动，正在执行安装命令。",
      installSucceeded: "安装成功，退出码 {exitCode}",
      installFailed: "安装失败，退出码 {exitCode}",
    },
    installer: {
      panelTitle: "安装配置",
      panelSubtitle:
        "选择安装包、可选 license.xml 与依赖包，然后选择安装模式并执行。",
      adminBadge: "建议以管理员权限运行",
      packageLabel: "安装包",
      packageDescription: "主安装包，支持单文件拖拽或选择。",
      packageButton: "选择安装包",
      licenseLabel: "许可证",
      licenseDescription: "离线 license.xml，可选。",
      licenseButton: "选择许可证",
      dependencyLabel: "依赖包",
      dependencyDescription: "可多选 appx 或 msix 依赖包。",
      dependencyButton: "选择依赖包",
      emptyTitle: "尚未选择文件",
      emptyDescription: "可直接拖拽文件到此区域，或点击右侧按钮选择。",
      modeTitle: "安装模式",
      currentUserTitle: "当前用户安装",
      currentUserBadge: "Add-AppxPackage",
      currentUserDescription:
        "仅为当前登录用户安装，适合测试机或临时部署。",
      provisionedTitle: "系统预安装",
      provisionedBadge: "Add-AppxProvisionedPackage",
      provisionedDescription:
        "写入系统预安装映像，适合批量部署与离线商店包。",
      parsingManifest: "正在解析清单和同目录依赖候选...",
      currentUserLicenseWarning:
        "当前用户模式使用 Add-AppxPackage，不支持 -LicensePath，所选许可证不会传入命令。",
      provisionedNoLicenseWarning:
        "未提供 license.xml，系统预安装会自动使用 -SkipLicense。",
      installButton: "开始安装",
      installingButton: "安装中...",
      clearDependenciesButton: "清空依赖",
      clearLogsButton: "清空日志",
      metadataTitle: "清单信息",
      metadataPackageName: "Package Name",
      metadataVersion: "Version",
      metadataArchitecture: "Architecture",
      displayNamePrefix: "DisplayName",
      manifestDependenciesTitle: "Manifest 依赖",
      adoptAllDependencies: "加入全部候选依赖",
      manifestDependencyLine: "最低版本 {version} · 架构 {architecture}",
      manifestDependenciesEmpty: "当前清单没有显式声明 PackageDependency。",
      siblingDependenciesTitle: "同目录候选依赖",
      siblingCandidateCount: "{count} 个候选",
      detectedArchitecture: "识别架构 {architecture}",
      addDependency: "加入依赖",
      siblingDependenciesEmpty:
        "未在安装包同目录发现 .appx 或 .msix 依赖候选。",
      bundlePackagesTitle: "Bundle 内部包",
      bundlePackageLine: "{packageType} · {architecture} · {version}",
      bundlePackagesEmpty: "该 bundle 没有解析出内部包清单。",
      manifestTag: "Manifest",
      bundleTag: "Bundle",
    },
    fileDrop: {
      dialogTitle: "选择{label}",
      dropPathUnavailable: "当前拖拽没有拿到文件路径，请改用“选择文件”按钮。",
      invalidType: "拖入文件类型不匹配，仅支持 {extensions}",
      pickerFailed: "打开文件选择器失败。",
    },
    logPanel: {
      title: "安装日志",
      subtitle: "PowerShell stdout / stderr 与安装状态会实时显示在这里。",
      commandLabel: "命令预览",
      emptyTitle: "等待执行",
      emptyDescription: "点击“开始安装”后，这里会显示安装过程日志。",
    },
    errors: {
      selectPackageFirst: "请先选择 msix 或 msixbundle 安装包。",
      parseManifestFallback: "解析清单失败，请确认安装包未损坏。",
      installFallback: "执行安装命令失败，请稍后重试。",
    },
  },
  "en-US": {
    common: {
      unknown: "Unknown",
      notDeclared: "Not declared",
      versionNotDeclared: "Version not declared",
    },
    app: {
      title: "MSIX Offline Installer",
      summary:
        "Install msix, msixbundle, and offline licenses without network access, with live logs and dependency insights.",
      languageLabel: "Language",
      languageHint: "Uses the system language by default, with manual override available.",
      languageSystem: "Follow system",
      languageChinese: "简体中文",
      languageEnglish: "English",
    },
    status: {
      idle: "Select a package to begin",
      logsCleared: "Logs cleared",
      preparingInstall: "Preparing installation...",
      startingPowerShell: "Starting PowerShell...",
      installing: "Running installation command...",
      installSucceeded: "Installation completed with exit code {exitCode}",
      installFailed: "Installation failed with exit code {exitCode}",
      manifestParsing: "Parsing AppxManifest...",
      manifestReady: "Package manifest parsed.",
      bundleManifestReady: "Bundle manifest parsed with {count} inner packages.",
    },
    logs: {
      startingPowerShell: "PowerShell started and the installation command is running.",
      installSucceeded: "Installation succeeded with exit code {exitCode}",
      installFailed: "Installation failed with exit code {exitCode}",
    },
    installer: {
      panelTitle: "Installation",
      panelSubtitle:
        "Choose the package, optional license.xml, and dependency packages, then run the install mode you need.",
      adminBadge: "Run as administrator when possible",
      packageLabel: "Package",
      packageDescription: "Primary package file. Drag one file here or browse.",
      packageButton: "Choose package",
      licenseLabel: "License",
      licenseDescription: "Offline license.xml, optional.",
      licenseButton: "Choose license",
      dependencyLabel: "Dependencies",
      dependencyDescription: "Select one or more appx or msix dependency packages.",
      dependencyButton: "Choose dependencies",
      emptyTitle: "No file selected",
      emptyDescription: "Drop files here or use the button on the right.",
      modeTitle: "Install mode",
      currentUserTitle: "Current user",
      currentUserBadge: "Add-AppxPackage",
      currentUserDescription:
        "Installs only for the current signed-in user. Best for testing or one-off deployment.",
      provisionedTitle: "Provisioned",
      provisionedBadge: "Add-AppxProvisionedPackage",
      provisionedDescription:
        "Writes to the system provisioning image. Better for offline store packages and batch deployment.",
      parsingManifest: "Parsing manifest and scanning sibling dependencies...",
      currentUserLicenseWarning:
        "Current user mode uses Add-AppxPackage, which does not support -LicensePath. The selected license will not be passed to the command.",
      provisionedNoLicenseWarning:
        "No license.xml was provided. Provisioned mode will run with -SkipLicense.",
      installButton: "Install",
      installingButton: "Installing...",
      clearDependenciesButton: "Clear dependencies",
      clearLogsButton: "Clear logs",
      metadataTitle: "Manifest details",
      metadataPackageName: "Package Name",
      metadataVersion: "Version",
      metadataArchitecture: "Architecture",
      displayNamePrefix: "DisplayName",
      manifestDependenciesTitle: "Manifest dependencies",
      adoptAllDependencies: "Add all detected dependencies",
      manifestDependencyLine: "Min version {version} · Architecture {architecture}",
      manifestDependenciesEmpty: "No explicit PackageDependency entries were found in the manifest.",
      siblingDependenciesTitle: "Detected sibling dependencies",
      siblingCandidateCount: "{count} detected",
      detectedArchitecture: "Detected architecture {architecture}",
      addDependency: "Add dependency",
      siblingDependenciesEmpty:
        "No .appx or .msix dependency candidates were found next to the package.",
      bundlePackagesTitle: "Bundle packages",
      bundlePackageLine: "{packageType} · {architecture} · {version}",
      bundlePackagesEmpty: "No inner package entries were parsed from this bundle.",
      manifestTag: "Manifest",
      bundleTag: "Bundle",
    },
    fileDrop: {
      dialogTitle: "Choose {label}",
      dropPathUnavailable:
        "No file path was available from the drag operation. Please use the file picker button instead.",
      invalidType: "File type does not match. Supported types: {extensions}",
      pickerFailed: "Failed to open the file picker.",
    },
    logPanel: {
      title: "Install log",
      subtitle: "PowerShell stdout / stderr and install state are streamed here in real time.",
      commandLabel: "Command preview",
      emptyTitle: "Ready",
      emptyDescription: "Installation logs will appear here after you start the install.",
    },
    errors: {
      selectPackageFirst: "Please choose an msix or msixbundle package first.",
      parseManifestFallback:
        "Failed to parse the manifest. Please make sure the package is valid.",
      installFallback: "Failed to run the installation command. Please try again.",
    },
  },
} as const;

export type MessageCatalog = (typeof messages)[SupportedLocale];

export function formatMessage(
  template: string,
  values: Record<string, string | number>,
) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(values[key] ?? ""),
  );
}

export function normalizeLocale(value: string | null | undefined): SupportedLocale | null {
  if (!value) {
    return null;
  }

  const lowered = value.toLowerCase();
  if (lowered.startsWith("zh")) {
    return "zh-CN";
  }

  if (lowered.startsWith("en")) {
    return "en-US";
  }

  return null;
}

export function detectSystemLocale(): SupportedLocale {
  if (typeof navigator === "undefined") {
    return "en-US";
  }

  const locales = [...(navigator.languages ?? []), navigator.language];
  for (const locale of locales) {
    const normalized = normalizeLocale(locale);
    if (normalized) {
      return normalized;
    }
  }

  return "en-US";
}

export function readLanguagePreference(): LanguagePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === "zh-CN" || stored === "en-US" || stored === "system") {
    return stored;
  }

  return "system";
}

export function writeLanguagePreference(preference: LanguagePreference) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, preference);
}

export function resolveLocale(
  preference: LanguagePreference,
  systemLocale: SupportedLocale,
): SupportedLocale {
  return preference === "system" ? systemLocale : preference;
}
