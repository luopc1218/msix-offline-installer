import { invoke } from "@tauri-apps/api/core";
import type { SupportedLocale } from "../i18n";

export type InstallMode = "current-user" | "provisioned";

export interface InstallRequest {
  packagePath: string;
  licensePath: string | null;
  dependencyPaths: string[];
  mode: InstallMode;
  locale: SupportedLocale;
}

export interface InstallResult {
  success: boolean;
  exitCode: number;
  command: string;
  warnings: string[];
}

export interface PowerShellLogEvent {
  stream: "stdout" | "stderr";
  message: string;
}

export interface PowerShellStatusEvent {
  stage: string;
  success?: boolean | null;
  exitCode?: number | null;
  message?: string | null;
}

export interface ManifestDependency {
  name: string;
  minVersion?: string | null;
  publisher?: string | null;
  architecture?: string | null;
}

export interface DetectedDependency {
  path: string;
  fileName: string;
  architecture: string;
}

export interface BundledPackage {
  fileName: string;
  architecture: string;
  packageType: string;
  version?: string | null;
}

export interface PackageMetadata {
  filePath: string;
  fileName: string;
  packageKind: "package" | "bundle";
  displayName?: string | null;
  packageName: string;
  version: string;
  architecture: string;
  manifestDependencies: ManifestDependency[];
  siblingDependencyCandidates: DetectedDependency[];
  bundledPackages: BundledPackage[];
}

export const installMsixPackage = (request: InstallRequest) =>
  invoke<InstallResult>("install_msix_package", { request });

export const parseMsixManifest = (packagePath: string) =>
  invoke<PackageMetadata>("parse_msix_manifest", { packagePath });

export const runPowerShell = (script: string) =>
  invoke("run_powershell", { script });
