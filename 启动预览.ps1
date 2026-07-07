$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 4173
$prefix = "http://127.0.0.1:$port/"

Add-Type -AssemblyName System.Web

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)

try {
  $listener.Start()
} catch {
  Write-Host "端口 $port 可能已被占用，请先关闭已有预览服务。"
  throw
}

Start-Process $prefix
Write-Host "售后工程师技能图鉴预览已启动：$prefix"
Write-Host "关闭此窗口即可停止预览。"

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $requestPath = [System.Web.HttpUtility]::UrlDecode($context.Request.Url.AbsolutePath.TrimStart("/"))
  if ([string]::IsNullOrWhiteSpace($requestPath)) {
    $requestPath = "index.html"
  }

  $filePath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $requestPath))
  if (-not $filePath.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase) -or -not [System.IO.File]::Exists($filePath)) {
    $context.Response.StatusCode = 404
    $buffer = [System.Text.Encoding]::UTF8.GetBytes("Not found")
    $context.Response.OutputStream.Write($buffer, 0, $buffer.Length)
    $context.Response.Close()
    continue
  }

  $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
  $contentType = switch ($extension) {
    ".html" { "text/html; charset=utf-8" }
    ".json" { "application/json; charset=utf-8" }
    ".js" { "text/javascript; charset=utf-8" }
    ".css" { "text/css; charset=utf-8" }
    default { "application/octet-stream" }
  }

  $bytes = [System.IO.File]::ReadAllBytes($filePath)
  $context.Response.ContentType = $contentType
  $context.Response.ContentLength64 = $bytes.Length
  $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $context.Response.Close()
}
