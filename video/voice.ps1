param([string]$Recipe, [string]$OutputDirectory)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$voice = New-Object System.Speech.Synthesis.SpeechSynthesizer
$lines = Get-Content -LiteralPath $Recipe -Raw -Encoding UTF8 | ConvertFrom-Json
try {
    $voice.Rate = 2
    $voice.Volume = 100
    for ($index = 0; $index -lt $lines.Count; $index++) {
        $voice.SetOutputToWaveFile((Join-Path $OutputDirectory "$index.wav"))
        $voice.Speak($lines[$index])
        $voice.SetOutputToNull()
    }
} finally {
    $voice.Dispose()
}
