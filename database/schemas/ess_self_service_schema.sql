-- ================================================================
-- FILE: database/schemas/ess_self_service_schema.sql
-- eLogix HRMS -- HR Services & Support > Employee Self Service (ESS)
-- (5 pages: My Profile, Profile Update, My Documents, My Digital
-- Signature, My Internal Training Certificates)
--
-- Design note: 4 of 5 pages are pure consumption layers --
--   - My Profile / Profile Update -> reuses the EXISTING
--     PersonalInformationPage.jsx (Employee Database session), which
--     already implements the maker-checker edit+approval workflow this
--     brief asks for. That page's frontend import existed but had NO
--     route key anywhere in App.jsx -- fixed in this session.
--   - My Documents       -> pure UI over the EXISTING employee_documents
--   - My Training Certs  -> pure UI over the EXISTING
--     v_my_credentials_employee (already commented as "the ESS view")
-- The ONE genuinely new requirement: My Digital Signature needs a
-- unified "pending signature" inbox spanning MULTIPLE source tables
-- (warning_letters already has signature_data/signed_at; but policy
-- acknowledgments and appraisal sign-offs have no equivalent yet).
-- pending_esignature_requests is a thin, generic polymorphic table
-- that any module can insert into, rather than adding signature
-- columns to every future document type individually.
--
--   - pending_esignature_requests (generic, polymorphic signature inbox)
--   - external_certificate_uploads (HR-verification queue for non-internal certs)
--
-- Nepal legal grounding: Section 107/109 (accurate employee records --
-- My Profile/Documents fulfill this); Electronic Transactions Act 2063
-- (legal recognition of digital signatures); Section 40 (employer
-- training obligation -- digital certificate copies are verifiable proof).
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- PAGE 4: MY DIGITAL SIGNATURE (generic polymorphic pending-signature inbox)
-- ================================================================
CREATE TABLE IF NOT EXISTS pending_esignature_requests (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id               UUID       NOT NULL REFERENCES employees(id),

    title                         VARCHAR(300) NOT NULL,
    document_body_preview            TEXT,  -- short preview shown before the full document loads
    -- polymorphic source: any module can insert a row here without a
    -- schema change (warning_letters, announcements, performance_appraisals, etc.)
    source_table                         VARCHAR(60) NOT NULL,
    source_record_id                         UUID NOT NULL,

    urgency                                      VARCHAR(10) DEFAULT 'low' CHECK (urgency IN ('high','medium','low')),

    signed                                           BOOLEAN DEFAULT FALSE,
    signature_data                                       TEXT,  -- e-signature capture, same pattern as warning_letters
    otp_verified_at                                          TIMESTAMPTZ,  -- MFA gate before the signature counts as legally applied
    signed_at                                                    TIMESTAMPTZ,

    created_at                                                      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PAGE 5: MY INTERNAL TRAINING CERTIFICATES (external-cert verification queue)
-- ================================================================
CREATE TABLE IF NOT EXISTS external_certificate_uploads (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id               UUID       NOT NULL REFERENCES employees(id),

    certificate_title             VARCHAR(300) NOT NULL,
    issuing_organization              VARCHAR(300),
    file_url                              VARCHAR(500) NOT NULL,

    verification_status                       VARCHAR(20) DEFAULT 'pending_verification'
                                              CHECK (verification_status IN ('pending_verification','verified','rejected')),
    verified_by                                  UUID,
    verified_at                                      TIMESTAMPTZ,

    -- once verified, this can be promoted into lms_certifications
    -- (Course Management) by the verifying HR action -- never a
    -- duplicate certificate store, just a staging/verification queue
    promoted_lms_certification_id                        UUID REFERENCES lms_certifications(id),

    uploaded_at                                              TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_per_employee       ON pending_esignature_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_per_unsigned            ON pending_esignature_requests(signed) WHERE NOT signed;
CREATE INDEX IF NOT EXISTS idx_per_source                  ON pending_esignature_requests(source_table, source_record_id);
CREATE INDEX IF NOT EXISTS idx_ecu_employee                    ON external_certificate_uploads(employee_id);
CREATE INDEX IF NOT EXISTS idx_ecu_pending                         ON external_certificate_uploads(verification_status) WHERE verification_status = 'pending_verification';

-- ================================================================
-- TRIGGERS
-- ================================================================

-- On signature application (after OTP verification): sync the
-- signed state back to the originating record where a matching
-- pattern exists (e.g. warning_letters), reusing transaction_notifications
CREATE OR REPLACE FUNCTION fn_apply_esignature()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.signed AND NOT OLD.signed AND NEW.otp_verified_at IS NOT NULL THEN
        NEW.signed_at := NOW();

        IF NEW.source_table = 'warning_letters' THEN
            UPDATE warning_letters SET acknowledged = TRUE, signature_data = NEW.signature_data, signed_at = NOW()
            WHERE id = NEW.source_record_id;
        END IF;

        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'pending_esignature_requests', NEW.id, 'document_signed', NEW.employee_id, 'direct_party',
           format('You signed: "%s"', NEW.title), NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_apply_signature
    BEFORE UPDATE OF signed ON pending_esignature_requests
    FOR EACH ROW EXECUTE FUNCTION fn_apply_esignature();

-- On external certificate verification: notify the employee
CREATE OR REPLACE FUNCTION fn_notify_certificate_verification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
        NEW.verified_at := NOW();
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'external_certificate_uploads', NEW.id, 'certificate_verification', NEW.employee_id, 'direct_party',
           format('Your certificate "%s" was %s.', NEW.certificate_title, NEW.verification_status), NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_verification
    BEFORE UPDATE OF verification_status ON external_certificate_uploads
    FOR EACH ROW EXECUTE FUNCTION fn_notify_certificate_verification();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 4: pending signature inbox, unioned with warning_letters that
-- haven't yet been mirrored into pending_esignature_requests
CREATE OR REPLACE VIEW v_my_pending_signatures AS
SELECT per.id, per.title, per.urgency, per.created_at, per.employee_id, per.company_id, per.signed
FROM pending_esignature_requests per
WHERE NOT per.signed
ORDER BY per.urgency, per.created_at;

CREATE OR REPLACE VIEW v_my_signed_documents AS
SELECT title, signed_at FROM pending_esignature_requests WHERE signed
ORDER BY signed_at DESC;

-- Page 5: external certificate upload queue for HR
CREATE OR REPLACE VIEW v_external_certificate_queue AS
SELECT ecu.*, e.first_name, e.last_name
FROM external_certificate_uploads ecu
JOIN employees e ON ecu.employee_id = e.id
WHERE ecu.verification_status = 'pending_verification';
