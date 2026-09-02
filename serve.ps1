# Minimal static file server for SnapBooth.
# The booth needs a real http:// origin because getUserMedia is disabled on
# file:// pages. No Node, no Python required - this uses .NET's HttpListener.
#
#   powershell -ExecutionPolicy Bypass -File serve.ps1
#   then open http://localhost:8000

param(
  [int]$Port = 8000
)

$ErrorActionPreference = 'Stop'
$root = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$prefix = "http://localhost:$Port/"

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.jsx'  = 'text/babel; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.gif'  = 'image/gif'
  '.ico'  = 'image/x-icon'
  '.webm' = 'video/webm'
  '.md'   = 'text/markdown; charset=utf-8'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
  $listener.Start()
} catch {
  Write-Host "Could not bind $prefix" -ForegroundColor Red
  Write-Host $_.Exception.Message
  Write-Host ""
  Write-Host "If it says 'Access is denied', either run this in an elevated"
  Write-Host "PowerShell, or reserve the port once as admin:"
  Write-Host "  netsh http add urlacl url=$prefix user=$env:USERNAME"
  exit 1
}

Write-Host ""
Write-Host "  SnapBooth is serving $root" -ForegroundColor Green
Write-Host "  -> $prefix" -ForegroundColor Cyan
Write-Host "  Ctrl+C to stop."
Write-Host ""

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $req = $context.Request
    $res = $context.Response

    try {
      $rel = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath).TrimStart('/')
      if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'index.html' }
      $path = Join-Path $root $rel

      # keep requests inside the served folder
      $full = [System.IO.Path]::GetFullPath($path)
      if (-not $full.StartsWith([System.IO.Path]::GetFullPath($root), [StringComparison]::OrdinalIgnoreCase)) {
        $res.StatusCode = 403
        $bytes = [Text.Encoding]::UTF8.GetBytes('403 forbidden')
      }
      elseif (Test-Path -LiteralPath $full -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($full).ToLower()
        $type = $mime[$ext]
        if (-not $type) { $type = 'application/octet-stream' }
        $res.ContentType = $type
        $res.Headers.Add('Cache-Control', 'no-store')
        $bytes = [System.IO.File]::ReadAllBytes($full)
        $res.StatusCode = 200
      }
      else {
        $res.StatusCode = 404
        $res.ContentType = 'text/plain; charset=utf-8'
        $bytes = [Text.Encoding]::UTF8.GetBytes("404 not found: /$rel")
      }

      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
      Write-Host ("{0}  {1}  /{2}" -f $res.StatusCode, $req.HttpMethod, $rel)
    } catch {
      Write-Host "error: $($_.Exception.Message)" -ForegroundColor Yellow
    } finally {
      $res.OutputStream.Close()
    }
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
