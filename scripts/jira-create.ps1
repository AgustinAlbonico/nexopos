#!/usr/bin/env pwsh
# Create a Jira issue on nexopos.atlassian.net
# Usage:
#   ./scripts/jira-create.ps1 -Summary "[Auth] Login falla" -ModuleName Auth
#   echo "body markdown" | ./scripts/jira-create.ps1 -Summary "..." -ModuleName Auth
#
# Env vars:
#   JIRA_URL (default https://nexopos.atlassian.net)
#   JIRA_USERNAME (email Atlassian)
#   JIRA_API_TOKEN (https://id.atlassian.com/manage-profile/security/api-tokens)
#
# Project Key: SCRUM (unico en la cuenta)

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Summary,
    [string]$ModuleName = "General",
    [string]$ProjectKey = "SCRUM",
    [string]$IssueType = "Tarea",
    [string]$Description = ""   # markdown; stdin si vacio
)

$ErrorActionPreference = "Stop"

# Strip wrapping quotes if any
$Summary = $Summary.Trim('"', "'")

if ([string]::IsNullOrWhiteSpace($Description)) {
    if ($Host.Name -eq 'ConsoleHost' -and $PSVersionTable.Platform -ne 'Unix') {
        # Read from stdin if available
        try {
            $piped = [Console]::In.ReadToEnd()
            if ($piped) { $Description = $piped.Trim() }
        } catch {}
    }
}

if ([string]::IsNullOrWhiteSpace($Description)) {
    # ASCII-only default so the script works regardless of file encoding
    $Description = @"
### Problema / Necesidad
A definir.

### Criterios de Aceptacion
- [ ] TBD

### Especificacion Tecnica
- **Base de Datos / Migraciones:** N/A
- **Backend (NestJS):** N/A
- **Frontend (React/Vite):** N/A

### Fuera de Alcance
- N/A
"@
}

$JiraUrl = if ($env:JIRA_URL) { $env:JIRA_URL } else { "https://nexopos.atlassian.net" }
$JiraUser = $env:JIRA_USERNAME
$JiraToken = $env:JIRA_API_TOKEN

if (-not $JiraUser -or -not $JiraToken) {
    Write-Error "Faltan JIRA_USERNAME / JIRA_API_TOKEN en variables de entorno."
    exit 1
}

# Basic auth
$pair = "$($JiraUser):$($JiraToken)"
$b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
$headers = @{
    Authorization = "Basic $b64"
    Accept        = "application/json"
    "Content-Type" = "application/json"
}

# Markdown -> ADF (Atlassian Document Format) minimale.
# Cada bloque markdown se mapea a un nodo ADF equivalente.
function ConvertTo-Adf {
    param([string]$Md)

    $lines = $Md -split "`r?`n"
    $nodes = New-Object System.Collections.Generic.List[object]
    $paragraph = New-Object System.Collections.Generic.List[string]
    $listKind = $null   # 'bullet' | 'ordered'
    $taskList = New-Object System.Collections.Generic.List[object]
    $inCode = $false; $codeBuf = New-Object System.Collections.Generic.List[string]; $codeLang = $null

    function Flush-Paragraph {
        if ($paragraph.Count -gt 0) {
            $text = ($paragraph -join " ").Trim()
            if ($text) {
                $content = New-Object System.Collections.Generic.List[object]
                # Inline parse: simple, link [txt](url) and **bold** *italic* ``code``
                $remaining = $text
                while ($remaining.Length -gt 0) {
                    # inline code
                    if ($remaining -match '^(`+)([^`]+)\1') {
                        $content.Add(@{ type = 'text'; text = $matches[2]; marks = @(@{ type = 'code' }) })
                        $remaining = $remaining.Substring($matches[0].Length)
                        continue
                    }
                    # bold
                    if ($remaining -match '^\*\*([^*]+)\*\*') {
                        $content.Add(@{ type = 'text'; text = $matches[1]; marks = @(@{ type = 'strong' }) })
                        $remaining = $remaining.Substring($matches[0].Length)
                        continue
                    }
                    # italic
                    if ($remaining -match '^\*([^*]+)\*') {
                        $content.Add(@{ type = 'text'; text = $matches[1]; marks = @(@{ type = 'em' }) })
                        $remaining = $remaining.Substring($matches[0].Length)
                        continue
                    }
                    # link
                    if ($remaining -match '^\[([^\]]+)\]\(([^)]+)\)') {
                        $content.Add(@{ type = 'text'; text = $matches[1]; marks = @(@{ type = 'link'; attrs = @{ href = $matches[2] } }) })
                        $remaining = $remaining.Substring($matches[0].Length)
                        continue
                    }
                    # hasta el siguiente token especial o el fin
                    if ($remaining -match '^(.+?)(?=`+\*+|\[[^\]]+\]\(|$)') {
                        $content.Add(@{ type = 'text'; text = $matches[1] })
                        $remaining = $remaining.Substring($matches[1].Length)
                    } else {
                        $content.Add(@{ type = 'text'; text = $remaining })
                        $remaining = ''
                    }
                }
                if ($content.Count -eq 0) { $content.Add(@{ type = 'text'; text = ' ' }) }
                $nodes.Add(@{ type = 'paragraph'; content = $content }) | Out-Null
            }
            $paragraph.Clear() | Out-Null
        }
    }

    function Flush-List {
        if ($listKind -and $taskList.Count -gt 0) {
            $items = New-Object System.Collections.Generic.List[object]
            foreach ($it in $taskList) {
                $itemContent = New-Object System.Collections.Generic.List[object]
                $itemContent.Add(@{ type = 'paragraph'; content = @(@{ type = 'text'; text = $it }) }) | Out-Null
                $items.Add(@{ type = 'listItem'; content = $itemContent }) | Out-Null
            }
            $nodeType = if ($listKind -eq 'ordered') { 'orderedList' } else { 'bulletList' }
            $nodes.Add(@{ type = $nodeType; content = $items }) | Out-Null
            $taskList.Clear() | Out-Null
            $listKind = $null
        }
    }

    function Flush-Code {
        if ($inCode -and $codeBuf.Count -gt 0) {
            $nodes.Add(@{
                type = 'codeBlock';
                attrs = if ($codeLang) { @{ language = $codeLang } } else { @{} };
                content = @(@{ type = 'text'; text = ($codeBuf -join "`n") })
            }) | Out-Null
            $codeBuf.Clear() | Out-Null
            $inCode = $false
            $codeLang = $null
        }
    }

    foreach ($raw in $lines) {
        $line = $raw
        if ($inCode) {
            if ($line -match '^```\s*$') { Flush-Code } else { $codeBuf.Add($line) }
            continue
        }
        if ($line -match '^```(\w*)\s*$') {
            Flush-Paragraph; Flush-List
            $inCode = $true
            $codeLang = if ($matches[1]) { $matches[1] } else { $null }
            continue
        }
        if ($line -match '^\s*$') {
            Flush-Paragraph; Flush-List
            continue
        }
        if ($line -match '^(#{1,6})\s+(.+)$') {
            Flush-Paragraph; Flush-List
            $level = $matches[1].Length
            $text = $matches[2]
            $nodes.Add(@{ type = 'heading'; attrs = @{ level = $level }; content = @(@{ type = 'text'; text = $text }) }) | Out-Null
            continue
        }
        if ($line -match '^[-*]\s+(.+)$') {
            Flush-Paragraph
            if ($listKind -ne 'bullet') { Flush-List; $listKind = 'bullet' }
            $taskList.Add($matches[1]) | Out-Null
            continue
        }
        if ($line -match '^\d+\.\s+(.+)$') {
            Flush-Paragraph
            if ($listKind -ne 'ordered') { Flush-List; $listKind = 'ordered' }
            $taskList.Add($matches[1]) | Out-Null
            continue
        }
        if ($line -match '^- \[ \]\s+(.+)$' -or $line -match '^- \[x\]\s+(.+)$') {
            Flush-Paragraph; Flush-List
            $checked = $line -match '^- \[x\]'
            $itemText = $matches[1]
            $itemsCheck = New-Object System.Collections.Generic.List[object]
            $itemsCheck.Add(@{ type = 'taskList'; attrs = @{ localId = [guid]::NewGuid().ToString().Substring(0,8) }; content = @(@{ type = 'taskItem'; attrs = @{ checked = $checked }; content = @(@{ type = 'text'; text = $itemText }) }) }) | Out-Null
            $nodes.Add(@{ type = 'paragraph'; content = $itemsCheck }) | Out-Null
            continue
        }
        if ($line -match '^>\s*(.*)$') {
            Flush-Paragraph; Flush-List
            $quoteText = $matches[1]
            $nodes.Add(@{ type = 'blockquote'; content = @(@{ type = 'paragraph'; content = @(@{ type = 'text'; text = $quoteText }) }) }) | Out-Null
            continue
        }
        $paragraph.Add($line)
    }

    Flush-Paragraph; Flush-List; Flush-Code

    if ($nodes.Count -eq 0) {
        $nodes.Add(@{ type = 'paragraph'; content = @(@{ type = 'text'; text = ' ' }) }) | Out-Null
    }
    return @{ type = 'doc'; version = 1; content = $nodes }
}

$adf = ConvertTo-Adf -Md $Description

$body = @{
    fields = @{
        project   = @{ key = $ProjectKey }
        summary   = $Summary
        issuetype = @{ name = $IssueType }
        description = $adf
    }
} | ConvertTo-Json -Depth 20

try {
    $resp = Invoke-RestMethod -Uri "$JiraUrl/rest/api/3/issue" -Headers $headers -Method POST -Body $body -TimeoutSec 30
    $key = $resp.key
    $id = $resp.id
    $url = "$JiraUrl/browse/$key"
    Write-Host "OK: $key -> $url"
    # JSON output utilisable por scripts siguientes
    [PSCustomObject]@{ key = $key; id = $id; url = $url; module = $ModuleName } | ConvertTo-Json -Compress
    exit 0
} catch {
    $code = $null
    $errBody = ""
    if ($_.Exception.Response) {
        $code = [int]$_.Exception.Response.StatusCode
        try { $errBody = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd() } catch {}
    }
    Write-Error "Jira rejected ($code): $errBody"
    exit 1
}
