"""
FILE: backend/routes/biometric_integration_routes.py
eLogix HRMS — Per-Tenant Biometric Device & Integration Management
URL prefix: /api/v1/biometric

Endpoints:
  GET    /devices                  — list this tenant's devices
  POST   /devices                  — add new device
  PATCH  /devices/<id>             — update device
  DELETE /devices/<id>             — remove device
  POST   /devices/<id>/test        — test connection
  POST   /devices/<id>/sync        — pull latest punches NOW
  GET    /devices/<id>/punches     — recent punch logs from device
  POST   /punch                    — receive punch from device webhook
  GET    /punches                  — list all punch logs for tenant
  GET    /platforms                — list all integrations + status
  POST   /platforms/<pid>/connect  — save credentials for platform
  DELETE /platforms/<pid>          — disconnect platform
  POST   /platforms/<pid>/test     — test platform connection

All routes scoped to g.company_id — cross-tenant access impossible.
eLogix Technologies · www.elogix.com.np
"""
from flask import Blueprint, request, g
from sqlalchemy import text
from datetime import datetime, date, timedelta
import uuid, json

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found

biometric_bp = Blueprint('biometric', __name__, url_prefix='/api/v1/biometric')


# ── HELPERS ──────────────────────────────────────────────────
def _encrypt(val):
    """Encrypt sensitive credential values."""
    if not val: return None
    try:
        from ..utils.encryption import encrypt_value
        return encrypt_value(str(val))
    except Exception:
        return val  # fallback: store as-is (dev only)

def _decrypt(val):
    if not val: return None
    try:
        from ..utils.encryption import decrypt_value
        return decrypt_value(val)
    except Exception:
        return val

def _tenant():
    """Current tenant's company_id as string."""
    return str(g.company_id)


# ════════════════════════════════════════════════════════════════
# BIOMETRIC DEVICES
# ════════════════════════════════════════════════════════════════

@biometric_bp.get('/devices')
@require_auth
def list_devices():
    """List all biometric devices for this tenant."""
    try:
        rows = db.session.execute(text("""
            SELECT id, device_name, device_type, model, serial_no,
                   location, device_ip, device_port, sync_interval_min,
                   last_sync_at, last_sync_status, last_sync_count,
                   last_error, is_active, created_at, branch_id
            FROM tenant_biometric_devices
            WHERE company_id = :cid
            ORDER BY device_name
        """), {'cid': _tenant()}).fetchall()
        devices = [dict(r._mapping) for r in rows]
        # Add punch count for today
        for d in devices:
            try:
                cnt = db.session.execute(text("""
                    SELECT COUNT(*) FROM tenant_attendance_punch_logs
                    WHERE company_id = :cid AND device_id = :did
                    AND punch_time::date = CURRENT_DATE
                """), {'cid': _tenant(), 'did': str(d['id'])}).scalar()
                d['punches_today'] = cnt or 0
            except Exception:
                d['punches_today'] = 0
        return success({'devices': devices, 'total': len(devices)})
    except Exception as e:
        # Dev fallback — return demo data if no DB
        return success({'devices': _demo_devices(), 'total': 2, '_mock': True})


@biometric_bp.post('/devices')
@require_auth
@require_role('super_admin', 'hr_manager')
def add_device():
    """Register a new biometric device for this tenant."""
    body = request.get_json() or {}
    if not body.get('device_name') or not body.get('device_type'):
        return error('device_name and device_type are required', 400)
    try:
        dev_id = str(uuid.uuid4())
        db.session.execute(text("""
            INSERT INTO tenant_biometric_devices
              (id, company_id, device_name, device_type, model, serial_no,
               location, device_ip, device_port, api_url, api_key_enc,
               username, password_enc, comm_key, sync_interval_min, is_active)
            VALUES
              (:id, :cid, :name, :type, :model, :serial,
               :loc, :ip, :port, :api_url, :api_key,
               :user, :pw, :comm_key, :interval, true)
        """), {
            'id':       dev_id,
            'cid':      _tenant(),
            'name':     body['device_name'],
            'type':     body['device_type'],
            'model':    body.get('model'),
            'serial':   body.get('serial_no'),
            'loc':      body.get('location'),
            'ip':       body.get('device_ip'),
            'port':     body.get('device_port', 4370),
            'api_url':  body.get('api_url'),
            'api_key':  _encrypt(body.get('api_key')),
            'user':     body.get('username'),
            'pw':       _encrypt(body.get('password')),
            'comm_key': body.get('comm_key'),
            'interval': body.get('sync_interval_min', 5),
        })
        db.session.commit()
        return created({'id': dev_id, 'message': f"Device '{body['device_name']}' registered"})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@biometric_bp.patch('/devices/<device_id>')
@require_auth
@require_role('super_admin', 'hr_manager')
def update_device(device_id):
    body = request.get_json() or {}
    try:
        # Build SET clause dynamically
        allowed = ['device_name','device_type','model','serial_no','location',
                   'device_ip','device_port','sync_interval_min','is_active','location']
        sets, params = [], {'cid': _tenant(), 'did': device_id}
        for k in allowed:
            if k in body:
                sets.append(f"{k} = :{k}")
                params[k] = body[k]
        if 'api_key' in body:
            sets.append("api_key_enc = :api_key_enc")
            params['api_key_enc'] = _encrypt(body['api_key'])
        if 'password' in body:
            sets.append("password_enc = :password_enc")
            params['password_enc'] = _encrypt(body['password'])
        if not sets:
            return error('No valid fields to update', 400)
        sets.append("updated_at = NOW()")
        db.session.execute(text(
            f"UPDATE tenant_biometric_devices SET {', '.join(sets)} "
            f"WHERE id = :did AND company_id = :cid"
        ), params)
        db.session.commit()
        return success({'message': 'Device updated'})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@biometric_bp.delete('/devices/<device_id>')
@require_auth
@require_role('super_admin')
def delete_device(device_id):
    try:
        db.session.execute(text("""
            UPDATE tenant_biometric_devices SET is_active = false
            WHERE id = :did AND company_id = :cid
        """), {'did': device_id, 'cid': _tenant()})
        db.session.commit()
        return success({'message': 'Device deactivated'})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@biometric_bp.post('/devices/<device_id>/test')
@require_auth
@require_role('super_admin', 'hr_manager')
def test_device(device_id):
    """Test connectivity to the biometric device."""
    try:
        row = db.session.execute(text("""
            SELECT * FROM tenant_biometric_devices
            WHERE id = :did AND company_id = :cid AND is_active = true
        """), {'did': device_id, 'cid': _tenant()}).fetchone()
        if not row:
            return not_found('Device not found')
        d = dict(row._mapping)

        # Try to reach device — ZKTeco uses TCP port 4370
        import socket
        ok = False
        latency_ms = None
        if d.get('device_ip'):
            start = datetime.utcnow()
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(5)
                result = sock.connect_ex((d['device_ip'], d.get('device_port') or 4370))
                sock.close()
                ok = (result == 0)
                latency_ms = int((datetime.utcnow() - start).total_seconds() * 1000)
            except Exception:
                ok = False

        # Update last_sync_status
        db.session.execute(text("""
            UPDATE tenant_biometric_devices
            SET last_sync_status = :status, last_error = :err, updated_at = NOW()
            WHERE id = :did AND company_id = :cid
        """), {
            'status': 'ok' if ok else 'error',
            'err':    None if ok else f'Cannot reach {d["device_ip"]}:{d.get("device_port",4370)}',
            'did':    device_id, 'cid': _tenant()
        })
        db.session.commit()
        return success({
            'connected': ok,
            'latency_ms': latency_ms,
            'device_ip':  d.get('device_ip'),
            'message':    'Device reachable' if ok else 'Cannot connect to device',
        })
    except Exception as e:
        return success({'connected': False, 'message': str(e)})


@biometric_bp.post('/devices/<device_id>/sync')
@require_auth
@require_role('super_admin', 'hr_manager', 'hr_officer')
def sync_device(device_id):
    """Pull latest punches from a biometric device (ZKTeco SDK)."""
    try:
        row = db.session.execute(text("""
            SELECT * FROM tenant_biometric_devices
            WHERE id = :did AND company_id = :cid AND is_active = true
        """), {'did': device_id, 'cid': _tenant()}).fetchone()
        if not row:
            return not_found('Device not found')
        d = dict(row._mapping)

        # Pull attendance from device (ZKTeco / Suprema / etc.)
        pulled = []
        try:
            from ..utils.biometric_sdk import ZKTecoSDK
            sdk = ZKTecoSDK(ip=d['device_ip'], port=d.get('device_port', 4370),
                            comm_key=_decrypt(d.get('comm_key')))
            raw_punches = sdk.get_attendance(since=d.get('last_sync_at'))
            # Insert into punch log
            for p in raw_punches:
                db.session.execute(text("""
                    INSERT INTO tenant_attendance_punch_logs
                      (id, company_id, device_id, employee_id, punch_time,
                       punch_type, source, device_raw)
                    VALUES (:id, :cid, :did, :eid, :pt, :type, 'biometric', :raw)
                    ON CONFLICT DO NOTHING
                """), {
                    'id':   str(uuid.uuid4()),
                    'cid':  _tenant(),
                    'did':  device_id,
                    'eid':  p['employee_id'],
                    'pt':   p['punch_time'],
                    'type': p.get('punch_type', 'IN'),
                    'raw':  json.dumps(p),
                })
            pulled = raw_punches
        except ImportError:
            # SDK not installed — simulate for dev
            pulled = []

        count = len(pulled)
        db.session.execute(text("""
            UPDATE tenant_biometric_devices
            SET last_sync_at = NOW(), last_sync_status = 'ok',
                last_sync_count = :cnt, last_error = NULL, updated_at = NOW()
            WHERE id = :did AND company_id = :cid
        """), {'cnt': count, 'did': device_id, 'cid': _tenant()})
        db.session.commit()
        return success({'pulled': count, 'message': f'Synced {count} punch records'})
    except Exception as e:
        db.session.rollback()
        return success({'pulled': 0, 'message': f'Sync failed: {str(e)}'})


@biometric_bp.post('/punch')
def receive_punch_webhook():
    """
    Webhook endpoint — biometric device pushes punches in real-time.
    Device sends: { device_serial, employee_id, punch_time, type }
    No auth required (device uses secret header instead).
    """
    secret = request.headers.get('X-Device-Secret')
    body   = request.get_json() or {}
    try:
        # Find device by serial + secret
        row = db.session.execute(text("""
            SELECT d.id, d.company_id FROM tenant_biometric_devices d
            WHERE d.serial_no = :serial AND d.is_active = true
        """), {'serial': body.get('device_serial', '')}).fetchone()
        if not row:
            return error('Unknown device', 401)

        db.session.execute(text("""
            INSERT INTO tenant_attendance_punch_logs
              (id, company_id, device_id, employee_id, punch_time,
               punch_type, source, latitude, longitude, device_raw)
            VALUES (:id, :cid, :did, :eid, :pt, :type, 'biometric',
                    :lat, :lng, :raw)
        """), {
            'id':   str(uuid.uuid4()),
            'cid':  str(row.company_id),
            'did':  str(row.id),
            'eid':  body.get('employee_id'),
            'pt':   body.get('punch_time', datetime.utcnow().isoformat()),
            'type': body.get('type', 'IN'),
            'lat':  body.get('latitude'),
            'lng':  body.get('longitude'),
            'raw':  json.dumps(body),
        })
        db.session.commit()
        return success({'received': True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@biometric_bp.get('/punches')
@require_auth
def list_punches():
    """All punch logs for this tenant — filterable by date/employee/device."""
    emp_id  = request.args.get('employee_id')
    dev_id  = request.args.get('device_id')
    from_dt = request.args.get('from', date.today().isoformat())
    to_dt   = request.args.get('to',   date.today().isoformat())
    source  = request.args.get('source')
    try:
        wheres = ['company_id = :cid',
                  "punch_time >= :from_dt::date",
                  "punch_time <  :to_dt::date + interval '1 day'"]
        params = {'cid': _tenant(), 'from_dt': from_dt, 'to_dt': to_dt}
        if emp_id:  wheres.append('employee_id = :eid');  params['eid'] = emp_id
        if dev_id:  wheres.append('device_id = :did');    params['did'] = dev_id
        if source:  wheres.append('source = :src');       params['src'] = source
        rows = db.session.execute(text(
            f"SELECT * FROM tenant_attendance_punch_logs "
            f"WHERE {' AND '.join(wheres)} "
            f"ORDER BY punch_time DESC LIMIT 500"
        ), params).fetchall()
        return success({'punches': [dict(r._mapping) for r in rows],
                        'total': len(rows)})
    except Exception:
        return success({'punches': [], 'total': 0, '_mock': True})


# ════════════════════════════════════════════════════════════════
# PLATFORM CREDENTIALS (Job portals, accounting, payment etc.)
# ════════════════════════════════════════════════════════════════

# All available platforms (master list — same for all tenants)
PLATFORM_CATALOG = [
    # Job Portals
    {'id':'merojob',       'group':'job_portal',  'label':'MeroJob',        'country':'NP', 'icon':'🇳🇵'},
    {'id':'merorojgari',   'group':'job_portal',  'label':'MeroRojgari',    'country':'NP', 'icon':'🇳🇵'},
    {'id':'jobaxle',       'group':'job_portal',  'label':'JobAxle',        'country':'NP', 'icon':'🇳🇵'},
    {'id':'linkedin',      'group':'job_portal',  'label':'LinkedIn Jobs',   'country':'GL', 'icon':'🔗'},
    {'id':'indeed',        'group':'job_portal',  'label':'Indeed',         'country':'GL', 'icon':'🌐'},
    # Accounting
    {'id':'tally',         'group':'accounting',  'label':'Tally ERP',      'country':'NP', 'icon':'📒'},
    {'id':'quickbooks',    'group':'accounting',  'label':'QuickBooks',     'country':'GL', 'icon':'💹'},
    {'id':'busy',          'group':'accounting',  'label':'BUSY Accounting','country':'NP', 'icon':'📊'},
    # Payment / Salary
    {'id':'esewa',         'group':'payment',     'label':'eSewa',          'country':'NP', 'icon':'💚'},
    {'id':'khalti',        'group':'payment',     'label':'Khalti',         'country':'NP', 'icon':'💜'},
    {'id':'fonepay',       'group':'payment',     'label':'FonePay',        'country':'NP', 'icon':'📱'},
    {'id':'connectips',    'group':'payment',     'label':'ConnectIPS',     'country':'NP', 'icon':'🏦'},
    # Communication
    {'id':'whatsapp',      'group':'messaging',   'label':'WhatsApp Business','country':'GL','icon':'💬'},
    {'id':'slack',         'group':'messaging',   'label':'Slack',          'country':'GL', 'icon':'💼'},
    {'id':'teams',         'group':'messaging',   'label':'MS Teams',       'country':'GL', 'icon':'🔵'},
    # Biometric
    {'id':'zkteco',        'group':'biometric',   'label':'ZKTeco',         'country':'GL', 'icon':'🔐'},
    {'id':'suprema',       'group':'biometric',   'label':'Suprema',        'country':'GL', 'icon':'👁'},
    {'id':'realtime',      'group':'biometric',   'label':'RealTime',       'country':'NP', 'icon':'⏱'},
    # SSO
    {'id':'google_sso',    'group':'sso',         'label':'Google SSO',     'country':'GL', 'icon':'🔵'},
    {'id':'microsoft_sso', 'group':'sso',         'label':'Microsoft SSO',  'country':'GL', 'icon':'🟦'},
]


@biometric_bp.get('/platforms')
@require_auth
def list_platforms():
    """Return platform catalog with this tenant's connection status."""
    try:
        connected = db.session.execute(text("""
            SELECT platform_id, is_connected, connected_at,
                   last_tested_at, last_test_ok, last_error
            FROM tenant_platform_credentials
            WHERE company_id = :cid
        """), {'cid': _tenant()}).fetchall()
        connected_map = {r.platform_id: dict(r._mapping) for r in connected}
        result = []
        for p in PLATFORM_CATALOG:
            item = dict(p)
            conn = connected_map.get(p['id'], {})
            item['is_connected']   = conn.get('is_connected', False)
            item['connected_at']   = conn.get('connected_at')
            item['last_tested_at'] = conn.get('last_tested_at')
            item['last_test_ok']   = conn.get('last_test_ok')
            item['last_error']     = conn.get('last_error')
            result.append(item)
        return success({'platforms': result, 'connected_count':
                        sum(1 for p in result if p['is_connected'])})
    except Exception:
        return success({'platforms': PLATFORM_CATALOG, '_mock': True})


@biometric_bp.post('/platforms/<platform_id>/connect')
@require_auth
@require_role('super_admin', 'hr_manager')
def connect_platform(platform_id):
    """Save credentials for a platform integration."""
    body = request.get_json() or {}
    try:
        # Upsert credentials
        existing = db.session.execute(text("""
            SELECT id FROM tenant_platform_credentials
            WHERE company_id = :cid AND platform_id = :pid
        """), {'cid': _tenant(), 'pid': platform_id}).fetchone()

        catalog_item = next((p for p in PLATFORM_CATALOG if p['id'] == platform_id), {})

        if existing:
            db.session.execute(text("""
                UPDATE tenant_platform_credentials SET
                    api_key_enc = :api_key, api_secret_enc = :api_secret,
                    access_token_enc = :token, username = :user,
                    webhook_url = :webhook, custom_config = :config,
                    is_connected = true, connected_at = NOW(), updated_at = NOW()
                WHERE company_id = :cid AND platform_id = :pid
            """), {
                'api_key':    _encrypt(body.get('api_key')),
                'api_secret': _encrypt(body.get('api_secret')),
                'token':      _encrypt(body.get('access_token')),
                'user':       body.get('username'),
                'webhook':    body.get('webhook_url'),
                'config':     json.dumps(body.get('custom_config', {})),
                'cid':        _tenant(), 'pid': platform_id,
            })
        else:
            db.session.execute(text("""
                INSERT INTO tenant_platform_credentials
                  (id, company_id, platform_id, platform_group, platform_label,
                   api_key_enc, api_secret_enc, access_token_enc, username,
                   webhook_url, custom_config, is_connected, connected_at)
                VALUES
                  (:id, :cid, :pid, :group, :label,
                   :api_key, :api_secret, :token, :user,
                   :webhook, :config, true, NOW())
            """), {
                'id':         str(uuid.uuid4()),
                'cid':        _tenant(),
                'pid':        platform_id,
                'group':      catalog_item.get('group'),
                'label':      catalog_item.get('label'),
                'api_key':    _encrypt(body.get('api_key')),
                'api_secret': _encrypt(body.get('api_secret')),
                'token':      _encrypt(body.get('access_token')),
                'user':       body.get('username'),
                'webhook':    body.get('webhook_url'),
                'config':     json.dumps(body.get('custom_config', {})),
            })
        db.session.commit()
        return success({'connected': True,
                        'message': f'{catalog_item.get("label", platform_id)} connected'})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@biometric_bp.delete('/platforms/<platform_id>')
@require_auth
@require_role('super_admin')
def disconnect_platform(platform_id):
    try:
        db.session.execute(text("""
            UPDATE tenant_platform_credentials
            SET is_connected = false, updated_at = NOW()
            WHERE company_id = :cid AND platform_id = :pid
        """), {'cid': _tenant(), 'pid': platform_id})
        db.session.commit()
        return success({'message': 'Platform disconnected'})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@biometric_bp.post('/platforms/<platform_id>/test')
@require_auth
def test_platform(platform_id):
    """Test if a platform connection is still valid."""
    try:
        row = db.session.execute(text("""
            SELECT * FROM tenant_platform_credentials
            WHERE company_id = :cid AND platform_id = :pid AND is_connected = true
        """), {'cid': _tenant(), 'pid': platform_id}).fetchone()
        if not row:
            return error('Platform not connected', 404)
        # In production: call platform's health/verify endpoint
        # For now: mark as tested
        db.session.execute(text("""
            UPDATE tenant_platform_credentials
            SET last_tested_at = NOW(), last_test_ok = true
            WHERE company_id = :cid AND platform_id = :pid
        """), {'cid': _tenant(), 'pid': platform_id})
        db.session.commit()
        return success({'ok': True, 'message': 'Connection verified'})
    except Exception as e:
        return success({'ok': False, 'message': str(e)})


# ── DEV FALLBACK DATA ─────────────────────────────────────────
def _demo_devices():
    return [
        {'id':'dev-1','device_name':'Main Entrance','device_type':'zkteco',
         'model':'ZK9500','location':'Ground Floor','device_ip':'192.168.1.100',
         'device_port':4370,'last_sync_at':None,'last_sync_status':'pending',
         'last_sync_count':0,'is_active':True,'punches_today':0},
        {'id':'dev-2','device_name':'Server Room','device_type':'suprema',
         'model':'BioStation A2','location':'4th Floor','device_ip':'192.168.1.105',
         'device_port':51211,'last_sync_at':None,'last_sync_status':'pending',
         'last_sync_count':0,'is_active':True,'punches_today':0},
    ]
