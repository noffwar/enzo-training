$path = "c:\Users\castr\Desktop\App_ Nutricion Supabase\index.html"
$c = [System.IO.File]::ReadAllLines($path)

function Remove-Block($lines, $pattern) {
    $start = -1
    $end = -1
    for ($i = 0; $i -lt $lines.Length; $i++) {
        # Buscamos la DEFINICION (no el llamado a createView)
        if ($lines[$i] -match "const " + $pattern + " = \({") {
            $start = $i
        }
        if ($start -ge 0 -and $lines[$i] -match "^    };$") {
            $end = $i
            if ($end -gt ($start + 10)) {
                return @($start, $end)
            }
        }
    }
    return $null
}

$views = @("ProductivityView", "RecipesView", "StudyView", "BooksView")

foreach ($v in $views) {
    $range = Remove-Block $c $v
    if ($range) {
        $s = $range[0]
        $e = $range[1]
        Write-Host "Removing $v from $s to $e"
        $newC = New-Object System.Collections.Generic.List[string]
        for ($i = 0; $i -lt $s; $i++) { $newC.Add($c[$i]) }
        $newC.Add("    // $v movida a modulo externo")
        for ($i = $e + 1; $i -lt $c.Length; $i++) { $newC.Add($c[$i]) }
        $c = $newC.ToArray()
    } else {
        Write-Host "No se encontro $v obsoleta"
    }
}

[System.IO.File]::WriteAllLines($path, $c)
Write-Host "Cleanup complete."
