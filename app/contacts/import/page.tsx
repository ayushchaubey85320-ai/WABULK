'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Download,
  CheckCircle2,
  XCircle,
  Users,
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

export default function ContactImportPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(1);

  // Data
  const [fileName, setFileName] = React.useState('');
  const [fileHeaders, setFileHeaders] = React.useState<string[]>([]);
  const [parsedRows, setParsedRows] = React.useState<any[]>([]);

  // Column Mapping
  const [mapping, setMapping] = React.useState<{
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    country: string;
  }>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    country: '',
  });

  // Groups and Tags to assign
  const [groups, setGroups] = React.useState<any[]>([]);
  const [selectedGroups, setSelectedGroups] = React.useState<string[]>([]);

  // Validation Results
  const [validating, setValidating] = React.useState(false);
  const [validationResult, setValidationResult] = React.useState<any>(null);

  // Import Execution
  const [importing, setImporting] = React.useState(false);
  const [importResult, setImportResult] = React.useState<any>(null);

  React.useEffect(() => {
    fetch('/api/groups').then((r) => r.json()).then((d) => setGroups(d.groups || []));
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isXlsx) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

          if (data.length > 0) {
            const headers = (data[0] || []).map((h) => String(h).trim());
            const rows = data.slice(1).map((r) => {
              const rowObj: Record<string, any> = {};
              headers.forEach((h, idx) => {
                rowObj[h] = r[idx] !== undefined ? String(r[idx]) : '';
              });
              return rowObj;
            });

            setFileHeaders(headers);
            setParsedRows(rows);
            autoDetectMapping(headers);
            setStep(2);
          }
        } catch (err) {
          toast.error('Failed to parse Excel file');
        }
      };
      reader.readAsBinaryString(file);
    } else {
      // CSV
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.meta.fields && results.data.length > 0) {
            setFileHeaders(results.meta.fields);
            setParsedRows(results.data);
            autoDetectMapping(results.meta.fields);
            setStep(2);
          } else {
            toast.error('File appears to be empty or missing columns');
          }
        },
        error: () => {
          toast.error('Failed to parse CSV file');
        },
      });
    }
  };

  const autoDetectMapping = (headers: string[]) => {
    const lower = headers.map((h) => h.toLowerCase());
    const findCol = (terms: string[]) => {
      for (const term of terms) {
        const idx = lower.findIndex((h) => h.includes(term));
        if (idx !== -1) return headers[idx];
      }
      return '';
    };

    setMapping({
      firstName: findCol(['first', 'name', 'fname']),
      lastName: findCol(['last', 'lname', 'surname']),
      phone: findCol(['phone', 'mobile', 'cell', 'whatsapp', 'number', 'contact']),
      email: findCol(['email', 'mail']),
      country: findCol(['country', 'region']),
    });
  };

  const handleValidate = async () => {
    if (!mapping.phone) {
      toast.error('Please map the Phone Number column');
      return;
    }

    setValidating(true);
    try {
      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: parsedRows,
          mapping,
          mode: 'validate',
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Validation failed');
        setValidating(false);
        return;
      }

      setValidationResult(json);
      setStep(3);
    } catch (err) {
      toast.error('Failed to validate records');
    } finally {
      setValidating(false);
    }
  };

  const handleExecuteImport = async () => {
    setImporting(true);
    try {
      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: parsedRows,
          mapping,
          groupIds: selectedGroups,
          mode: 'import',
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Import failed');
        setImporting(false);
        return;
      }

      setImportResult(json);
      setStep(4);
      toast.success(`Import complete! ${json.importedCount} contacts added.`);
    } catch (err) {
      toast.error('Failed to complete import');
    } finally {
      setImporting(false);
    }
  };

  const downloadErrorReport = () => {
    if (!importResult?.errors || importResult.errors.length === 0) return;
    const csvContent =
      'Row Number,Phone,Reason\n' +
      importResult.errors
        .map((e: any) => `"${e.rowNumber}","${e.phone}","${e.reason.replace(/"/g, '""')}"`)
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `import_errors_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Contact Import Wizard</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload CSV or Excel spreadsheets, map columns, and validate international E.164 numbers.
            </p>
          </div>
          <Link href="/contacts">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Contacts
            </Button>
          </Link>
        </div>

        {/* Wizard Steps Progress Indicator */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          {[
            { stepNum: 1, title: 'Upload File' },
            { stepNum: 2, title: 'Map Fields' },
            { stepNum: 3, title: 'Validate & Preview' },
            { stepNum: 4, title: 'Complete' },
          ].map((item) => (
            <div
              key={item.stepNum}
              className={`p-2.5 rounded-xl border font-semibold transition-all ${
                step === item.stepNum
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : step > item.stepNum
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  : 'bg-card text-muted-foreground border-border'
              }`}
            >
              Step {item.stepNum}: {item.title}
            </div>
          ))}
        </div>

        {/* STEP 1: Upload */}
        {step === 1 && (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Select Contact List File</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                  Upload .csv, .xlsx, or .xls files containing your audience phone numbers and names.
                </p>
              </div>

              <div className="max-w-md mx-auto pt-4">
                <label className="border-2 border-dashed border-border hover:border-primary rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/30 transition-all">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-xs font-semibold text-foreground">Click to browse file</span>
                  <span className="text-[10px] text-muted-foreground mt-1">Supports files up to 50,000+ rows</span>
                  <input
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: Field Mapping */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Map File Columns to WABulk Fields</CardTitle>
              <CardDescription className="text-xs">
                File: <strong className="text-foreground">{fileName}</strong> ({parsedRows.length} rows detected)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Phone Number Column * (Required)
                  </label>
                  <select
                    value={mapping.phone}
                    onChange={(e) => setMapping({ ...mapping, phone: e.target.value })}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="">-- Select Column --</option>
                    {fileHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">First Name Column</label>
                  <select
                    value={mapping.firstName}
                    onChange={(e) => setMapping({ ...mapping, firstName: e.target.value })}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="">-- Optional --</option>
                    {fileHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Last Name Column</label>
                  <select
                    value={mapping.lastName}
                    onChange={(e) => setMapping({ ...mapping, lastName: e.target.value })}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="">-- Optional --</option>
                    {fileHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Email Column</label>
                  <select
                    value={mapping.email}
                    onChange={(e) => setMapping({ ...mapping, email: e.target.value })}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="">-- Optional --</option>
                    {fileHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assign to group */}
              <div className="pt-2 border-t border-border">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Assign Imported Contacts to Groups
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {groups.map((g) => {
                    const isSelected = selectedGroups.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() =>
                          setSelectedGroups(
                            isSelected
                              ? selectedGroups.filter((id) => id !== g.id)
                              : [...selectedGroups, g.id]
                          )
                        }
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-primary text-white border-primary'
                            : 'bg-muted/40 border-border text-foreground hover:bg-muted'
                        }`}
                      >
                        {g.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Re-upload File
                </Button>
                <Button size="sm" loading={validating} onClick={handleValidate}>
                  Validate Records <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: Validation & Preview */}
        {step === 3 && validationResult && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Validation Summary & Preview</CardTitle>
              <CardDescription className="text-xs">
                Inspect preview and verify before adding contacts into PostgreSQL database.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Validation Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-muted/40 border border-border text-center">
                  <div className="text-xs text-muted-foreground">Total Rows</div>
                  <div className="text-lg font-bold text-foreground">{validationResult.totalRows}</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-center">
                  <div className="text-xs text-emerald-700 dark:text-emerald-300">Valid Ready</div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {validationResult.validCount}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-500/30 text-center">
                  <div className="text-xs text-red-700 dark:text-red-300">Invalid Rows</div>
                  <div className="text-lg font-bold text-red-600 dark:text-red-400">
                    {validationResult.invalidCount}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-500/30 text-center">
                  <div className="text-xs text-amber-700 dark:text-amber-300">Duplicates</div>
                  <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {validationResult.duplicateCount}
                  </div>
                </div>
              </div>

              {/* Preview Table */}
              <div>
                <h4 className="text-xs font-semibold text-foreground mb-2">First 50 Valid Contacts Preview</h4>
                <div className="max-h-60 overflow-y-auto border border-border rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 text-[11px] text-muted-foreground sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">Formatted Phone (E.164)</th>
                        <th className="py-2 px-3">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {validationResult.preview?.map((r: any, idx: number) => (
                        <tr key={idx} className="hover:bg-muted/30">
                          <td className="py-1.5 px-3 font-medium">
                            {r.firstName} {r.lastName || ''}
                          </td>
                          <td className="py-1.5 px-3 font-mono text-emerald-600 dark:text-emerald-400">{r.phone}</td>
                          <td className="py-1.5 px-3 text-muted-foreground">{r.email || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Mapping
                </Button>
                <Button
                  size="sm"
                  loading={importing}
                  disabled={validationResult.validCount === 0}
                  onClick={handleExecuteImport}
                >
                  Import {validationResult.validCount} Contacts <CheckCircle className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 4: Complete */}
        {step === 4 && importResult && (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Import Completed Successfully</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Successfully processed <strong>{importResult.importedCount}</strong> new contacts into your directory.
              </p>

              {importResult.invalidCount > 0 && (
                <div className="max-w-md mx-auto p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 text-left">
                  <div className="font-semibold mb-1">
                    {importResult.invalidCount} rows were skipped due to invalid formats or duplicate numbers.
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadErrorReport}
                    className="mt-2 h-7 text-xs border-amber-400 text-amber-900 dark:text-amber-200"
                  >
                    <Download className="w-3 h-3 mr-1" /> Download Error Report (.csv)
                  </Button>
                </div>
              )}

              <div className="flex justify-center space-x-3 pt-4">
                <Link href="/contacts">
                  <Button size="sm">View Contacts Directory</Button>
                </Link>
                <Link href="/campaigns/new">
                  <Button variant="whatsapp" size="sm">
                    Create Campaign
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
