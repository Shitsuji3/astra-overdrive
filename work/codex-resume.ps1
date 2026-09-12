# codex-resume.ps1 - Codex exec orchestrator with rate-limit aware auto-resume.
# Runs `codex exec` against the project until work/MOTION-HANDOFF.md line 1 says STATUS: DONE.
# On a usage-limit stop, parses the Japanese resume timestamp and sleeps until that time + 1 minute.

$ErrorActionPreference = 'Continue'

$Proj       = 'C:\Users\situz\Documents\ChatGPT\Astragemes'
$Log        = Join-Path $Proj 'codex-resume.log'
$Handoff    = Join-Path $Proj 'work\MOTION-HANDOFF.md'
$MaxRetries = 12
$IoDir      = Join-Path $env:TEMP 'codex-resume-io'

if (-not (Test-Path -LiteralPath $IoDir)) { New-Item -ItemType Directory -Path $IoDir -Force | Out-Null }

$Prompt = @'
work\MOTION-HANDOFF.md を読んで残作業を継続。Astra→Luna分担（Astraは設計・レビューのみ、reasoning_effort=medium、実装はLunaへspawn_agentでfork_turns=none）。中断時はMOTION-HANDOFF.mdに現状・残課題・受入条件を更新。完了したら1行目に STATUS: DONE を書く。
'@

$PromptFile = Join-Path $IoDir 'prompt.txt'
[System.IO.File]::WriteAllText($PromptFile, $Prompt, (New-Object System.Text.UTF8Encoding($false)))

# Append with FileShare.ReadWrite so a reader (tail -f, an editor, a log viewer) can never
# block us. Add-Content asks for a stricter share mode and silently loses lines when a
# watcher holds the file open, which is exactly how attempt 1's log went missing.
function Write-LogLine {
    param([string]$Value)
    for ($i = 0; $i -lt 25; $i++) {
        try {
            $fs = New-Object System.IO.FileStream($Log, [System.IO.FileMode]::Append, [System.IO.FileAccess]::Write, [System.IO.FileShare]::ReadWrite)
            $sw = New-Object System.IO.StreamWriter($fs, (New-Object System.Text.UTF8Encoding($false)))
            try { $sw.WriteLine($Value); $sw.Flush() } finally { $sw.Dispose(); $fs.Dispose() }
            return
        } catch {
            Start-Sleep -Milliseconds 200
        }
    }
}

function Write-Log {
    param([string]$Message)
    Write-LogLine ('[{0:yyyy-MM-dd HH:mm:ss}] {1}' -f (Get-Date), $Message)
}

function Write-LogRaw {
    param([string]$Text)
    if ([string]::IsNullOrWhiteSpace($Text)) { Write-LogLine '(empty)'; return }
    Write-LogLine $Text
}

# Ask Windows not to idle-sleep while this orchestrator is alive. This is a per-process
# runtime request (the same one media players use) - it changes no power settings and is
# released automatically when the process exits. It does NOT override a manual Sleep or a
# lid-close action. SetThreadExecutionState is per-thread, so we re-assert it inside the
# wait loop rather than relying on a single call at startup.
function Set-KeepAwake {
    try {
        if (-not ('Win32Power.Native' -as [type])) {
            Add-Type -Namespace Win32Power -Name Native -MemberDefinition @'
[DllImport("kernel32.dll", SetLastError = true)]
public static extern uint SetThreadExecutionState(uint esFlags);
'@
        }
        $ES_CONTINUOUS        = [uint32]2147483648  # 0x80000000
        $ES_SYSTEM_REQUIRED   = [uint32]1           # 0x00000001
        $ES_AWAYMODE_REQUIRED = [uint32]64          # 0x00000040
        $r = [Win32Power.Native]::SetThreadExecutionState($ES_CONTINUOUS + $ES_SYSTEM_REQUIRED + $ES_AWAYMODE_REQUIRED)
        if ($r -eq 0) {
            # Away mode is not supported on every machine; fall back to plain sleep suppression.
            $r = [Win32Power.Native]::SetThreadExecutionState($ES_CONTINUOUS + $ES_SYSTEM_REQUIRED)
        }
        return ($r -ne 0)
    } catch {
        return $false
    }
}

function Get-CodexPath {
    $base = Join-Path $env:LOCALAPPDATA 'OpenAI\Codex\bin'
    if (-not (Test-Path -LiteralPath $base)) { return $null }
    $cands = Get-ChildItem -LiteralPath $base -Directory -ErrorAction SilentlyContinue |
        ForEach-Object { Join-Path $_.FullName 'codex.exe' } |
        Where-Object { Test-Path -LiteralPath $_ }
    if (-not $cands) { return $null }
    return ($cands | Sort-Object { (Get-Item -LiteralPath $_).LastWriteTime } -Descending | Select-Object -First 1)
}

function Test-Done {
    if (-not (Test-Path -LiteralPath $Handoff)) { return $false }
    $first = Get-Content -LiteralPath $Handoff -TotalCount 1 -Encoding UTF8
    if ($null -eq $first) { return $false }
    return ([string]$first -match 'STATUS:\s*DONE')
}

function Remove-Ansi {
    param([string]$Text)
    if ([string]::IsNullOrEmpty($Text)) { return '' }
    return [regex]::Replace($Text, "\x1b\[[0-9;?]*[a-zA-Z]", '')
}

# Parse the resume time out of Codex's usage-limit message.
function Get-RetryTime {
    param([string]$Text)
    if ([string]::IsNullOrEmpty($Text)) { return $null }
    $c = Remove-Ansi $Text

    # 1) もう一度お試しください yyyy/MM/dd HH:mm
    $m = [regex]::Match($c, 'もう一度お試しください[^0-9]{0,40}(\d{4})[/／\-年](\d{1,2})[/／\-月](\d{1,2})[^0-9]{0,12}(\d{1,2}):(\d{2})')
    if ($m.Success) {
        try {
            return (Get-Date -Year ([int]$m.Groups[1].Value) -Month ([int]$m.Groups[2].Value) -Day ([int]$m.Groups[3].Value) -Hour ([int]$m.Groups[4].Value) -Minute ([int]$m.Groups[5].Value) -Second 0 -Millisecond 0)
        } catch { }
    }

    # 2) もう一度お試しください HH:mm  (date omitted)
    $m = [regex]::Match($c, 'もう一度お試しください[^0-9]{0,40}(\d{1,2}):(\d{2})')
    if ($m.Success) {
        try {
            $t = Get-Date -Hour ([int]$m.Groups[1].Value) -Minute ([int]$m.Groups[2].Value) -Second 0 -Millisecond 0
            if ($t -lt (Get-Date)) { $t = $t.AddDays(1) }
            return $t
        } catch { }
    }

    # 3) English fallback: "try again at 2026-09-07 03:00"
    $m = [regex]::Match($c, '(?i)try again (?:at|after|on)[^0-9]{0,20}(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})[^0-9]{0,12}(\d{1,2}):(\d{2})')
    if ($m.Success) {
        try {
            return (Get-Date -Year ([int]$m.Groups[1].Value) -Month ([int]$m.Groups[2].Value) -Day ([int]$m.Groups[3].Value) -Hour ([int]$m.Groups[4].Value) -Minute ([int]$m.Groups[5].Value) -Second 0 -Millisecond 0)
        } catch { }
    }

    # 3b) English long form actually emitted by `codex exec`:
    #     "You've hit your usage limit. ... or try again at Sep 7th, 2026 3:26 AM."
    $m = [regex]::Match($c, '(?i)try again (?:at|on|after)\s+([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\s*,?\s*(?:at\s+)?(\d{1,2}):(\d{2})\s*(AM|PM)?')
    if ($m.Success) {
        $months = @{ jan = 1; feb = 2; mar = 3; apr = 4; may = 5; jun = 6; jul = 7; aug = 8; sep = 9; oct = 10; nov = 11; dec = 12 }
        $key = $m.Groups[1].Value.ToLower()
        if ($key.Length -gt 3) { $key = $key.Substring(0, 3) }
        if ($months.ContainsKey($key)) {
            $hh = [int]$m.Groups[4].Value
            $ap = $m.Groups[6].Value.ToUpper()
            if ($ap -eq 'PM' -and $hh -lt 12) { $hh += 12 }
            if ($ap -eq 'AM' -and $hh -eq 12) { $hh = 0 }
            try {
                return (New-Object System.DateTime([int]$m.Groups[3].Value, $months[$key], [int]$m.Groups[2].Value, $hh, [int]$m.Groups[5].Value, 0))
            } catch { }
        }
    }

    # 3c) English short form, date omitted: "... or try again at 3:26 AM."
    $m = [regex]::Match($c, '(?i)try again (?:at|on|after)\s+(\d{1,2}):(\d{2})\s*(AM|PM)?')
    if ($m.Success) {
        $hh = [int]$m.Groups[1].Value
        $ap = $m.Groups[3].Value.ToUpper()
        if ($ap -eq 'PM' -and $hh -lt 12) { $hh += 12 }
        if ($ap -eq 'AM' -and $hh -eq 12) { $hh = 0 }
        try {
            $now = Get-Date
            $t = New-Object System.DateTime($now.Year, $now.Month, $now.Day, $hh, [int]$m.Groups[2].Value, 0)
            if ($t -lt $now) { $t = $t.AddDays(1) }
            return $t
        } catch { }
    }

    # 4) Relative: "resets in 3 hours 20 minutes" / "3時間20分後"
    $m = [regex]::Match($c, '(?i)(?:resets?|available|try again)[^0-9]{0,20}(?:in\s+)?(?:(\d{1,3})\s*(?:hours?|hrs?|時間))?\s*(?:(\d{1,3})\s*(?:minutes?|mins?|分))?')
    if ($m.Success -and ($m.Groups[1].Success -or $m.Groups[2].Success)) {
        $h = 0; $mi = 0
        if ($m.Groups[1].Success) { $h = [int]$m.Groups[1].Value }
        if ($m.Groups[2].Success) { $mi = [int]$m.Groups[2].Value }
        if (($h + $mi) -gt 0) { return (Get-Date).AddHours($h).AddMinutes($mi) }
    }

    return $null
}

function Test-RateLimited {
    param([string]$Text)
    if ([string]::IsNullOrEmpty($Text)) { return $false }
    $c = Remove-Ansi $Text
    return ($c -match '(?i)使用量|利用制限|制限に達|上限に達|もう一度お試しください|rate.?limit|usage limit|quota|too many requests|\b429\b')
}

function Wait-Until {
    param([datetime]$Target, [string]$Label)
    $lastBeat = Get-Date
    while ((Get-Date) -lt $Target) {
        $remain = ($Target - (Get-Date)).TotalSeconds
        if ($remain -le 0) { break }
        [void](Set-KeepAwake)   # re-assert every loop; the flag is per-thread
        Start-Sleep -Seconds ([int][Math]::Max(1, [Math]::Min(60, [Math]::Ceiling($remain))))
        if (((Get-Date) - $lastBeat).TotalMinutes -ge 15) {
            $lastBeat = Get-Date
            Write-Log ('  ...waiting ({0}). {1:N0} min left, target {2:yyyy-MM-dd HH:mm:ss}' -f $Label, (($Target - (Get-Date)).TotalMinutes), $Target)
        }
    }
}

# ---------------------------------------------------------------- main

Write-Log '================ codex-resume orchestrator START ================'
Write-Log ('project : {0}' -f $Proj)
Write-Log ('handoff : {0}' -f $Handoff)
Write-Log ('max runs: {0} (1 initial + {1} retries)' -f ($MaxRetries + 1), $MaxRetries)
if (Set-KeepAwake) {
    Write-Log 'keep-awake: ON (idle sleep suppressed for as long as this process runs)'
} else {
    Write-Log 'keep-awake: FAILED to register - the machine may idle-sleep and pause the loop until it wakes'
}

$codex = Get-CodexPath
if (-not $codex) {
    Write-Log 'FATAL: codex.exe not found under %LOCALAPPDATA%\OpenAI\Codex\bin'
    exit 2
}
Write-Log ('codex   : {0}' -f $codex)
Write-Log ('version : {0}' -f ((& $codex --version) -join ' '))

if (Test-Done) {
    Write-Log 'STATUS: DONE already present on line 1. Nothing to do.'
    Write-Log '================ codex-resume orchestrator END (already done) ================'
    exit 0
}

$totalRuns = $MaxRetries + 1
$attempt = 0

while ($attempt -lt $totalRuns) {
    $attempt++

    $codex = Get-CodexPath   # re-resolve in case Codex self-updated into a new hashed dir
    if (-not $codex) { Write-Log 'FATAL: codex.exe disappeared.'; exit 2 }

    $so = Join-Path $IoDir ('stdout-{0:d2}.txt' -f $attempt)
    $se = Join-Path $IoDir ('stderr-{0:d2}.txt' -f $attempt)

    Write-Log ('---------------- attempt {0}/{1} : codex exec --cd {2} ----------------' -f $attempt, $totalRuns, $Proj)

    # --approve-for-me already implies the workspace-write sandbox; passing --sandbox too is rejected.
    # reasoning effort medium per the handoff's Astra role (default here is "ultra", which burns the
    # 5-hour quota much faster). Drop the -c pair to fall back to the configured default.
    $cxArgs = @('exec', '--cd', $Proj, '--approve-for-me', '--color', 'never', '-c', 'model_reasoning_effort="medium"')
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $code = -1
    try {
        $p = Start-Process -FilePath $codex -ArgumentList $cxArgs -NoNewWindow -Wait -PassThru -RedirectStandardInput $PromptFile -RedirectStandardOutput $so -RedirectStandardError $se
        if ($null -ne $p) { $code = $p.ExitCode }
    } catch {
        Write-Log ('run could not start: {0}' -f $_.Exception.Message)
    }
    $sw.Stop()

    $out = ''; $err = ''
    if (Test-Path -LiteralPath $so) { $out = [string](Get-Content -LiteralPath $so -Raw -Encoding UTF8) }
    if (Test-Path -LiteralPath $se) { $err = [string](Get-Content -LiteralPath $se -Raw -Encoding UTF8) }

    Write-Log ('exit={0}  elapsed={1:N0}s' -f $code, $sw.Elapsed.TotalSeconds)
    Write-LogRaw '----- STDOUT -----'
    Write-LogRaw $out
    Write-LogRaw '----- STDERR -----'
    Write-LogRaw $err
    Write-LogRaw '------------------'

    if (Test-Done) {
        Write-Log ('STATUS: DONE found on line 1 after attempt {0}. All 3 tasks reported complete.' -f $attempt)
        Write-Log '================ codex-resume orchestrator END (done) ================'
        exit 0
    }

    if ($attempt -ge $totalRuns) {
        Write-Log ('Reached max runs ({0}) without STATUS: DONE. Stopping.' -f $totalRuns)
        Write-Log '================ codex-resume orchestrator END (max attempts) ================'
        exit 1
    }

    $combined = ($out + "`n" + $err)
    $resume = Get-RetryTime $combined

    if ($resume) {
        $target = $resume.AddMinutes(1)
        if ($target -lt (Get-Date)) { $target = (Get-Date).AddMinutes(1) }
        Write-Log ('usage limit hit. parsed resume time {0:yyyy-MM-dd HH:mm} -> waking at {1:yyyy-MM-dd HH:mm:ss} (+1 min)' -f $resume, $target)
        Wait-Until $target 'usage limit'
    }
    elseif (Test-RateLimited $combined) {
        $target = (Get-Date).AddMinutes(30)
        Write-Log ('usage limit keywords present but no parseable timestamp. backing off 30 min, waking at {0:yyyy-MM-dd HH:mm:ss}' -f $target)
        Wait-Until $target 'limit (no timestamp)'
    }
    else {
        $target = (Get-Date).AddSeconds(60)
        Write-Log ('no usage-limit signal (exit={0}) and not DONE. short 60s backoff, waking at {1:HH:mm:ss}' -f $code, $target)
        Wait-Until $target 'short backoff'
    }

    Write-Log 'resuming.'
}
