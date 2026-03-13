use std::{
    fs::{self, File},
    io::Read,
    path::{Path, PathBuf},
};

use anyhow::{anyhow, Context, Result};
use roxmltree::Document;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use zip::ZipArchive;

#[cfg(target_os = "windows")]
use std::{
    io::{BufRead, BufReader},
    process::{Command, Stdio},
    thread,
};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
use tauri::Emitter;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[cfg(target_os = "windows")]
const LOG_EVENT: &str = "ps-log";

#[cfg(target_os = "windows")]
const STATUS_EVENT: &str = "ps-status";

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallRequest {
    package_path: String,
    license_path: Option<String>,
    #[serde(default)]
    dependency_paths: Vec<String>,
    mode: InstallMode,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum InstallMode {
    CurrentUser,
    Provisioned,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallResult {
    success: bool,
    exit_code: i32,
    command: String,
    warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PowerShellResult {
    success: bool,
    exit_code: i32,
    command: String,
}

#[cfg(target_os = "windows")]
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PowerShellLogEvent {
    stream: String,
    message: String,
}

#[cfg(target_os = "windows")]
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PowerShellStatusEvent {
    stage: String,
    success: Option<bool>,
    exit_code: Option<i32>,
    message: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageMetadata {
    file_path: String,
    file_name: String,
    package_kind: String,
    display_name: Option<String>,
    package_name: String,
    version: String,
    architecture: String,
    manifest_dependencies: Vec<ManifestDependency>,
    sibling_dependency_candidates: Vec<DetectedDependency>,
    bundled_packages: Vec<BundledPackage>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestDependency {
    name: String,
    min_version: Option<String>,
    publisher: Option<String>,
    architecture: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectedDependency {
    path: String,
    file_name: String,
    architecture: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BundledPackage {
    file_name: String,
    architecture: String,
    package_type: String,
    version: Option<String>,
}

#[tauri::command]
pub fn parse_msix_manifest(package_path: String) -> Result<PackageMetadata, String> {
    parse_manifest(Path::new(&package_path)).map_err(format_error)
}

#[tauri::command]
pub fn run_powershell(app: AppHandle, script: String) -> Result<PowerShellResult, String> {
    run_powershell_impl(&app, &script).map_err(format_error)
}

#[tauri::command]
pub fn install_msix_package(
    app: AppHandle,
    request: InstallRequest,
) -> Result<InstallResult, String> {
    validate_install_request(&request).map_err(format_error)?;
    let (script, command_preview, warnings) =
        build_install_script(&request).map_err(format_error)?;

    let result = run_powershell_impl(&app, &script).map_err(format_error)?;
    Ok(InstallResult {
        success: result.success,
        exit_code: result.exit_code,
        command: command_preview,
        warnings,
    })
}

fn validate_install_request(request: &InstallRequest) -> Result<()> {
    ensure_supported_package(Path::new(&request.package_path))
        .context("安装包格式不受支持，仅支持 .msix / .msixbundle / .appx / .appxbundle")?;
    ensure_existing_file(Path::new(&request.package_path), "安装包")?;

    if let Some(license_path) = &request.license_path {
        ensure_existing_file(Path::new(license_path), "许可证文件")?;
    }

    for dependency in &request.dependency_paths {
        ensure_existing_file(Path::new(dependency), "依赖包")?;
    }

    Ok(())
}

fn parse_manifest(package_path: &Path) -> Result<PackageMetadata> {
    ensure_supported_package(package_path)
        .context("文件格式不受支持，仅支持 .msix / .msixbundle / .appx / .appxbundle")?;
    ensure_existing_file(package_path, "安装包")?;

    let file = File::open(package_path).context("无法打开安装包文件")?;
    let mut archive = ZipArchive::new(file).context("安装包不是有效的 zip/msix 文件")?;
    let bundle = is_bundle(package_path);
    let manifest_entry = find_manifest_entry(&mut archive, bundle)?;
    let manifest_xml = read_entry_to_string(&mut archive, &manifest_entry)?;
    let document = Document::parse(&manifest_xml).context("无法解析安装包清单 XML")?;

    let display_name = document
        .descendants()
        .find(|node| node.tag_name().name() == "DisplayName")
        .and_then(|node| node.text())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned);

    let identity = document
        .descendants()
        .find(|node| node.tag_name().name() == "Identity")
        .context("清单缺少 Identity 节点")?;

    let package_name = attribute_or_unknown(identity, "Name");
    let version = attribute_or_unknown(identity, "Version");
    let architecture = identity
        .attribute("ProcessorArchitecture")
        .or_else(|| identity.attribute("Architecture"))
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| infer_architecture_from_name(&package_path.to_string_lossy()));

    Ok(PackageMetadata {
        file_path: package_path.to_string_lossy().to_string(),
        file_name: package_path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or_default()
            .to_string(),
        package_kind: if bundle {
            "bundle".to_string()
        } else {
            "package".to_string()
        },
        display_name,
        package_name,
        version,
        architecture,
        manifest_dependencies: extract_manifest_dependencies(&document),
        sibling_dependency_candidates: scan_sibling_dependencies(package_path)?,
        bundled_packages: if bundle {
            extract_bundled_packages(&document)
        } else {
            Vec::new()
        },
    })
}

fn build_install_script(request: &InstallRequest) -> Result<(String, String, Vec<String>)> {
    let package_path = normalize_path(&request.package_path)?;
    let dependency_paths = request
        .dependency_paths
        .iter()
        .map(|value| normalize_path(value))
        .collect::<Result<Vec<_>>>()?;
    let dependency_strings = dependency_paths
        .iter()
        .map(|path| path.to_string_lossy().to_string())
        .collect::<Vec<_>>();
    let license_path = request
        .license_path
        .as_ref()
        .map(|value| normalize_path(value))
        .transpose()?;

    let mut warnings = Vec::new();
    let mut lines = vec![
        "$ErrorActionPreference = 'Stop'".to_string(),
        "$ProgressPreference = 'SilentlyContinue'".to_string(),
        format!("$packagePath = {}", ps_quote(&package_path.to_string_lossy())),
        format!("$dependencyPaths = {}", ps_array(&dependency_strings)),
        "Write-Output ('准备安装: ' + $packagePath)".to_string(),
        "if ($dependencyPaths.Count -gt 0) { Write-Output ('依赖包数量: ' + $dependencyPaths.Count) }".to_string(),
    ];

    let command_preview = match request.mode {
        InstallMode::CurrentUser => {
            if let Some(license) = &license_path {
                let warning = format!(
                    "当前用户安装使用 Add-AppxPackage。该命令不支持 -LicensePath，已忽略许可证：{}",
                    license.display()
                );
                warnings.push(warning.clone());
                lines.push(format!("Write-Warning {}", ps_quote(&warning)));
            }

            lines.push("if ($dependencyPaths.Count -gt 0) {".to_string());
            lines.push(
                "  Add-AppxPackage -Path $packagePath -DependencyPath $dependencyPaths -ForceApplicationShutdown"
                    .to_string(),
            );
            lines.push("} else {".to_string());
            lines.push("  Add-AppxPackage -Path $packagePath -ForceApplicationShutdown".to_string());
            lines.push("}".to_string());

            build_current_user_preview(
                &package_path,
                license_path.as_deref(),
                &dependency_paths,
            )
        }
        InstallMode::Provisioned => {
            if let Some(license) = &license_path {
                lines.push(format!("$licensePath = {}", ps_quote(&license.to_string_lossy())));
                lines.push("Write-Output ('许可证: ' + $licensePath)".to_string());
            } else {
                let warning = "未提供 license.xml，系统预安装将以 -SkipLicense 模式执行。".to_string();
                warnings.push(warning.clone());
                lines.push(format!("Write-Warning {}", ps_quote(&warning)));
            }

            let mut command =
                "Add-AppxProvisionedPackage -Online -PackagePath $packagePath".to_string();
            if !dependency_paths.is_empty() {
                command.push_str(" -DependencyPackagePath $dependencyPaths");
            }
            if license_path.is_some() {
                command.push_str(" -LicensePath $licensePath");
            } else {
                command.push_str(" -SkipLicense");
            }
            lines.push(command);

            build_provisioned_preview(&package_path, license_path.as_deref(), &dependency_paths)
        }
    };

    lines.push("Write-Output '安装命令执行完毕。'".to_string());
    Ok((lines.join("\n"), command_preview, warnings))
}

#[cfg(target_os = "windows")]
fn run_powershell_impl(app: &AppHandle, script: &str) -> Result<PowerShellResult> {
    emit_status(
        app,
        "starting",
        None,
        None,
        Some("正在启动 PowerShell...".to_string()),
    );

    let command_preview = format!(
        "powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command {}",
        ps_quote(script)
    );

    let mut child = Command::new("powershell.exe")
        .args([
            "-NoLogo",
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            script,
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .context("无法启动 powershell.exe，请确认当前系统为 Windows 且 PowerShell 可用")?;

    let stdout = child.stdout.take().context("无法捕获 PowerShell stdout")?;
    let stderr = child.stderr.take().context("无法捕获 PowerShell stderr")?;

    let stdout_app = app.clone();
    let stderr_app = app.clone();

    let stdout_task = thread::spawn(move || stream_output(stdout, "stdout", stdout_app));
    let stderr_task = thread::spawn(move || stream_output(stderr, "stderr", stderr_app));

    let status = child.wait().context("等待 PowerShell 执行完成时失败")?;
    let _ = stdout_task.join();
    let _ = stderr_task.join();

    let exit_code = status.code().unwrap_or(-1);
    if status.success() {
        emit_status(
            app,
            "completed",
            Some(true),
            Some(exit_code),
            Some("PowerShell 执行成功。".to_string()),
        );
    } else {
        emit_status(
            app,
            "completed",
            Some(false),
            Some(exit_code),
            Some(format!("PowerShell 执行失败，退出码 {exit_code}。")),
        );
    }

    Ok(PowerShellResult {
        success: status.success(),
        exit_code,
        command: command_preview,
    })
}

#[cfg(not(target_os = "windows"))]
fn run_powershell_impl(_app: &AppHandle, _script: &str) -> Result<PowerShellResult> {
    Err(anyhow!(
        "当前不是 Windows 系统，无法执行 PowerShell 安装命令。请在 Windows 上运行该应用。"
    ))
}

#[cfg(target_os = "windows")]
fn stream_output<R: Read>(reader: R, stream: &str, app: AppHandle) {
    let buffered = BufReader::new(reader);
    for line in buffered.lines() {
        match line {
            Ok(content) => {
                let message = content.trim_end().to_string();
                if !message.is_empty() {
                    let _ = app.emit(
                        LOG_EVENT,
                        PowerShellLogEvent {
                            stream: stream.to_string(),
                            message,
                        },
                    );
                }
            }
            Err(error) => {
                let _ = app.emit(
                    LOG_EVENT,
                    PowerShellLogEvent {
                        stream: "stderr".to_string(),
                        message: format!("读取 PowerShell 输出失败: {error}"),
                    },
                );
                break;
            }
        }
    }
}

#[cfg(target_os = "windows")]
fn emit_status(
    app: &AppHandle,
    stage: &str,
    success: Option<bool>,
    exit_code: Option<i32>,
    message: Option<String>,
) {
    let _ = app.emit(
        STATUS_EVENT,
        PowerShellStatusEvent {
            stage: stage.to_string(),
            success,
            exit_code,
            message,
        },
    );
}

fn find_manifest_entry(archive: &mut ZipArchive<File>, bundle: bool) -> Result<String> {
    let preferred = if bundle {
        vec!["AppxMetadata/AppxBundleManifest.xml", "AppxBundleManifest.xml"]
    } else {
        vec!["AppxManifest.xml"]
    };

    let names = archive.file_names().map(|name| name.to_string()).collect::<Vec<_>>();
    for candidate in &preferred {
        if let Some(found) = names.iter().find(|name| {
            name.eq_ignore_ascii_case(candidate) || name.ends_with(candidate)
        }) {
            return Ok(found.to_string());
        }
    }

    let fallback = if bundle {
        "AppxBundleManifest.xml"
    } else {
        "AppxManifest.xml"
    };

    names
        .into_iter()
        .find(|name| name.ends_with(fallback))
        .ok_or_else(|| anyhow!("安装包中未找到 {fallback}"))
}

fn read_entry_to_string(archive: &mut ZipArchive<File>, name: &str) -> Result<String> {
    let mut entry = archive
        .by_name(name)
        .with_context(|| format!("无法读取清单文件: {name}"))?;
    let mut content = String::new();
    entry.read_to_string(&mut content)
        .with_context(|| format!("无法读取清单文本: {name}"))?;
    Ok(content)
}

fn extract_manifest_dependencies(document: &Document<'_>) -> Vec<ManifestDependency> {
    document
        .descendants()
        .filter(|node| node.tag_name().name().ends_with("PackageDependency"))
        .filter_map(|node| {
            let name = node.attribute("Name")?.trim();
            if name.is_empty() {
                return None;
            }

            Some(ManifestDependency {
                name: name.to_string(),
                min_version: node.attribute("MinVersion").map(ToOwned::to_owned),
                publisher: node.attribute("Publisher").map(ToOwned::to_owned),
                architecture: node
                    .attribute("ProcessorArchitecture")
                    .or_else(|| node.attribute("Architecture"))
                    .map(ToOwned::to_owned),
            })
        })
        .collect()
}

fn extract_bundled_packages(document: &Document<'_>) -> Vec<BundledPackage> {
    let mut packages = document
        .descendants()
        .filter(|node| node.tag_name().name() == "Package")
        .filter_map(|node| {
            let file_name = node.attribute("FileName")?.trim();
            if file_name.is_empty() {
                return None;
            }

            Some(BundledPackage {
                file_name: file_name.to_string(),
                architecture: node
                    .attribute("Architecture")
                    .map(ToOwned::to_owned)
                    .unwrap_or_else(|| "unknown".to_string()),
                package_type: node
                    .attribute("Type")
                    .map(ToOwned::to_owned)
                    .unwrap_or_else(|| "application".to_string()),
                version: node.attribute("Version").map(ToOwned::to_owned),
            })
        })
        .collect::<Vec<_>>();

    packages.sort_by(|left, right| left.file_name.cmp(&right.file_name));
    packages
}

fn scan_sibling_dependencies(package_path: &Path) -> Result<Vec<DetectedDependency>> {
    let Some(directory) = package_path.parent() else {
        return Ok(Vec::new());
    };

    let current = package_path
        .canonicalize()
        .unwrap_or_else(|_| package_path.to_path_buf());
    let mut dependencies = Vec::new();

    for entry in fs::read_dir(directory).context("无法读取安装包所在目录")? {
        let entry = entry?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        let candidate = path.canonicalize().unwrap_or(path.clone());
        if candidate == current {
            continue;
        }

        let Some(extension) = path.extension().and_then(|value| value.to_str()) else {
            continue;
        };

        let extension = extension.to_ascii_lowercase();
        if !matches!(extension.as_str(), "appx" | "msix") {
            continue;
        }

        let file_name = path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or_default()
            .to_string();

        dependencies.push(DetectedDependency {
            architecture: infer_architecture_from_name(&file_name),
            file_name,
            path: path.to_string_lossy().to_string(),
        });
    }

    dependencies.sort_by(|left, right| left.file_name.cmp(&right.file_name));
    Ok(dependencies)
}

fn build_current_user_preview(
    package_path: &Path,
    license_path: Option<&Path>,
    dependencies: &[PathBuf],
) -> String {
    let mut preview = format!("Add-AppxPackage -Path {}", ps_quote(&package_path.to_string_lossy()));

    if !dependencies.is_empty() {
        let items = dependencies
            .iter()
            .map(|path| ps_quote(&path.to_string_lossy()))
            .collect::<Vec<_>>()
            .join(", ");
        preview.push_str(&format!(" -DependencyPath @({items})"));
    }

    preview.push_str(" -ForceApplicationShutdown");

    if let Some(license) = license_path {
        preview.push_str(&format!(
            "  # 已忽略 LicensePath {}",
            ps_quote(&license.to_string_lossy())
        ));
    }

    preview
}

fn build_provisioned_preview(
    package_path: &Path,
    license_path: Option<&Path>,
    dependencies: &[PathBuf],
) -> String {
    let mut preview = format!(
        "Add-AppxProvisionedPackage -Online -PackagePath {}",
        ps_quote(&package_path.to_string_lossy())
    );

    if !dependencies.is_empty() {
        let items = dependencies
            .iter()
            .map(|path| ps_quote(&path.to_string_lossy()))
            .collect::<Vec<_>>()
            .join(", ");
        preview.push_str(&format!(" -DependencyPackagePath @({items})"));
    }

    if let Some(license) = license_path {
        preview.push_str(&format!(
            " -LicensePath {}",
            ps_quote(&license.to_string_lossy())
        ));
    } else {
        preview.push_str(" -SkipLicense");
    }

    preview
}

fn ensure_supported_package(path: &Path) -> Result<()> {
    let Some(extension) = path.extension().and_then(|value| value.to_str()) else {
        return Err(anyhow!("文件缺少扩展名"));
    };

    if matches!(
        extension.to_ascii_lowercase().as_str(),
        "msix" | "msixbundle" | "appx" | "appxbundle"
    ) {
        Ok(())
    } else {
        Err(anyhow!("不支持的安装包扩展名: {extension}"))
    }
}

fn ensure_existing_file(path: &Path, label: &str) -> Result<()> {
    if !path.exists() {
        return Err(anyhow!("{label}不存在: {}", path.display()));
    }

    if !path.is_file() {
        return Err(anyhow!("{label}不是文件: {}", path.display()));
    }

    Ok(())
}

fn normalize_path(value: &str) -> Result<PathBuf> {
    let path = PathBuf::from(value);
    ensure_existing_file(&path, "文件")?;
    Ok(path.canonicalize().unwrap_or(path))
}

fn is_bundle(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|value| value.to_str())
            .map(|value| value.to_ascii_lowercase())
            .as_deref(),
        Some("msixbundle" | "appxbundle")
    )
}

fn infer_architecture_from_name(value: &str) -> String {
    let lowered = value.to_ascii_lowercase();
    if lowered.contains("arm64") {
        "arm64".to_string()
    } else if lowered.contains("x64") {
        "x64".to_string()
    } else if lowered.contains("x86") {
        "x86".to_string()
    } else if lowered.contains("neutral") {
        "neutral".to_string()
    } else {
        "unknown".to_string()
    }
}

fn attribute_or_unknown(node: roxmltree::Node<'_, '_>, attribute: &str) -> String {
    node.attribute(attribute)
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| "unknown".to_string())
}

fn ps_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

fn ps_array(values: &[String]) -> String {
    if values.is_empty() {
        "@()".to_string()
    } else {
        let joined = values
            .iter()
            .map(|value| ps_quote(value))
            .collect::<Vec<_>>()
            .join(", ");
        format!("@({joined})")
    }
}

fn format_error(error: anyhow::Error) -> String {
    error.to_string()
}
