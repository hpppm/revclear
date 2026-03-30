# RevClear API Route Tests
# Run from: C:\Users\hppm1\Projects\Dev\revclear
# Usage: .\test-routes.ps1

$BASE = "http://localhost:3005"
$PASS = 0
$FAIL = 0
$WARN = 0

function Test-Route {
  param($Label, $Method, $Path, $Body, $ExpectedStatus, $Token = $null)

  $headers = @{ "Content-Type" = "application/json" }
  if ($Token) { $headers["Cookie"] = "token=$Token" }

  try {
    $params = @{
      Method      = $Method
      Uri         = "$BASE$Path"
      Headers     = $headers
      ErrorAction = "SilentlyContinue"
    }
    if ($Body) { $params["Body"] = $Body }

    $response = Invoke-WebRequest @params -ErrorAction SilentlyContinue
    $actual = $response.StatusCode
  } catch {
    $actual = $_.Exception.Response.StatusCode.value__
  }

  if ($actual -eq $ExpectedStatus) {
    Write-Host "  PASS  $Label ($actual)" -ForegroundColor Green
    $script:PASS++
  } elseif ($null -eq $actual) {
    Write-Host "  WARN  $Label (no response — is backend running?)" -ForegroundColor Yellow
    $script:WARN++
  } else {
    Write-Host "  FAIL  $Label (expected $ExpectedStatus, got $actual)" -ForegroundColor Red
    $script:FAIL++
  }
}

# ─────────────────────────────────────────────
# PUBLIC ROUTES — no auth needed
# ─────────────────────────────────────────────
Write-Host "`n── Public Routes ──" -ForegroundColor Cyan

Test-Route "Health check"                   GET  "/api/health"              $null  200
Test-Route "Signup — empty body"            POST "/api/auth/signup"         '{}'   400
Test-Route "Signup — invalid email"         POST "/api/auth/signup"         '{"email":"notanemail","password":"Pass1!","firstName":"A","lastName":"B"}' 400
Test-Route "Signup — weak password"         POST "/api/auth/signup"         '{"email":"a@localhost.dev","password":"123","firstName":"A","lastName":"B"}' 400
Test-Route "Signin — empty body"            POST "/api/auth/signin"         '{}'   400
Test-Route "Signin — invalid email format"  POST "/api/auth/signin"         '{"email":"notanemail","password":"pass"}' 400
Test-Route "Signin — wrong password"        POST "/api/auth/signin"         '{"email":"test@localhost.dev","password":"wrongpassword"}' 401
Test-Route "Forgot password — empty"        POST "/api/auth/forgot-password" '{"email":""}' 400
Test-Route "Forgot password — bad email"    POST "/api/auth/forgot-password" '{"email":"notanemail"}' 400
Test-Route "Forgot password — valid email"  POST "/api/auth/forgot-password" '{"email":"test@localhost.dev"}' 200
Test-Route "Confirm signup — empty"         POST "/api/auth/confirm-signup"  '{}' 400
Test-Route "Confirm forgot — empty"         POST "/api/auth/confirm-forgot-password" '{}' 400

# ─────────────────────────────────────────────
# PROTECTED ROUTES — should return 401 with no token
# ─────────────────────────────────────────────
Write-Host "`n── Protected Routes (expect 401 with no token) ──" -ForegroundColor Cyan

Test-Route "GET /api/auth/me"                      GET    "/api/auth/me"                    $null 401
Test-Route "GET /api/me"                           GET    "/api/me"                         $null 401
Test-Route "PATCH /api/me"                         PATCH  "/api/me"                         '{}' 401
Test-Route "GET /api/patients"                     GET    "/api/patients"                   $null 401
Test-Route "POST /api/patients"                    POST   "/api/patients"                   '{}' 401
Test-Route "GET /api/patients/123"                 GET    "/api/patients/123"               $null 401
Test-Route "PUT /api/patients/123"                 PUT    "/api/patients/123"               '{}' 401
Test-Route "DELETE /api/patients/123"              DELETE "/api/patients/123"               $null 401
Test-Route "GET /api/encounters"                   GET    "/api/encounters"                 $null 401
Test-Route "POST /api/encounters"                  POST   "/api/encounters"                 '{}' 401
Test-Route "GET /api/encounters/123"               GET    "/api/encounters/123"             $null 401
Test-Route "PUT /api/encounters/123"               PUT    "/api/encounters/123"             '{}' 401
Test-Route "DELETE /api/encounters/123"            DELETE "/api/encounters/123"             $null 401
Test-Route "GET /api/claims"                       GET    "/api/claims"                     $null 401
Test-Route "POST /api/claims"                      POST   "/api/claims"                     '{}' 401
Test-Route "GET /api/claims/123"                   GET    "/api/claims/123"                 $null 401
Test-Route "PUT /api/claims/123"                   PUT    "/api/claims/123"                 '{}' 401
Test-Route "DELETE /api/claims/123"                DELETE "/api/claims/123"                 $null 401
Test-Route "GET /api/organizations/me"             GET    "/api/organizations/me"           $null 401
Test-Route "POST /api/organizations"               POST   "/api/organizations"              '{}' 401
Test-Route "POST /api/organizations/join"          POST   "/api/organizations/join"         '{}' 401
Test-Route "POST /api/organizations/invite"        POST   "/api/organizations/invite"       '{}' 401
Test-Route "PATCH /api/organizations/me"           PATCH  "/api/organizations/me"           '{}' 401
Test-Route "GET /api/health/ai"                    GET    "/api/health/ai"                  $null 401
Test-Route "GET /api/soap/123/soap"                GET    "/api/encounters/123/soap"        $null 401
Test-Route "POST /api/transcribe"                  POST   "/api/transcribe"                 $null 401
Test-Route "GET /api/security/stats"               GET    "/api/security/stats"             $null 401
Test-Route "GET /api/users"                        GET    "/api/users"                      $null 401

# ─────────────────────────────────────────────
# DEV ROUTES — should be blocked (401 or 404)
# ─────────────────────────────────────────────
Write-Host "`n── Dev Routes (expect 401 or 404 — never 200) ──" -ForegroundColor Cyan

Test-Route "GET /api/dev/config"             GET  "/api/dev/config"           $null 401
Test-Route "GET /api/dev/db/health"          GET  "/api/dev/db/health"        $null 404
Test-Route "GET /api/dev/db/patients"        GET  "/api/dev/db/patients"      $null 401
Test-Route "POST /api/dev/db/patients"       POST "/api/dev/db/patients"      '{}' 401
Test-Route "GET /api/dev/s3/list"            GET  "/api/dev/s3/list"          $null 401
Test-Route "GET /api/dev/cognito/check"      GET  "/api/dev/cognito/check"    $null 401
Test-Route "GET /api/dev/status"             GET  "/api/dev/status"           $null 401

# ─────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────
Write-Host "`n── Results ──" -ForegroundColor Cyan
Write-Host "  PASS: $PASS" -ForegroundColor Green
Write-Host "  FAIL: $FAIL" -ForegroundColor Red
Write-Host "  WARN: $WARN" -ForegroundColor Yellow
Write-Host ""

if ($FAIL -gt 0) {
  Write-Host "  $FAIL test(s) failed — review before merging PR" -ForegroundColor Red
} else {
  Write-Host "  All tests passed" -ForegroundColor Green
}