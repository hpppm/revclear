#!/bin/bash
# Load Physical Therapy Sample Data into Database
# Run this after creating AWS RDS instance

set -e

echo "🏥 Loading Physical Therapy Sample Data..."
echo ""

# Get database credentials from AWS Secrets Manager
SECRET_NAME="revclear/test/database"
REGION="${AWS_REGION:-us-east-1}"

echo "📥 Retrieving database credentials from Secrets Manager..."
SECRET_JSON=$(aws secretsmanager get-secret-value \
    --secret-id "$SECRET_NAME" \
    --region "$REGION" \
    --query SecretString \
    --output text)

# Parse JSON credentials
DB_HOST=$(echo $SECRET_JSON | jq -r '.host')
DB_PORT=$(echo $SECRET_JSON | jq -r '.port')
DB_NAME=$(echo $SECRET_JSON | jq -r '.dbname')
DB_USER=$(echo $SECRET_JSON | jq -r '.username')
DB_PASSWORD=$(echo $SECRET_JSON | jq -r '.password')

echo "✅ Credentials retrieved"
echo "   Host: $DB_HOST"
echo "   Database: $DB_NAME"
echo ""

# Set password for psql
export PGPASSWORD="$DB_PASSWORD"

echo "🔄 Loading sample data..."
echo ""

# Execute the SQL file
psql -h "$DB_HOST" \
     -p "$DB_PORT" \
     -U "$DB_USER" \
     -d "$DB_NAME" \
     -f "$(dirname "$0")/Documentation/db/003_physical_therapy_sample_data.sql"

echo ""
echo "=========================================="
echo "✅ Sample Data Loaded Successfully!"
echo "=========================================="
echo ""
echo "📊 Data Summary:"
echo "   - 18 CPT codes for physical therapy"
echo "   - 5 patients (Edward, Mary, Jacob, Sarah, Michael)"
echo "   - Multiple appointments with treatment notes"
echo "   - Complete billing records"
echo ""
echo "🔍 Quick verification query:"
echo "psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c \"SELECT first_name, last_name, insurance_provider FROM patients WHERE status='Active';\""
echo ""

# Unset password
unset PGPASSWORD
