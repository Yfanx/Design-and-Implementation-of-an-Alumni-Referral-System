[CmdletBinding()]
param(
    [string]$AppBaseUrl = "http://127.0.0.1:8081",
    [string]$AdminBaseUrl = "http://127.0.0.1:8080"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Write-Step([string]$Message) {
    Write-Host "[smoke] $Message" -ForegroundColor Cyan
}

function Invoke-Json([string]$Method, [string]$Url, [object]$Body = $null, [hashtable]$Headers = @{}) {
    $options = @{
        Method = $Method
        Uri = $Url
        Headers = $Headers
        TimeoutSec = 20
    }
    if ($null -ne $Body) {
        $options.ContentType = "application/json;charset=utf-8"
        $options.Body = ($Body | ConvertTo-Json -Depth 8)
    }
    return Invoke-RestMethod @options
}

function Assert-True([bool]$Condition, [string]$Message) {
    if (-not $Condition) {
        throw $Message
    }
}

function Assert-Ok($Result, [string]$Message) {
    Assert-True ($null -ne $Result) "$Message returned no response."
    Assert-True ($Result.code -eq 0) "$Message failed: code=$($Result.code), message=$($Result.message)"
}

function Get-AuthHeaders($Session) {
    return @{
        "X-Referral-Token" = [string]$Session.token
        "X-Referral-Role" = [string]$Session.role
        "X-Referral-User-Id" = [string]$Session.userId
        "X-Referral-Profile-Id" = [string]$Session.profileId
    }
}

Write-Step "Checking public pages and static assets..."
$loginHtml = Invoke-WebRequest -UseBasicParsing "$AppBaseUrl/login.html"
Assert-True ($loginHtml.StatusCode -eq 200) "login.html is not reachable."
Assert-True (-not $loginHtml.Content.Contains("student123")) "login.html still contains the demo password prefill."
Assert-True (-not $loginHtml.Content.Contains('value="student"')) "login.html still contains the demo username prefill."

$registerJs = Invoke-WebRequest -UseBasicParsing "$AppBaseUrl/register.js?v=smoke"
Assert-True ($registerJs.Content.Contains("/login.html")) "register.js does not redirect back to login after registration."
Assert-True ($registerJs.Content.Contains("flashToast")) "register.js does not set the login-page success toast."

$companyLogo = Invoke-WebRequest -UseBasicParsing "$AppBaseUrl/assets/company/tencent.png" -Method Head
Assert-True ($companyLogo.StatusCode -eq 200) "Company logo asset is not reachable from /assets/company."

$resume = Invoke-WebRequest -UseBasicParsing "$AppBaseUrl/uploads/demo/resume/wang_backend_resume.pdf" -Method Head
Assert-True ($resume.StatusCode -eq 200) "Demo resume PDF is not reachable from /uploads."

Write-Step "Checking login and registration validation..."
$studentLogin = Invoke-Json POST "$AppBaseUrl/auth/login" @{ username = "student"; password = "student123" }
Assert-Ok $studentLogin "student login"
$student = $studentLogin.data
$studentHeaders = Get-AuthHeaders $student

$alumniLogin = Invoke-Json POST "$AppBaseUrl/auth/login" @{ username = "alumni"; password = "alumni123" }
Assert-Ok $alumniLogin "alumni login"
$alumni = $alumniLogin.data
$alumniHeaders = Get-AuthHeaders $alumni

$adminLogin = Invoke-Json POST "$AdminBaseUrl/auth/login" @{ username = "admin"; password = "admin123" }
Assert-Ok $adminLogin "admin login"
$adminHeaders = Get-AuthHeaders $adminLogin.data

$duplicateStudentNo = Invoke-Json POST "$AppBaseUrl/auth/register" @{
    username = "smoke_dup_$([DateTimeOffset]::Now.ToUnixTimeMilliseconds())"
    password = "abc12345"
    confirmPassword = "abc12345"
    role = "STUDENT"
    realName = "Smoke Duplicate"
    studentNo = "2022001001"
    grade = "2026"
    education = "Bachelor"
}
Assert-True ($duplicateStudentNo.code -ne 0 -and -not [string]::IsNullOrWhiteSpace($duplicateStudentNo.message)) "duplicate student number did not return a precise message."

$stamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
$newRegister = Invoke-Json POST "$AppBaseUrl/auth/register" @{
    username = "smoke_student_$stamp"
    password = "abc12345"
    confirmPassword = "abc12345"
    role = "STUDENT"
    realName = "Smoke Student"
    studentNo = "$stamp"
    college = "Computer School"
    major = "Software Engineering"
    grade = "2026"
    education = "Bachelor"
}
Assert-Ok $newRegister "new student registration"
$newStudent = $newRegister.data
$newStudentHeaders = Get-AuthHeaders $newStudent

Write-Step "Checking student business APIs..."
$dashboard = Invoke-Json GET "$AppBaseUrl/referral/dashboard/overview" $null $studentHeaders
Assert-Ok $dashboard "dashboard overview"

$jobs = Invoke-Json GET "$AppBaseUrl/referral/job-info/match-list" $null $studentHeaders
Assert-Ok $jobs "job match list"
Assert-True ($jobs.data.list.Count -gt 0) "job match list is empty."
$job = $jobs.data.list[0]
Assert-True (-not [string]::IsNullOrWhiteSpace($job.companyLogoUrl)) "job companyLogoUrl is empty."
Assert-True ([string]$job.companyLogoUrl -like "/assets/company/*") "job companyLogoUrl is not served from /assets/company."

$favoriteToggle = Invoke-Json POST "$AppBaseUrl/referral/job-favorite/toggle" @{ jobId = $job.id; studentId = $student.profileId } $studentHeaders
Assert-Ok $favoriteToggle "favorite toggle"
$favorites = Invoke-Json GET "$AppBaseUrl/referral/job-favorite/list" $null $studentHeaders
Assert-Ok $favorites "favorite list"

$applications = Invoke-Json GET "$AppBaseUrl/referral/referral-application/list" $null $studentHeaders
Assert-Ok $applications "student application list"

$applicationCreate = Invoke-Json POST "$AppBaseUrl/referral/referral-application/create" @{
    jobId = $job.id
    studentId = $newStudent.profileId
    alumniId = $job.alumniId
    resumeUrl = "/uploads/demo/resume/wang_backend_resume.pdf"
    selfIntroduction = "Smoke test application"
} $newStudentHeaders
Assert-Ok $applicationCreate "application create"
$applicationId = $applicationCreate.data

$applicationCancel = Invoke-Json POST "$AppBaseUrl/referral/referral-application/cancel?id=$applicationId" $null $newStudentHeaders
Assert-Ok $applicationCancel "application cancel"

$messageSend = Invoke-Json POST "$AppBaseUrl/referral/consult-message/send" @{
    jobId = $job.id
    senderUserId = $student.userId
    receiverUserId = $alumni.userId
    senderRole = 1
    receiverRole = 2
    content = "Smoke test consult message"
} $studentHeaders
Assert-Ok $messageSend "consult message send"

$messages = Invoke-Json GET "$AppBaseUrl/referral/consult-message/list" $null $studentHeaders
Assert-Ok $messages "consult message list"

Write-Step "Checking alumni and admin APIs..."
$alumniJobs = Invoke-Json GET "$AppBaseUrl/referral/job-info/list" $null $alumniHeaders
Assert-Ok $alumniJobs "alumni job list"

$companyList = Invoke-Json GET "$AppBaseUrl/referral/company-info/list" $null $alumniHeaders
Assert-Ok $companyList "company list"
Assert-True ($companyList.data.list.Count -gt 0) "company list is empty."
Assert-True ([string]$companyList.data.list[0].logoUrl -like "/assets/company/*") "company logoUrl is not served from /assets/company."

$studentList = Invoke-Json GET "$AdminBaseUrl/referral/student-info/list" $null $adminHeaders
Assert-Ok $studentList "admin student list"

$alumniList = Invoke-Json GET "$AdminBaseUrl/referral/alumni-info/list" $null $adminHeaders
Assert-Ok $alumniList "admin alumni list"

$adminApplications = Invoke-Json GET "$AdminBaseUrl/referral/referral-application/list" $null $adminHeaders
Assert-Ok $adminApplications "admin application list"

Write-Host "Smoke test passed." -ForegroundColor Green
