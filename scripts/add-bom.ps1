param([string]$Path)
$content = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
$utf8bom = [System.Text.UTF8Encoding]::new($true)
[System.IO.File]::WriteAllText($Path, $content, $utf8bom)
Write-Host "Saved with UTF-8 BOM: $Path"
