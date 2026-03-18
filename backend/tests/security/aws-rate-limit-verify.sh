#!/bin/bash
# AWS Rate Limiting & Token Expiry Verification Script
# Run this after applying WAF and Cognito changes.
#
# Usage: bash tests/security/aws-rate-limit-verify.sh

PASS=0; FAIL=0
WAF_ID="8bfa8b4f-a5c0-4762-8e86-01e75099d8e7"
WAF_NAME="revclear-waf"
POOL_ID="us-east-1_NZCFuSv1l"
CLIENT_ID="5g5qvrvd04h9suejmlie2rjncd"
REGION="us-east-1"

pass() { echo "  ✓ PASS  $1"; ((PASS++)); }
fail() { echo "  ✗ FAIL  $1"; ((FAIL++)); }
section() { echo ""; echo "── $1 ─────────────────────────────────────"; }

echo ""
echo "============================================"
echo "  RevClear — Rate Limit & Token Expiry"
echo "  Verification Script"
echo "  $(date)"
echo "============================================"

# ── WAF Rules ────────────────────────────────────
section "WAF Rate Limiting"

rules=$(aws wafv2 get-web-acl \
  --name "$WAF_NAME" --scope REGIONAL --id "$WAF_ID" \
  --region "$REGION" \
  --query "WebACL.Rules[*].Name" --output text 2>/dev/null)

echo "  Rules found: $rules"

[[ "$rules" == *"AWSManagedRulesCommonRuleSet"* ]] \
  && pass "CommonRuleSet present" \
  || fail "CommonRuleSet missing"

[[ "$rules" == *"AWSManagedRulesSQLiRuleSet"* ]] \
  && pass "SQLiRuleSet present" \
  || fail "SQLiRuleSet missing"

[[ "$rules" == *"IPRateLimit"* ]] \
  && pass "IPRateLimit rule present" \
  || fail "IPRateLimit rule MISSING — add RateBasedStatement to WAF"

# Check the rate limit value is 2000
rate_limit=$(aws wafv2 get-web-acl \
  --name "$WAF_NAME" --scope REGIONAL --id "$WAF_ID" \
  --region "$REGION" \
  --query "WebACL.Rules[?Name=='IPRateLimit'].Statement.RateBasedStatement.Limit" \
  --output text 2>/dev/null)

[[ "$rate_limit" == "2000" ]] \
  && pass "IPRateLimit threshold: 2000 req/5min" \
  || fail "IPRateLimit threshold wrong or missing (got: $rate_limit)"

# Check IPRateLimit action is Block
rate_action=$(aws wafv2 get-web-acl \
  --name "$WAF_NAME" --scope REGIONAL --id "$WAF_ID" \
  --region "$REGION" \
  --query "WebACL.Rules[?Name=='IPRateLimit'].Action" \
  --output text 2>/dev/null)

[[ "$rate_action" == *"Block"* ]] \
  && pass "IPRateLimit action is Block" \
  || fail "IPRateLimit action is not Block (got: $rate_action)"

# ── Cognito Token Expiry ──────────────────────────
section "Cognito Token Expiry"

access=$(aws cognito-idp describe-user-pool-client \
  --user-pool-id "$POOL_ID" --client-id "$CLIENT_ID" \
  --query "UserPoolClient.AccessTokenValidity" --output text 2>/dev/null)

[[ "$access" == "1" ]] \
  && pass "Access token validity: 1 hour" \
  || fail "Access token validity wrong (got: $access)"

id_token=$(aws cognito-idp describe-user-pool-client \
  --user-pool-id "$POOL_ID" --client-id "$CLIENT_ID" \
  --query "UserPoolClient.IdTokenValidity" --output text 2>/dev/null)

[[ "$id_token" == "1" ]] \
  && pass "ID token validity: 1 hour" \
  || fail "ID token validity wrong (got: $id_token)"

refresh=$(aws cognito-idp describe-user-pool-client \
  --user-pool-id "$POOL_ID" --client-id "$CLIENT_ID" \
  --query "UserPoolClient.RefreshTokenValidity" --output text 2>/dev/null)

[[ "$refresh" == "7" ]] \
  && pass "Refresh token validity: 7 days" \
  || fail "Refresh token validity wrong (got: $refresh) — expected 7"

units=$(aws cognito-idp describe-user-pool-client \
  --user-pool-id "$POOL_ID" --client-id "$CLIENT_ID" \
  --query "UserPoolClient.TokenValidityUnits" --output json 2>/dev/null)

[[ "$units" == *'"hours"'* ]] \
  && pass "Token units: hours for access/id" \
  || fail "Token units misconfigured"

[[ "$units" == *'"days"'* ]] \
  && pass "Token units: days for refresh" \
  || fail "Refresh token unit not set to days"

# ── WAF Association ───────────────────────────────
section "WAF Association"

assoc=$(aws wafv2 list-resources-for-web-acl \
  --web-acl-arn "arn:aws:wafv2:${REGION}:414669980881:regional/webacl/${WAF_NAME}/${WAF_ID}" \
  --region "$REGION" \
  --query "ResourceArns" --output text 2>/dev/null)

[[ -n "$assoc" && "$assoc" != "None" ]] \
  && pass "WAF associated with resource: $assoc" \
  || fail "WAF not associated with any resource (API Gateway or ALB) — rules won't apply"

# ── Summary ──────────────────────────────────────
echo ""
echo "============================================"
echo "  RESULTS"
echo "============================================"
echo "  ✓ Passed  : $PASS"
echo "  ✗ Failed  : $FAIL"
echo "  Total     : $((PASS + FAIL))"
echo ""
[[ $FAIL -eq 0 ]] \
  && echo "  All checks passed!" \
  || echo "  Fix the $FAIL failed item(s) above"
echo "============================================"
