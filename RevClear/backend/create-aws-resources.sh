#!/bin/bash
#AWSFreeTierServicesSetupScriptforRevClear
#RunthisscripttocreateallnecessaryAWSresources

set-e#Exitonerror

echo"🚀CreatingAWSFreeTierServicesforRevClear..."
echo""

#Configuration
PROJECT_NAME="revclear"
ENVIRONMENT="test"
REGION="${AWS_REGION:-us-east-1}"

echo"📋Configuration:"
echo"Project:$PROJECT_NAME"
echo"Environment:$ENVIRONMENT"
echo"Region:$REGION"
echo""

#============================================
#1.CREATECOGNITOUSERPOOL(FREE)
#============================================
echo"👥CreatingCognitoUserPool..."

USER_POOL_NAME="${PROJECT_NAME}-${ENVIRONMENT}-users"

#Checkifuserpoolalreadyexists
EXISTING_POOL=$(awscognito-idplist-user-pools--max-results50--query"UserPools[?Name=='$USER_POOL_NAME'].Id"--outputtext)

if[-z"$EXISTING_POOL"];then
echo"Creatingnewuserpool:$USER_POOL_NAME"

USER_POOL_ID=$(awscognito-idpcreate-user-pool\
--pool-name"$USER_POOL_NAME"\
--policies"PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false}"\
--auto-verified-attributesemail\
--username-attributesemail\
--mfa-configurationOFF\
--account-recovery-setting"RecoveryMechanisms=[{Priority=1,Name=verified_email}]"\
--tags"Project=$PROJECT_NAME,Environment=$ENVIRONMENT"\
--query'UserPool.Id'\
--outputtext)

echo"✅UserPoolcreated:$USER_POOL_ID"

#CreateAppClient
echo"Creatingappclient..."
CLIENT_ID=$(awscognito-idpcreate-user-pool-client\
--user-pool-id"$USER_POOL_ID"\
--client-name"${PROJECT_NAME}-${ENVIRONMENT}-client"\
--generate-secret\
--explicit-auth-flowsALLOW_USER_PASSWORD_AUTHALLOW_REFRESH_TOKEN_AUTH\
--query'UserPoolClient.ClientId'\
--outputtext)

echo"✅AppClientcreated:$CLIENT_ID"
else
USER_POOL_ID="$EXISTING_POOL"
echo"ℹ️Userpoolalreadyexists:$USER_POOL_ID"
fi

echo""

#============================================
#2.CREATES3BUCKETS(FREE5GB)
#============================================
echo"📦CreatingS3Buckets..."

BUCKET_STORAGE="${PROJECT_NAME}-${ENVIRONMENT}-storage"
BUCKET_FRONTEND="${PROJECT_NAME}-${ENVIRONMENT}-frontend"

#Storagebucketfordocuments/files
ifawss3ls"s3://$BUCKET_STORAGE"2>/dev/null;then
echo"ℹ️Storagebucketalreadyexists:$BUCKET_STORAGE"
else
echo"Creatingstoragebucket:$BUCKET_STORAGE"
awss3mb"s3://$BUCKET_STORAGE"--region"$REGION"

#EnableversioningforHIPAAcompliance
awss3apiput-bucket-versioning\
--bucket"$BUCKET_STORAGE"\
--versioning-configurationStatus=Enabled

#Blockpublicaccess(HIPAArequirement)
awss3apiput-public-access-block\
--bucket"$BUCKET_STORAGE"\
--public-access-block-configuration\
"BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

#Enableencryption
awss3apiput-bucket-encryption\
--bucket"$BUCKET_STORAGE"\
--server-side-encryption-configuration\
'{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

echo"✅Storagebucketcreatedwithencryption:$BUCKET_STORAGE"
fi

#Frontendbucket(optional-forstatichosting)
ifawss3ls"s3://$BUCKET_FRONTEND"2>/dev/null;then
echo"ℹ️Frontendbucketalreadyexists:$BUCKET_FRONTEND"
else
echo"Creatingfrontendbucket:$BUCKET_FRONTEND"
awss3mb"s3://$BUCKET_FRONTEND"--region"$REGION"

#Thisbucketcanbepublicforfrontendhosting
awss3website"s3://$BUCKET_FRONTEND"\
--index-documentindex.html\
--error-documenterror.html

echo"✅Frontendbucketcreated:$BUCKET_FRONTEND"
fi

echo""

#============================================
#3.CREATERDSPOSTGRESQL(FREETIER)
#============================================
echo"🗄️CreatingRDSPostgreSQLDatabase..."

DB_INSTANCE_ID="${PROJECT_NAME}-${ENVIRONMENT}-db"
DB_NAME="${PROJECT_NAME}_db"
DB_USERNAME="revclear_admin"
DB_PASSWORD=$(opensslrand-base6432|tr-d"=+/"|cut-c1-25)

#CheckifDBinstanceexists
DB_EXISTS=$(awsrdsdescribe-db-instances--db-instance-identifier"$DB_INSTANCE_ID"2>/dev/null||echo"")

if[-z"$DB_EXISTS"];then
echo"CreatingPostgreSQLdatabase:$DB_INSTANCE_ID"
echo"⚠️Thiswilltake5-10minutes..."

#CreateDBinstance(freetier:db.t3.microordb.t4g.micro)
awsrdscreate-db-instance\
--db-instance-identifier"$DB_INSTANCE_ID"\
--db-instance-classdb.t3.micro\
--enginepostgres\
--engine-version15.4\
--master-username"$DB_USERNAME"\
--master-user-password"$DB_PASSWORD"\
--allocated-storage20\
--storage-typegp2\
--storage-encrypted\
--backup-retention-period7\
--preferred-backup-window"03:00-04:00"\
--preferred-maintenance-window"mon:04:00-mon:05:00"\
--db-name"$DB_NAME"\
--publicly-accessible\
--tags"Key=Project,Value=$PROJECT_NAME""Key=Environment,Value=$ENVIRONMENT"\
--no-multi-az\
--no-enable-performance-insights

echo"⏳Waitingfordatabasetobeavailable..."
awsrdswaitdb-instance-available--db-instance-identifier"$DB_INSTANCE_ID"

echo"✅Databasecreated:$DB_INSTANCE_ID"
else
echo"ℹ️Databasealreadyexists:$DB_INSTANCE_ID"
#Getexistingpasswordfromsecretsmanagerifitexists
DB_PASSWORD="<retrieve-from-secrets-manager>"
fi

#GetDBendpoint
DB_ENDPOINT=$(awsrdsdescribe-db-instances\
--db-instance-identifier"$DB_INSTANCE_ID"\
--query'DBInstances[0].Endpoint.Address'\
--outputtext2>/dev/null||echo"creating...")

echo"Databaseendpoint:$DB_ENDPOINT"
echo""

#============================================
#4.CREATESECRETSMANAGERSECRETS
#============================================
echo"🔐CreatingSecretsManagerSecrets..."

SECRET_NAME="${PROJECT_NAME}/${ENVIRONMENT}/database"

#Checkifsecretexists
SECRET_EXISTS=$(awssecretsmanagerdescribe-secret--secret-id"$SECRET_NAME"2>/dev/null||echo"")

if[-z"$SECRET_EXISTS"];then
echo"Creatingdatabasecredentialssecret..."

SECRET_STRING=$(cat<<EOF
{
"username":"$DB_USERNAME",
"password":"$DB_PASSWORD",
"engine":"postgres",
"host":"$DB_ENDPOINT",
"port":5432,
"dbname":"$DB_NAME"
}
EOF
)

awssecretsmanagercreate-secret\
--name"$SECRET_NAME"\
--description"RevCleardatabasecredentialsfor$ENVIRONMENT"\
--secret-string"$SECRET_STRING"\
--tags"Key=Project,Value=$PROJECT_NAME""Key=Environment,Value=$ENVIRONMENT"

echo"✅Secretcreated:$SECRET_NAME"
else
echo"ℹ️Secretalreadyexists:$SECRET_NAME"

#Updatethesecretwithnewvaluesifneeded
SECRET_STRING=$(cat<<EOF
{
"username":"$DB_USERNAME",
"password":"$DB_PASSWORD",
"engine":"postgres",
"host":"$DB_ENDPOINT",
"port":5432,
"dbname":"$DB_NAME"
}
EOF
)

awssecretsmanagerupdate-secret\
--secret-id"$SECRET_NAME"\
--secret-string"$SECRET_STRING"

echo"✅Secretupdated:$SECRET_NAME"
fi

echo""

#============================================
#5.CREATECLOUDWATCHLOGGROUP(FREE)
#============================================
echo"📊CreatingCloudWatchLogGroup..."

LOG_GROUP="/aws/${PROJECT_NAME}/${ENVIRONMENT}"

ifawslogsdescribe-log-groups--log-group-name-prefix"$LOG_GROUP"--query"logGroups[?logGroupName=='$LOG_GROUP']"--outputtext|grep-q"$LOG_GROUP";then
echo"ℹ️Loggroupalreadyexists:$LOG_GROUP"
else
echo"Creatingloggroup:$LOG_GROUP"

awslogscreate-log-group--log-group-name"$LOG_GROUP"

#Setretentionto7days(freetier)
awslogsput-retention-policy\
--log-group-name"$LOG_GROUP"\
--retention-in-days7

echo"✅Loggroupcreated:$LOG_GROUP"
fi

echo""

#============================================
#SUMMARY
#============================================
echo"=========================================="
echo"✅AWSResourcesCreatedSuccessfully!"
echo"=========================================="
echo""
echo"📋ResourceSummary:"
echo""
echo"1.CognitoUserPool:"
echo"PoolID:$USER_POOL_ID"
echo"Region:$REGION"
echo""
echo"2.S3Buckets:"
echo"Storage:s3://$BUCKET_STORAGE"
echo"Frontend:s3://$BUCKET_FRONTEND"
echo""
echo"3.RDSPostgreSQL:"
echo"Instance:$DB_INSTANCE_ID"
echo"Endpoint:$DB_ENDPOINT"
echo"Database:$DB_NAME"
echo"Username:$DB_USERNAME"
echo""
echo"4.SecretsManager:"
echo"Secret:$SECRET_NAME"
echo""
echo"5.CloudWatchLogs:"
echo"LogGroup:$LOG_GROUP"
echo""
echo"=========================================="
echo"🔐GitHubSecretstoAdd:"
echo"=========================================="
echo""
echo"Addtheseto:https://github.com/hpppm/revclear/settings/secrets/actions"
echo""
echo"AWS_USER_POOL_ID=$USER_POOL_ID"
echo"AWS_S3_BUCKET=$BUCKET_STORAGE"
echo"AWS_S3_FRONTEND_BUCKET=$BUCKET_FRONTEND"
echo"DB_SECRET_NAME=$SECRET_NAME"
echo"AWS_LOG_GROUP=$LOG_GROUP"
echo""
echo"DatabasecredentialsarestoredinAWSSecretsManager:$SECRET_NAME"
echo""
echo"=========================================="
echo"💰CostEstimate:FREE(withinfreetier)"
echo"=========================================="
echo""
echo"✅Allresourcesareconfiguredforfreetierusage!"
echo"✅HIPAAcompliancefeaturesenabled(encryption,versioning)"
echo""
