$output = npm test 2>&1 | Out-String
$output -split "`n" | Select-String -Pattern "Test Files|Tests " | Select-Object -Last 5
