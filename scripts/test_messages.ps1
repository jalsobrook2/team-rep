# Test messaging flow: signup two users, login, send message, fetch conversations and conversation
try {
  $alicePayload = @{ name = 'Alice Test'; email = 'alice-test@example.com'; password = 'Alice123!'; skills = 'testing' } | ConvertTo-Json
  $alice = Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/auth/signup' -ContentType 'application/json' -Body $alicePayload
  Write-Host "ALICE_SIGNUP:`n" (ConvertTo-Json $alice -Depth 5)
} catch { Write-Host "ALICE_SIGNUP_ERROR: $_" }

try {
  # Use a password >= 8 chars
  $bobPayload = @{ name = 'Bob Test'; email = 'bob-test@example.com'; password = 'Bob12345!'; skills = 'testing' } | ConvertTo-Json
  $bob = Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/auth/signup' -ContentType 'application/json' -Body $bobPayload
  Write-Host "BOB_SIGNUP:`n" (ConvertTo-Json $bob -Depth 5)
} catch { Write-Host "BOB_SIGNUP_ERROR: $_" }

try {
  $loginAlice = Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/auth/login' -ContentType 'application/json' -Body (@{ email='alice-test@example.com'; password='Alice123!' } | ConvertTo-Json)
  $tokenAlice = $loginAlice.data.accessToken
  $idAlice = $loginAlice.data.worker._id
  Write-Host "ALICE_LOGIN_TOKEN: $tokenAlice"
  Write-Host "ALICE_ID: $idAlice"
} catch { Write-Host "ALICE_LOGIN_ERROR: $_" }

try {
  # If signup returned tokens, capture them as a fallback
  if ($bob -and $bob.data -and $bob.data.accessToken) {
    $tokenBob = $bob.data.accessToken
    $idBob = $bob.data.worker._id
    Write-Host "BOB_SIGNUP_TOKEN_FALLBACK: $tokenBob"
    Write-Host "BOB_SIGNUP_ID_FALLBACK: $idBob"
  }

  # Attempt login to get a fresh token (ensure password matches signup above)
  $loginBob = Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/auth/login' -ContentType 'application/json' -Body (@{ email='bob-test@example.com'; password='Bob12345!' } | ConvertTo-Json)
  $tokenBob = $loginBob.data.accessToken
  $idBob = $loginBob.data.worker._id
  Write-Host "BOB_LOGIN_TOKEN: $tokenBob"
  Write-Host "BOB_ID: $idBob"
} catch { Write-Host "BOB_LOGIN_ERROR: $_" }

try {
  if (-not $tokenAlice) { Write-Host "SEND_ABORT: missing Alice token"; exit }
  if (-not $idBob) { Write-Host "SEND_ABORT: missing Bob id"; exit }

  $sendBody = @{ receiverId = $idBob; content = 'Hello Bob, this is Alice' } | ConvertTo-Json
  $send = Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/messages' -ContentType 'application/json' -Headers @{ Authorization = "Bearer $tokenAlice" } -Body $sendBody
  Write-Host "SEND_RESULT:`n" (ConvertTo-Json $send -Depth 5)
} catch { Write-Host "SEND_ERROR: $_" }

try {
  $convBob = Invoke-RestMethod -Method Get -Uri 'http://localhost:3000/api/messages/conversations' -Headers @{ Authorization = "Bearer $tokenBob" }
  Write-Host "BOB_CONVERSATIONS:`n" (ConvertTo-Json $convBob -Depth 5)
} catch { Write-Host "BOB_CONVERSATIONS_ERROR: $_" }

try {
  $conversation = Invoke-RestMethod -Method Get -Uri ('http://localhost:3000/api/messages/conversation/' + $idAlice) -Headers @{ Authorization = "Bearer $tokenBob" }
  Write-Host "BOB_CONVERSATION_WITH_ALICE:`n" (ConvertTo-Json $conversation -Depth 5)
} catch { Write-Host "BOB_CONVERSATION_ERROR: $_" }

try {
  $mark = Invoke-RestMethod -Method Post -Uri ('http://localhost:3000/api/messages/conversation/' + $idAlice + '/read') -Headers @{ Authorization = "Bearer $tokenBob" }
  Write-Host "MARK_READ_RESULT:`n" (ConvertTo-Json $mark -Depth 5)
} catch { Write-Host "MARK_READ_ERROR: $_" }
