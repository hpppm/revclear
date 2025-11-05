#!/bin/bash
# AWS Services Control Script
# Easily start/stop AWS services to save money

set -e

PROJECT_NAME="revclear"
ENVIRONMENT="test"
DB_INSTANCE_ID="${PROJECT_NAME}-${ENVIRONMENT}-db"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

show_menu() {
    echo ""
    echo "=========================================="
    echo "🎛️  AWS Services Control Panel"
    echo "=========================================="
    echo ""
    echo "1) 🛑 STOP all services (save money)"
    echo "2) ▶️  START all services"
    echo "3) 📊 CHECK status"
    echo "4) 💰 CHECK estimated costs"
    echo "5) ❌ DELETE all services (permanent)"
    echo "6) 🚪 Exit"
    echo ""
}

stop_services() {
    echo ""
    echo "${YELLOW}🛑 Stopping AWS services...${NC}"
    echo ""
    
    # Stop RDS
    echo "Stopping RDS database: $DB_INSTANCE_ID"
    if aws rds describe-db-instances --db-instance-identifier "$DB_INSTANCE_ID" &>/dev/null; then
        STATUS=$(aws rds describe-db-instances --db-instance-identifier "$DB_INSTANCE_ID" --query 'DBInstances[0].DBInstanceStatus' --output text)
        
        if [ "$STATUS" == "available" ]; then
            aws rds stop-db-instance --db-instance-identifier "$DB_INSTANCE_ID"
            echo "${GREEN}✅ RDS stopped (will auto-start in 7 days)${NC}"
        elif [ "$STATUS" == "stopped" ]; then
            echo "${YELLOW}ℹ️  RDS already stopped${NC}"
        else
            echo "${YELLOW}ℹ️  RDS is in '$STATUS' state, cannot stop${NC}"
        fi
    else
        echo "${YELLOW}ℹ️  RDS instance not found${NC}"
    fi
    
    echo ""
    echo "${GREEN}✅ Services stopped!${NC}"
    echo ""
    echo "${YELLOW}💡 Cost savings:${NC}"
    echo "   - RDS: ~$12/month saved while stopped"
    echo "   - S3: Still charged for storage (~$0.01/month)"
    echo "   - Cognito: Still free"
    echo ""
}

start_services() {
    echo ""
    echo "${GREEN}▶️  Starting AWS services...${NC}"
    echo ""
    
    # Start RDS
    echo "Starting RDS database: $DB_INSTANCE_ID"
    if aws rds describe-db-instances --db-instance-identifier "$DB_INSTANCE_ID" &>/dev/null; then
        STATUS=$(aws rds describe-db-instances --db-instance-identifier "$DB_INSTANCE_ID" --query 'DBInstances[0].DBInstanceStatus' --output text)
        
        if [ "$STATUS" == "stopped" ]; then
            aws rds start-db-instance --db-instance-identifier "$DB_INSTANCE_ID"
            echo "${YELLOW}⏳ Starting RDS (takes 2-3 minutes)...${NC}"
            aws rds wait db-instance-available --db-instance-identifier "$DB_INSTANCE_ID"
            echo "${GREEN}✅ RDS started and available!${NC}"
        elif [ "$STATUS" == "available" ]; then
            echo "${YELLOW}ℹ️  RDS already running${NC}"
        else
            echo "${YELLOW}ℹ️  RDS is in '$STATUS' state${NC}"
        fi
    else
        echo "${RED}❌ RDS instance not found${NC}"
    fi
    
    echo ""
    echo "${GREEN}✅ Services started!${NC}"
    echo ""
}

check_status() {
    echo ""
    echo "=========================================="
    echo "📊 Current AWS Services Status"
    echo "=========================================="
    echo ""
    
    # RDS Status
    echo "🗄️  RDS Database:"
    if aws rds describe-db-instances --db-instance-identifier "$DB_INSTANCE_ID" &>/dev/null; then
        STATUS=$(aws rds describe-db-instances --db-instance-identifier "$DB_INSTANCE_ID" --query 'DBInstances[0].DBInstanceStatus' --output text)
        ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier "$DB_INSTANCE_ID" --query 'DBInstances[0].Endpoint.Address' --output text 2>/dev/null || echo "N/A")
        
        if [ "$STATUS" == "available" ]; then
            echo "   Status: ${GREEN}🟢 RUNNING${NC}"
        elif [ "$STATUS" == "stopped" ]; then
            echo "   Status: ${RED}🔴 STOPPED${NC}"
        else
            echo "   Status: ${YELLOW}🟡 $STATUS${NC}"
        fi
        echo "   Endpoint: $ENDPOINT"
    else
        echo "   Status: ${RED}❌ NOT FOUND${NC}"
    fi
    echo ""
    
    # S3 Buckets
    echo "📦 S3 Buckets:"
    BUCKET_STORAGE="${PROJECT_NAME}-${ENVIRONMENT}-storage"
    BUCKET_FRONTEND="${PROJECT_NAME}-${ENVIRONMENT}-frontend"
    
    if aws s3 ls "s3://$BUCKET_STORAGE" &>/dev/null; then
        SIZE=$(aws s3 ls s3://$BUCKET_STORAGE --recursive --summarize 2>/dev/null | grep "Total Size" | awk '{print $3}')
        echo "   Storage: ${GREEN}✅ EXISTS${NC} ($(numfmt --to=iec ${SIZE:-0} 2>/dev/null || echo "0B"))"
    else
        echo "   Storage: ${RED}❌ NOT FOUND${NC}"
    fi
    
    if aws s3 ls "s3://$BUCKET_FRONTEND" &>/dev/null; then
        echo "   Frontend: ${GREEN}✅ EXISTS${NC}"
    else
        echo "   Frontend: ${RED}❌ NOT FOUND${NC}"
    fi
    echo ""
    
    # Cognito
    echo "👥 Cognito User Pool:"
    POOL_ID=$(aws cognito-idp list-user-pools --max-results 50 --query "UserPools[?Name=='${PROJECT_NAME}-${ENVIRONMENT}-users'].Id" --output text 2>/dev/null || echo "")
    if [ -n "$POOL_ID" ]; then
        USER_COUNT=$(aws cognito-idp list-users --user-pool-id "$POOL_ID" --query 'length(Users)' --output text 2>/dev/null || echo "0")
        echo "   Status: ${GREEN}✅ EXISTS${NC}"
        echo "   Pool ID: $POOL_ID"
        echo "   Users: $USER_COUNT"
    else
        echo "   Status: ${RED}❌ NOT FOUND${NC}"
    fi
    echo ""
    
    # Secrets Manager
    echo "🔐 Secrets Manager:"
    SECRET_NAME="${PROJECT_NAME}/${ENVIRONMENT}/database"
    if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" &>/dev/null; then
        echo "   Status: ${GREEN}✅ EXISTS${NC}"
        echo "   Name: $SECRET_NAME"
    else
        echo "   Status: ${RED}❌ NOT FOUND${NC}"
    fi
    echo ""
}

check_costs() {
    echo ""
    echo "=========================================="
    echo "💰 Estimated Monthly Costs"
    echo "=========================================="
    echo ""
    
    # Check RDS status
    if aws rds describe-db-instances --db-instance-identifier "$DB_INSTANCE_ID" &>/dev/null; then
        STATUS=$(aws rds describe-db-instances --db-instance-identifier "$DB_INSTANCE_ID" --query 'DBInstances[0].DBInstanceStatus' --output text)
        
        if [ "$STATUS" == "available" ]; then
            echo "🗄️  RDS (db.t3.micro):"
            echo "   Free Tier: 750 hours/month"
            echo "   Current: ${GREEN}RUNNING${NC}"
            echo "   Cost if over free tier: ~$12.41/month"
            echo ""
        else
            echo "🗄️  RDS (db.t3.micro):"
            echo "   Status: ${RED}STOPPED${NC}"
            echo "   Cost: $0/month (while stopped)"
            echo ""
        fi
    fi
    
    echo "📦 S3 Storage:"
    echo "   Free Tier: 5GB"
    echo "   Cost if over: $0.023/GB/month"
    echo ""
    
    echo "👥 Cognito:"
    echo "   Free Tier: 50,000 MAUs"
    echo "   Current Cost: $0/month"
    echo ""
    
    echo "🔐 Secrets Manager:"
    echo "   Cost: $0.40/secret/month"
    echo "   Current: ~$0.40/month"
    echo ""
    
    echo "📊 CloudWatch Logs:"
    echo "   Free Tier: 5GB"
    echo "   Cost if over: $0.50/GB/month"
    echo ""
    
    echo "=========================================="
    echo "${GREEN}Estimated Total: $0.40 - $13/month${NC}"
    echo "${YELLOW}(Depends on RDS running time)${NC}"
    echo "=========================================="
    echo ""
}

delete_services() {
    echo ""
    echo "${RED}⚠️  WARNING: This will DELETE all AWS resources!${NC}"
    echo "${RED}This action CANNOT be undone!${NC}"
    echo ""
    read -p "Type 'DELETE' to confirm: " CONFIRM
    
    if [ "$CONFIRM" != "DELETE" ]; then
        echo "${YELLOW}Cancelled.${NC}"
        return
    fi
    
    echo ""
    echo "${RED}🗑️  Deleting AWS services...${NC}"
    echo ""
    
    # Delete RDS
    echo "Deleting RDS: $DB_INSTANCE_ID"
    if aws rds describe-db-instances --db-instance-identifier "$DB_INSTANCE_ID" &>/dev/null; then
        aws rds delete-db-instance --db-instance-identifier "$DB_INSTANCE_ID" --skip-final-snapshot
        echo "${GREEN}✅ RDS deletion initiated${NC}"
    fi
    
    # Delete S3 buckets
    echo "Deleting S3 buckets..."
    aws s3 rb "s3://${PROJECT_NAME}-${ENVIRONMENT}-storage" --force 2>/dev/null && echo "${GREEN}✅ Storage bucket deleted${NC}" || echo "${YELLOW}ℹ️  Storage bucket not found${NC}"
    aws s3 rb "s3://${PROJECT_NAME}-${ENVIRONMENT}-frontend" --force 2>/dev/null && echo "${GREEN}✅ Frontend bucket deleted${NC}" || echo "${YELLOW}ℹ️  Frontend bucket not found${NC}"
    
    # Delete Cognito
    echo "Deleting Cognito User Pool..."
    POOL_ID=$(aws cognito-idp list-user-pools --max-results 50 --query "UserPools[?Name=='${PROJECT_NAME}-${ENVIRONMENT}-users'].Id" --output text 2>/dev/null || echo "")
    if [ -n "$POOL_ID" ]; then
        aws cognito-idp delete-user-pool --user-pool-id "$POOL_ID"
        echo "${GREEN}✅ Cognito User Pool deleted${NC}"
    fi
    
    # Delete Secrets
    echo "Deleting Secrets Manager secrets..."
    aws secretsmanager delete-secret --secret-id "${PROJECT_NAME}/${ENVIRONMENT}/database" --force-delete-without-recovery 2>/dev/null && echo "${GREEN}✅ Secrets deleted${NC}" || echo "${YELLOW}ℹ️  Secrets not found${NC}"
    
    # Delete CloudWatch Log Group
    echo "Deleting CloudWatch Log Group..."
    aws logs delete-log-group --log-group-name "/aws/${PROJECT_NAME}/${ENVIRONMENT}" 2>/dev/null && echo "${GREEN}✅ Log group deleted${NC}" || echo "${YELLOW}ℹ️  Log group not found${NC}"
    
    echo ""
    echo "${GREEN}✅ All services deleted!${NC}"
    echo ""
}

# Main loop
while true; do
    show_menu
    read -p "Select option (1-6): " CHOICE
    
    case $CHOICE in
        1) stop_services ;;
        2) start_services ;;
        3) check_status ;;
        4) check_costs ;;
        5) delete_services ;;
        6) echo "Goodbye! 👋"; exit 0 ;;
        *) echo "${RED}Invalid option${NC}" ;;
    esac
    
    read -p "Press Enter to continue..."
done
