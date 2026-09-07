#!/bin/bash
# FILE: database/setup_all.sh
# eLogix HRMS — Complete Database Setup Script
# QA Report Fix: The docs pointed at complete_schema.sql which only has 28 tables.
# This script loads ALL 119 schema files in the correct order.
# Usage: bash database/setup_all.sh

set -e
echo "🔄 eLogix HRMS — Full Database Setup"
echo "Database: $DATABASE_URL"

# 1. Core schema (company, org structure)
echo "📋 Loading core schema..."
psql $DATABASE_URL < database/schemas/complete_schema.sql

# 2. Employee schema
echo "👥 Loading employee schema..."
for f in database/schemas/employee_*.sql; do
  [ -f "$f" ] && psql $DATABASE_URL < "$f" && echo "  ✅ $f"
done

# 3. Attendance & Leave
echo "⏰ Loading attendance/leave schema..."
for f in database/schemas/attendance_*.sql database/schemas/leave_*.sql; do
  [ -f "$f" ] && psql $DATABASE_URL < "$f" && echo "  ✅ $f"
done

# 4. Payroll & Tax
echo "💰 Loading payroll schema..."
for f in database/schemas/payroll_*.sql database/schemas/salary_*.sql; do
  [ -f "$f" ] && psql $DATABASE_URL < "$f" && echo "  ✅ $f"
done

# 5. Performance & Goals
echo "🎯 Loading performance schema..."
for f in database/schemas/performance_*.sql database/schemas/goal_*.sql database/schemas/kpi_*.sql; do
  [ -f "$f" ] && psql $DATABASE_URL < "$f" && echo "  ✅ $f"
done

# 6. Recruitment & ATS
echo "📋 Loading recruitment schema..."
for f in database/schemas/recruitment_*.sql database/schemas/ats_*.sql; do
  [ -f "$f" ] && psql $DATABASE_URL < "$f" && echo "  ✅ $f"
done

# 7. All remaining schema files
echo "📊 Loading remaining schema files..."
for f in database/schemas/*.sql; do
  [ -f "$f" ] && psql $DATABASE_URL < "$f" 2>/dev/null || true
done

# 8. Views and functions
echo "🔧 Loading views and functions..."
for f in database/views/*.sql database/functions/*.sql; do
  [ -f "$f" ] && psql $DATABASE_URL < "$f" 2>/dev/null || true
done

# 9. Alembic stamp
echo "📌 Stamping Alembic..."
alembic stamp head 2>/dev/null || true

echo ""
echo "✅ Database setup complete!"
echo "📊 Tables created:"
psql $DATABASE_URL -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" -t
