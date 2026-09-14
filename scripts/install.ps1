param([switch]$Claude, [switch]$Dsh)
$root = $PSScriptRoot | Split-Path -Parent
if($Claude){
  $dst = Join-Path $env:USERPROFILE ".claude\skills\antislop-universal"
  if(Test-Path $dst){ Write-Host "antislop-universal already at $dst - skipping (legacy untouched)" } else {
    New-Item -ItemType Junction -Path $dst -Target (Join-Path $root "skills") | Out-Null
    Write-Host "Claude adapter: junction $dst -> skills/"
  }
}
if($Dsh -or -not $Claude){
  # dsh: junction plugin into both web + headless profiles, dedupe dsh-tools shadows first
  $plugin = Join-Path $root "adapters\dsh"
  foreach($prof in @("web","headless")){
    $plugDst = Join-Path $env:USERPROFILE ".dsh\profiles\$prof\node_modules\universal-antislop-dsh"
    if(Test-Path $plugDst){ Remove-Item $plugDst -Recurse -Force }
    New-Item -ItemType Junction -Path $plugDst -Target $plugin | Out-Null
    Write-Host "dsh $prof : junction $plugDst"
    # dedupe: remove shadowed dsh-tools/cordis copies so single instance provides ToolRuntime
    foreach($s in @("dsh-tools","cordis","cosmokit","dsh-brand","dsh-util-values","schemastery")){
      $p = Join-Path $env:USERPROFILE ".dsh\profiles\$prof\node_modules\@deepseek-ai\$s"
      if((Test-Path $p) -and -not (Get-Item $p).LinkType){ Remove-Item $p -Recurse -Force; Write-Host "  deduped $prof\$s" }
    }
  }
  Write-Host "Add to each profile cordis.patch.yml:"
  Write-Host "  - insert:"
  Write-Host "      - id: universal-antislop"
  Write-Host "        name: universal-antislop-dsh"
}
if(-not $Claude -and -not $Dsh){ Write-Host 'Usage: .\scripts\install.ps1 -Claude | -Dsh  (or both)' }
