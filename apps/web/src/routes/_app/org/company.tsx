import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import {
  orgAddCompanyDocument,
  orgUpdateCompany,
  orgUploadCompanyDocument,
  orgVerifyCompanyDocument,
} from '@elogix/api-client'
import {
  orgCompanyComplianceOptions,
  orgGetCompanyOptions,
  orgListCompanyDocumentsOptions,
} from '@elogix/api-client/queries'

import {
  Banner,
  Button,
  Card,
  Cell,
  Field,
  Input,
  PageHeader,
  Pill,
  Row,
  SectionLabel,
  StatCard,
  Table,
} from '@/components/ui'
import type { PillTone } from '@/components/ui'
import { downloadFile } from '@/lib/download'
import { apiErrorMessage } from '@/lib/errors'
import { invalidate } from '@/lib/queries'

export const Route = createFileRoute('/_app/org/company')({ component: CompanyPage })

const STATUS_TONE: Record<string, PillTone> = {
  held: 'green',
  due: 'amber',
  expired: 'red',
  missing: 'slate',
}

/** Grouped the way the record reads, not the way the table is ordered. */
const SECTIONS: { label: string; fields: [key: string, label: string][] }[] = [
  {
    label: 'Registration',
    fields: [
      ['legal_name', 'Registered legal name'],
      ['registration_number', 'Company registration number'],
      ['registered_on', 'Registered on'],
    ],
  },
  {
    label: 'Tax and social security',
    fields: [
      ['pan_number', 'PAN number'],
      ['vat_number', 'VAT number'],
      ['ird_office', 'IRD office'],
      ['ssf_employer_code', 'SSF employer code'],
      ['labour_office', 'Labour office'],
    ],
  },
  {
    label: 'Registered address',
    fields: [
      ['address', 'Address'],
      ['ward', 'Ward'],
      ['municipality', 'Municipality'],
      ['district', 'District'],
      ['province', 'Province'],
    ],
  },
  {
    label: 'Contact',
    fields: [
      ['phone', 'Phone'],
      ['email', 'Email'],
      ['website', 'Website'],
    ],
  },
]

function CompanyPage() {
  const queryClient = useQueryClient()
  const company = useQuery(orgGetCompanyOptions())
  const compliance = useQuery(orgCompanyComplianceOptions())
  const documents = useQuery(orgListCompanyDocumentsOptions())

  const [form, setForm] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState(false)

  // Seed the form once the record arrives, and not again — otherwise a refetch would
  // discard whatever is half-typed.
  useEffect(() => {
    if (company.data && !dirty) {
      setForm(
        Object.fromEntries(
          SECTIONS.flatMap((s) => s.fields).map(([key]) => [
            key,
            (company.data as Record<string, unknown>)[key]?.toString() ?? '',
          ]),
        ),
      )
    }
  }, [company.data, dirty])

  const refresh = () => {
    invalidate(queryClient, 'orgGetCompany', 'orgCompanyCompliance', 'orgListCompanyDocuments')
    setDirty(false)
  }

  const save = useMutation({
    mutationFn: async () => {
      // Send blanks as null, so clearing a field clears it rather than storing "".
      const body = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v.trim() === '' ? null : v.trim()]),
      )
      const { error } = await orgUpdateCompany({ body })
      if (error) throw new Error(apiErrorMessage(error, 'Could not save it'))
    },
    onSuccess: refresh,
  })

  const c = compliance.data
  const docByCode = new Map(documents.data?.map((d) => [d.category, d]))

  return (
    <>
      <PageHeader
        title="Company"
        subtitle="The statutory identity a filing names the employer by, and the paperwork behind it"
        actions={
          <Button onClick={() => save.mutate()} disabled={save.isPending || !dirty}>
            {dirty ? 'Save changes' : 'Saved'}
          </Button>
        }
      />

      {/* The one warning that actually blocks something. */}
      {c && c.missing_filing_fields.length > 0 && (
        <Banner tone="warning" title="This company cannot file a return yet">
          Still blank: {c.missing_filing_fields.join(', ')}. A return names the employer
          by its PAN and its SSF employer code, so payroll can be computed but not
          submitted until these are set.
        </Banner>
      )}

      {save.isError && (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {save.error.message}
        </p>
      )}

      {c && (
        <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Expired" value={c.expired} hint="act on these first" />
          <StatCard label="Due to renew" value={c.due} hint="within 60 days" />
          <StatCard label="Not on file" value={c.missing} hint="never collected" />
          <StatCard label="In order" value={c.held} hint={`of ${c.items.length} statutory`} />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <SectionLabel>Statutory identity</SectionLabel>
          <Card className="p-4">
            <div className="grid gap-4">
              {SECTIONS.map((section) => (
                <div key={section.label} className="grid gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {section.label}
                  </span>
                  {section.fields.map(([key, label]) => (
                    <Field key={key} label={label}>
                      <Input
                        type={key === 'registered_on' ? 'date' : 'text'}
                        value={form[key] ?? ''}
                        onChange={(e) => {
                          setDirty(true)
                          setForm({ ...form, [key]: e.target.value })
                        }}
                      />
                    </Field>
                  ))}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <SectionLabel>Statutory documents</SectionLabel>
          <Card>
            {/* Driven by the statutory list, not by what is on file — a checklist that
                only shows what you have cannot tell you what you lack. */}
            <Table columns={['Document', 'Authority', 'State', 'File']}>
              {c?.items.map((row) => (
                <Row key={row.code}>
                  <Cell>
                    <span className="font-medium text-slate-800">{row.name}</span>
                    {row.citation && (
                      <span className="block text-[11px] text-slate-400">{row.citation}</span>
                    )}
                  </Cell>
                  <Cell className="text-xs text-slate-500">{row.authority}</Cell>
                  <Cell>
                    <Pill tone={STATUS_TONE[row.status] ?? 'slate'}>{row.status}</Pill>
                    <span className="mt-0.5 block text-[11px] text-slate-500">
                      {row.detail}
                    </span>
                  </Cell>
                  <Cell>
                    <DocumentCell
                      code={row.code}
                      name={row.name}
                      documentId={row.document_id ?? null}
                      filename={docByCode.get(row.code)?.original_filename ?? null}
                      verified={row.is_verified}
                      onChanged={refresh}
                    />
                  </Cell>
                </Row>
              ))}
            </Table>
          </Card>
          <p className="mt-2 px-1 text-[11px] text-slate-400">
            The ten documents Nepal expects a company to hold. Unverified against the
            Acts — like the tax and labour rules, this list needs a named person to
            confirm it.
          </p>
        </div>
      </div>
    </>
  )
}

function DocumentCell({
  code,
  name,
  documentId,
  filename,
  verified,
  onChanged,
}: {
  code: string
  name: string
  documentId: string | null
  filename: string | null
  verified: boolean
  onChanged: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const record = async () => {
    setBusy(true)
    const { error: failed } = await orgAddCompanyDocument({
      body: { category: code, title: name },
    })
    setBusy(false)
    if (failed) setError(apiErrorMessage(failed, 'Could not record it'))
    else onChanged()
  }

  const upload = async (file: File) => {
    if (!documentId) return
    setError(null)
    setBusy(true)
    const { error: failed } = await orgUploadCompanyDocument({
      path: { document_id: documentId },
      body: { file },
    })
    setBusy(false)
    if (failed) setError(apiErrorMessage(failed, 'That file was not accepted'))
    else onChanged()
  }

  const verify = async () => {
    if (!documentId) return
    setBusy(true)
    await orgVerifyCompanyDocument({ path: { document_id: documentId } })
    setBusy(false)
    onChanged()
  }

  if (!documentId) {
    return (
      <div className="flex flex-col gap-1">
        <Button
          variant="secondary"
          className="whitespace-nowrap px-2 py-1 text-xs"
          onClick={() => void record()}
          disabled={busy}
        >
          Add to file
        </Button>
        {error && (
          <span role="alert" className="text-[11px] text-red-700">
            {error}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {filename ? (
        <button
          onClick={() =>
            downloadFile(
              `/api/v1/org/company/documents/${documentId}/file`,
              filename,
            ).catch((e: Error) => setError(e.message))
          }
          className="max-w-32 truncate text-left text-xs font-medium text-blue-700 hover:underline"
        >
          {filename}
        </button>
      ) : (
        <label className="cursor-pointer text-xs text-slate-500 hover:text-slate-800">
          {busy ? 'Uploading…' : 'Upload scan'}
          <input
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void upload(file)
            }}
          />
        </label>
      )}
      {verified ? (
        <span className="text-[11px] text-emerald-700">verified</span>
      ) : (
        <button
          onClick={() => void verify()}
          disabled={busy}
          className="text-left text-[11px] text-slate-400 hover:text-slate-700"
        >
          mark verified
        </button>
      )}
      {error && (
        <span role="alert" className="text-[11px] text-red-700">
          {error}
        </span>
      )}
    </div>
  )
}
