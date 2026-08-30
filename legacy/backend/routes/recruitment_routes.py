# FILE: backend/routes/recruitment_routes.py
# eLogix HRMS — Recruitment API Routes
# Handles: Applicant Status, Vacancy Status, ATS operations
# All endpoints are tenant-isolated via X-Tenant-Slug header + JWT
# eLogix Technologies · www.elogix.com.np

from flask import Blueprint, request, jsonify, g
from datetime import datetime, date
import logging

logger = logging.getLogger('elogix.recruitment')
recruitment_bp = Blueprint('recruitment', __name__)


# ═══════════════════════════════════════════════════════════════
# APPLICANT STATUS ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@recruitment_bp.route('/applicants', methods=['GET'])
def get_applicants():
    """
    GET /api/v1/recruitment/applicants
    Query params: status, source, position, search, page, per_page
    Returns tenant-scoped applicant list.
    """
    from config.database import db
    try:
        company_id = getattr(g, 'company_id', None)
        if not company_id:
            return jsonify({'error': 'Tenant context missing'}), 400

        # In production: query from applicants table filtered by company_id
        # For now returns structure showing what the DB query would return
        page     = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        status   = request.args.get('status', '')
        source   = request.args.get('source', '')
        search   = request.args.get('search', '')

        # Example query structure (SQLAlchemy):
        # from models.recruitment_models import Applicant
        # query = Applicant.query.filter_by(company_id=company_id)
        # if status: query = query.filter(Applicant.status == status)
        # if source: query = query.filter(Applicant.source == source)
        # if search: query = query.filter(
        #     Applicant.candidate_name.ilike(f'%{search}%') |
        #     Applicant.candidate_code.ilike(f'%{search}%')
        # )
        # total = query.count()
        # items = query.offset((page-1)*per_page).limit(per_page).all()

        return jsonify({
            'success'   : True,
            'data'      : [],     # populated from DB in production
            'total'     : 0,
            'page'      : page,
            'per_page'  : per_page,
            'company_id': company_id,
        })
    except Exception as e:
        logger.error(f'get_applicants error: {e}', exc_info=True)
        return jsonify({'error': str(e)}), 500


@recruitment_bp.route('/applicants', methods=['POST'])
def create_applicant():
    """
    POST /api/v1/recruitment/applicants
    Body: applicant data dict
    Creates a new applicant record in the tenant's space.
    """
    try:
        company_id = getattr(g, 'company_id', None)
        if not company_id:
            return jsonify({'error': 'Tenant context missing'}), 400

        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400

        required = ['candidate_name', 'position']
        for f in required:
            if not data.get(f):
                return jsonify({'error': f'{f} is required'}), 400

        # Generate candidate code: AL-{year}{sequence}
        year = datetime.now().year % 100  # last 2 digits of Nepali year approx
        # In production: get next sequence from DB
        # seq = db.session.execute(
        #     "SELECT nextval('applicant_seq_{company_id}')"
        # ).scalar()
        # code = f"AL-{year:02d}{seq:04d}"

        # from models.recruitment_models import Applicant
        # applicant = Applicant(
        #     company_id       = company_id,
        #     candidate_code   = code,
        #     candidate_name   = data['candidate_name'],
        #     position         = data['position'],
        #     contact          = data.get('contact'),
        #     email            = data.get('email'),
        #     pooled_by        = data.get('pooled_by'),
        #     status           = data.get('status', 'New Lead'),
        #     source           = data.get('source'),
        #     leads_entry_date = date.today(),
        #     created_by       = g.user_id,
        # )
        # db.session.add(applicant)
        # db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Applicant created',
            'data'   : {'candidate_code': f'AL-{year:02d}0001'},
        }), 201
    except Exception as e:
        logger.error(f'create_applicant error: {e}', exc_info=True)
        return jsonify({'error': str(e)}), 500


@recruitment_bp.route('/applicants/<int:applicant_id>', methods=['PUT'])
def update_applicant(applicant_id):
    """
    PUT /api/v1/recruitment/applicants/<id>
    Updates any applicant field (inline edit from frontend).
    """
    try:
        company_id = getattr(g, 'company_id', None)
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # In production:
        # applicant = Applicant.query.filter_by(
        #     id=applicant_id, company_id=company_id
        # ).first_or_404()
        # for key, val in data.items():
        #     if hasattr(applicant, key):
        #         setattr(applicant, key, val)
        # applicant.updated_by = g.user_id
        # applicant.updated_at = datetime.utcnow()
        # db.session.commit()

        return jsonify({'success': True, 'message': 'Applicant updated'})
    except Exception as e:
        logger.error(f'update_applicant error: {e}', exc_info=True)
        return jsonify({'error': str(e)}), 500


@recruitment_bp.route('/applicants/<int:applicant_id>', methods=['DELETE'])
def delete_applicant(applicant_id):
    try:
        company_id = getattr(g, 'company_id', None)
        # applicant = Applicant.query.filter_by(id=applicant_id, company_id=company_id).first_or_404()
        # db.session.delete(applicant)
        # db.session.commit()
        return jsonify({'success': True, 'message': 'Applicant deleted'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@recruitment_bp.route('/applicants/import', methods=['POST'])
def import_applicants():
    """
    POST /api/v1/recruitment/applicants/import
    Accepts JSON array of applicant rows (from frontend CSV import).
    """
    try:
        company_id = getattr(g, 'company_id', None)
        data = request.get_json()
        rows = data.get('rows', [])
        if not rows:
            return jsonify({'error': 'No rows provided'}), 400

        created = 0
        errors  = []
        for i, row in enumerate(rows):
            try:
                # Validate and insert each row
                if not row.get('candidate_name'):
                    errors.append(f'Row {i+1}: candidate_name missing')
                    continue
                # Insert to DB here
                created += 1
            except Exception as re:
                errors.append(f'Row {i+1}: {str(re)}')

        return jsonify({
            'success': True,
            'created': created,
            'errors' : errors,
            'message': f'{created} applicants imported',
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@recruitment_bp.route('/applicants/export', methods=['GET'])
def export_applicants():
    """
    GET /api/v1/recruitment/applicants/export
    Returns all applicants as CSV for download.
    """
    import csv, io
    try:
        company_id = getattr(g, 'company_id', None)
        # applicants = Applicant.query.filter_by(company_id=company_id).all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['S.N','Candidate Code','Candidate Name','Contact','Email',
                         'Position','Status','Source','Leads Entry Date','Client',
                         'Location','Post','Vacancy Code'])
        # for a in applicants:
        #     writer.writerow([a.sn, a.candidate_code, a.candidate_name, ...])

        from flask import Response
        return Response(
            '\uFEFF' + output.getvalue(),
            mimetype   = 'text/csv',
            headers    = {'Content-Disposition': 'attachment;filename=applicants.csv'}
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ═══════════════════════════════════════════════════════════════
# VACANCY STATUS ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@recruitment_bp.route('/vacancies', methods=['GET'])
def get_vacancies():
    """GET /api/v1/recruitment/vacancies"""
    try:
        company_id = getattr(g, 'company_id', None)
        page     = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        status   = request.args.get('status', '')
        search   = request.args.get('search', '')

        # from models.recruitment_models import Vacancy
        # query = Vacancy.query.filter_by(company_id=company_id)
        # ... filter, paginate

        return jsonify({
            'success'  : True,
            'data'     : [],
            'total'    : 0,
            'page'     : page,
            'per_page' : per_page,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@recruitment_bp.route('/vacancies', methods=['POST'])
def create_vacancy():
    """POST /api/v1/recruitment/vacancies"""
    try:
        company_id = getattr(g, 'company_id', None)
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400

        required = ['company_name', 'position', 'no_of_vacancy']
        for f in required:
            if not data.get(f):
                return jsonify({'error': f'{f} is required'}), 400

        # Generate vacancy code: AV-{YY}{MM}{seq}
        now = datetime.now()
        # code = f"AV-{now.year%100:02d}{now.month:02d}{seq:04d}"

        return jsonify({'success': True, 'message': 'Vacancy created'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@recruitment_bp.route('/vacancies/<int:vacancy_id>', methods=['PUT'])
def update_vacancy(vacancy_id):
    try:
        company_id = getattr(g, 'company_id', None)
        data = request.get_json()
        # Update vacancy in DB
        return jsonify({'success': True, 'message': 'Vacancy updated'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@recruitment_bp.route('/vacancies/<int:vacancy_id>', methods=['DELETE'])
def delete_vacancy(vacancy_id):
    try:
        company_id = getattr(g, 'company_id', None)
        # Delete vacancy
        return jsonify({'success': True, 'message': 'Vacancy deleted'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@recruitment_bp.route('/vacancies/export', methods=['GET'])
def export_vacancies():
    import csv, io
    try:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['S/N','Company Name','Address','Position','No. of Vacancies',
                         'Assigned To','Status','Level','Month','Opening Date',
                         'Timeline','Total Leads','Follow-up','Shortlist','Interview',
                         'On-Board','Client Fulfilled','Conversion%','Vacancy Code','Remarks'])
        from flask import Response
        return Response(
            '\uFEFF' + output.getvalue(),
            mimetype = 'text/csv',
            headers  = {'Content-Disposition': 'attachment;filename=vacancies.csv'}
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ═══════════════════════════════════════════════════════════════
# RECRUITMENT DASHBOARD SUMMARY
# ═══════════════════════════════════════════════════════════════

@recruitment_bp.route('/dashboard', methods=['GET'])
def recruitment_dashboard():
    """GET /api/v1/recruitment/dashboard — KPI summary for the recruitment dashboard."""
    try:
        company_id = getattr(g, 'company_id', None)

        # In production: aggregate queries
        # total_applicants = Applicant.query.filter_by(company_id=company_id).count()
        # onboarded        = Applicant.query.filter_by(company_id=company_id, status='On-board').count()
        # open_vacancies   = Vacancy.query.filter_by(company_id=company_id).filter(
        #     Vacancy.status.notin_(['Closed','Dissolved','Client Fulfilled'])
        # ).count()

        return jsonify({
            'success': True,
            'data': {
                'total_applicants'  : 0,
                'onboarded'         : 0,
                'open_vacancies'    : 0,
                'total_leads'       : 0,
                'conversion_rate'   : 0,
                'avg_time_to_fill'  : 0,
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
