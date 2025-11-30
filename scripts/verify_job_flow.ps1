# Quick automated verification of job lifecycle
$base = 'http://localhost:3000'
function PostJson($uri, $body, $token=$null){
  try{
    $headers = @{}
    if($token){ $headers = @{ Authorization = "Bearer $token" } }
    $res = Invoke-RestMethod -Method Post -Uri ($base + $uri) -ContentType 'application/json' -Body (ConvertTo-Json $body) -Headers $headers
    Write-Host "--- RESPONSE $uri ---"
    $res | ConvertTo-Json -Depth 6 | Write-Host
    return $res
  } catch {
    Write-Host "--- ERROR $uri ---"
    if ($_.Exception.Response -ne $null) {
      try{
        $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $body = $sr.ReadToEnd()
        Write-Host "HTTP ERROR BODY:\n$body"
      } catch {
        Write-Host $_.Exception.Message
      }
    } else {
      Write-Host $_.Exception.Message
    }
    return $null
  }
}

function GetJson($uri, $token=$null){
  try{
    $headers = @{}
    if($token){ $headers = @{ Authorization = "Bearer $token" } }
    $res = Invoke-RestMethod -Method Get -Uri ($base + $uri) -Headers $headers
    Write-Host "--- RESPONSE $uri ---"
    $res | ConvertTo-Json -Depth 6 | Write-Host
    return $res
  } catch {
    Write-Host "--- ERROR $uri ---"
    Write-Host $_.Exception.Message
    return $null
  }
}

$ts = [int](Get-Date -UFormat %s)
$posterEmail = "poster-$ts@example.com"
$workerEmail = "worker-$ts@example.com"

# Create poster
$poster = PostJson '/api/auth/signup' @{ name = 'Poster Automated'; email = $posterEmail; password = 'Poster123!'; skills = 'posting' }
if(-not $poster){ Write-Host 'Poster signup failed, aborting.'; exit 1 }
$posterToken = $poster.data.accessToken
$posterId = $poster.data.worker._id

# Create worker
$worker = PostJson '/api/auth/signup' @{ name = 'Worker Automated'; email = $workerEmail; password = 'Worker123!'; skills = 'doing' }
if(-not $worker){ Write-Host 'Worker signup failed, aborting.'; exit 1 }
$workerToken = $worker.data.accessToken
$workerId = $worker.data.worker._id

# Poster creates a job
$job = PostJson '/api/jobs' @{ title = 'Automated Job'; description = 'Please accept and run lifecycle'; location = 'Testland'; offer = 25 } $posterToken
if(-not $job){ Write-Host 'Job creation failed, aborting.'; exit 1 }
$jobId = $job.data.job._id

# Worker accepts the job
$accept = PostJson ("/api/jobs/$jobId/accept") @{} $workerToken

# Worker starts the job
$start = PostJson ("/api/jobs/$jobId/start") @{} $workerToken

# Worker completes the job
$complete = PostJson ("/api/jobs/$jobId/complete") @{} $workerToken

# Poster attempts to cancel completed job (expected to fail)
$cancelFail = PostJson ("/api/jobs/$jobId/cancel") @{} $posterToken

# Poster creates another job and cancels before assignment
$job2 = PostJson '/api/jobs' @{ title = 'Automated Job 2'; description = 'Will cancel'; location = 'Here'; offer = 10 } $posterToken
if($job2){
  $job2Id = $job2.data.job._id
  $cancelOk = PostJson ("/api/jobs/$job2Id/cancel") @{} $posterToken
}

Write-Host '--- Done ---'
