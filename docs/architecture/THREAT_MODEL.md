# Threat Model

figuring out what could go wrong with security  
using STRIDE methodology

## What is STRIDE?

way to think about security threats:
- **S** = Spoofing - someone pretending to be someone else
- **T** = Tampering - messing with the data
- **R** = Repudiation - denying you did something
- **I** = Info Disclosure - data leaking out
- **D** = Denial of Service - breaking the app so it doesn't work
- **E** = Elevation of Privilege - getting access you shouldn't have

## Main Threats I'm Thinking About

### Spoofing (fake login)
**Problem:** someone steals a clinician's password  
**Fix:** using Cognito with MFA, short session tokens

### Tampering (data changes)
**Problem:** someone changes patient data  
**Fix:** KMS encryption, DynamoDB point-in-time recovery, CloudTrail logs everything

### Repudiation (denying actions)
**Problem:** someone denies they did something bad  
**Fix:** CloudTrail logs everything for 7 years, can't delete logs

### Info Disclosure (data leaks)
**Problem:** patient health data gets exposed  
**Fix:** everything encrypted with KMS, private VPC, IAM controls who can access what

### Denial of Service (breaking the app)
**Problem:** attacker floods the system  
**Fix:** WAF rate limiting, API Gateway throttling, CloudFront caching

### Elevation of Privilege (getting admin access)
**Problem:** someone gets access they shouldn't have  
**Fix:** IAM least privilege, separate roles for each Lambda function

## Diagrams

check out the PlantUML diagrams for visual threat model - they show all the AWS services and how threats flow through the system
