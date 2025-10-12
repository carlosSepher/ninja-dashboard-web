import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaginatedTable, type PaginatedColumn } from "@/components/tables/PaginatedTable";
import { formatDateTime } from "@/lib/utils";
import { JsonPreview } from "@/components/JsonPreview";
import { apiClient, type CompanyCreateInput, type CompanyUpdateInput } from "@/services/apiClient";
import type { Company } from "@/store/types/dashboard";

const PAGE_SIZE = 10;

interface FormValues {
  id: string | null;
  name: string;
  contactEmail: string;
  apiToken: string;
  active: boolean;
  metadata: string;
}

const emptyForm: FormValues = {
  id: null,
  name: "",
  contactEmail: "",
  apiToken: "",
  active: true,
  metadata: "{\n}\n",
};

const toMetadataString = (metadata: Company["metadata"]): string => {
  if (!metadata || typeof metadata !== "object") return "{\n}\n";
  try {
    return `${JSON.stringify(metadata, null, 2)}\n`;
  } catch {
    return "{\n}\n";
  }
};

const parseMetadata = (value: string): Record<string, unknown> | null => {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "{}") {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Metadata must be a JSON object");
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid metadata JSON";
    throw new Error(message);
  }
};

export const CompaniesPage = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [formValues, setFormValues] = useState<FormValues>(emptyForm);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionCompanyId, setActionCompanyId] = useState<string | null>(null);

  const formDisabled = formLoading || detailLoading;

  const extractErrorMessage = useCallback((err: unknown, fallback: string) => {
    if (err && typeof err === "object") {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      if (typeof detail === "string" && detail.trim().length > 0) {
        return detail;
      }
    }
    if (err instanceof Error && err.message) {
      return err.message;
    }
    return fallback;
  }, []);

  const loadCompanies = useCallback(async (targetPage = page) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.listCompanies({
        page: targetPage,
        pageSize: PAGE_SIZE,
      });
      setCompanies(response.items);
      setTotal(response.count);
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to load companies"));
    } finally {
      setLoading(false);
    }
  }, [extractErrorMessage, page]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const resetForm = useCallback(() => {
    setFormMode("create");
    setFormValues(emptyForm);
    setFormError(null);
    setDetailLoading(false);
  }, []);

  const handleCreateClick = useCallback(() => {
    resetForm();
  }, [resetForm]);

  const handleEdit = useCallback(
    async (company: Company) => {
      setFormMode("edit");
      setFormError(null);
      setDetailLoading(true);
      setFormValues({
        id: company.id,
        name: company.name,
        contactEmail: company.contactEmail ?? "",
        apiToken: company.apiToken ?? "",
        active: company.active,
        metadata: toMetadataString(company.metadata),
      });

      try {
        const detailed = await apiClient.getCompany(company.id);
        setFormValues({
          id: detailed.id,
          name: detailed.name,
          contactEmail: detailed.contactEmail ?? "",
          apiToken: detailed.apiToken ?? "",
          active: detailed.active,
          metadata: toMetadataString(detailed.metadata),
        });
      } catch (err) {
        setFormError(extractErrorMessage(err, "Failed to load company details"));
      } finally {
        setDetailLoading(false);
      }
    },
    [extractErrorMessage],
  );

  const handleDelete = useCallback(
    async (company: Company) => {
      const confirmed = window.confirm(`Delete company "${company.name}"? This action cannot be undone.`);
      if (!confirmed) return;

      try {
        setActionCompanyId(company.id);
        await apiClient.deleteCompany(company.id);
        if (formValues.id === company.id) {
          resetForm();
        }
        const nextPage = companies.length === 1 && page > 1 ? page - 1 : page;
        if (nextPage !== page) {
          setPage(nextPage);
        }
        await loadCompanies(nextPage);
      } catch (err) {
        setError(extractErrorMessage(err, "Failed to delete company"));
      } finally {
        setActionCompanyId(null);
      }
    },
    [companies.length, extractErrorMessage, formValues.id, loadCompanies, page, resetForm],
  );

  const handleFormChange = (field: keyof FormValues, value: string | boolean) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    let metadata: Record<string, unknown> | null = null;
    try {
      metadata = parseMetadata(formValues.metadata);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid metadata JSON";
      setFormError(message);
      return;
    }

    const payload: CompanyCreateInput | CompanyUpdateInput = {
      name: formValues.name.trim(),
      contactEmail: formValues.contactEmail.trim(),
      apiToken: formValues.apiToken.trim(),
      active: formValues.active,
      metadata,
    };

    if (!payload.name) {
      setFormError("Name is required");
      return;
    }
    if (!payload.contactEmail) {
      setFormError("Contact email is required");
      return;
    }
    if (!payload.apiToken) {
      setFormError("API token is required");
      return;
    }

    try {
      setFormLoading(true);
      if (formMode === "create") {
        await apiClient.createCompany(payload as CompanyCreateInput);
        resetForm();
        setPage(1);
        await loadCompanies(1);
      } else if (formValues.id) {
        await apiClient.updateCompany(formValues.id, payload as CompanyUpdateInput);
        await loadCompanies(page);
        const refreshed = await apiClient.getCompany(formValues.id);
        setFormValues({
          id: refreshed.id,
          name: refreshed.name,
          contactEmail: refreshed.contactEmail ?? "",
          apiToken: refreshed.apiToken ?? "",
          active: refreshed.active,
          metadata: toMetadataString(refreshed.metadata),
        });
      }
    } catch (err) {
      setFormError(extractErrorMessage(err, "Failed to save company"));
    } finally {
      setFormLoading(false);
    }
  };

  const columns = useMemo<PaginatedColumn<Company>[]>(
    () => [
      {
        header: "Name",
        render: (item) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{item.name}</span>
            <span className="text-xs text-muted-foreground">ID: {item.id}</span>
          </div>
        ),
      },
      {
        header: "Contact",
        render: (item) => item.contactEmail ?? "—",
      },
      {
        header: "API token",
        className: "whitespace-pre",
        render: (item) => (
          <span className="font-mono text-xs">
            {item.apiToken ?? "—"}
          </span>
        ),
      },
      {
        header: "Metadata",
        className: "w-[72px]",
        render: (item) => (
          <div className="flex items-center">
            <JsonPreview data={item.metadata ?? {}} title={`Company metadata · ${item.name}`} />
          </div>
        ),
      },
      {
        header: "Profile",
        render: (item) => {
          const lines: string[] = [];
          if (item.taxId) {
            lines.push(`Tax ID: ${item.taxId}`);
          }
          if (item.industry) {
            lines.push(`Industry: ${item.industry}`);
          }
          if (item.country) {
            lines.push(`Country: ${item.country}`);
          }
          if (lines.length === 0) {
            return "—";
          }
          return (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          );
        },
      },
      {
        header: "Status",
        render: (item) => (
          <Badge variant={item.active ? "default" : "secondary"}>{item.active ? "Active" : "Inactive"}</Badge>
        ),
      },
      {
        header: "Created",
        render: (item) => formatDateTime(item.createdAt),
      },
      {
        header: "Updated",
        render: (item) => (item.updatedAt ? formatDateTime(item.updatedAt) : "—"),
      },
      {
        header: "Actions",
        className: "w-[160px]",
        render: (item) => (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDelete(item)}
              disabled={actionCompanyId === item.id}
            >
              {actionCompanyId === item.id ? "Removing" : "Delete"}
            </Button>
          </div>
        ),
      },
    ],
    [actionCompanyId, handleDelete, handleEdit],
  );

  return (
    <section className="grid grid-cols-12 gap-6">
      <PaginatedTable
        title="Authorized companies"
        items={companies}
        columns={columns}
        loading={loading}
        error={error}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={(nextPage) => setPage(nextPage)}
        emptyMessage="No companies registered"
        footerContent={
          <Button size="sm" onClick={handleCreateClick} variant="secondary">
            New company
          </Button>
        }
      />

      <Card className="col-span-12">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {formMode === "create" ? "Create company" : "Edit company"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="company-name">
                Name
              </label>
              <Input
                id="company-name"
                placeholder="Acme Retail"
                value={formValues.name}
                onChange={(event) => handleFormChange("name", event.target.value)}
                disabled={formDisabled}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="company-email">
                Contact email
              </label>
              <Input
                id="company-email"
                type="email"
                placeholder="ops@acme.test"
                value={formValues.contactEmail}
                onChange={(event) => handleFormChange("contactEmail", event.target.value)}
                disabled={formDisabled}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="company-token">
                API token
              </label>
              <Input
                id="company-token"
                placeholder="acme-retail-token"
                value={formValues.apiToken}
                onChange={(event) => handleFormChange("apiToken", event.target.value)}
                disabled={formDisabled}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="company-active">
                Status
              </label>
              <select
                id="company-active"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={formValues.active ? "active" : "inactive"}
                onChange={(event) => handleFormChange("active", event.target.value === "active")}
                disabled={formDisabled}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="company-metadata">
                Metadata (JSON)
              </label>
              <textarea
                id="company-metadata"
                className="min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                value={formValues.metadata}
                onChange={(event) => handleFormChange("metadata", event.target.value)}
                disabled={formDisabled}
              />
              <p className="text-xs text-muted-foreground">
                Provide additional attributes such as tax identifiers or industry codes. Leave empty for none.
              </p>
            </div>
            {formError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {formError}
              </div>
            ) : null}
            <div className="flex items-center justify-end gap-2">
              {formMode === "edit" ? (
                <Button type="button" variant="ghost" onClick={resetForm} disabled={formDisabled}>
                  Cancel
                </Button>
              ) : null}
              <Button type="submit" disabled={formDisabled}>
                {detailLoading
                  ? "Loading..."
                  : formLoading
                    ? "Saving"
                    : formMode === "create"
                      ? "Create company"
                      : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
};
