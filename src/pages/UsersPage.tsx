import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaginatedTable, type PaginatedColumn } from "@/components/tables/PaginatedTable";
import { formatDateTime } from "@/lib/utils";
import { apiClient, type UserCreateInput, type UserUpdateInput } from "@/services/apiClient";
import type { UserAccount } from "@/store/types/dashboard";

const PAGE_SIZE = 10;

interface FormValues {
  id: string | null;
  email: string;
  password: string;
}

const emptyForm: FormValues = {
  id: null,
  email: "",
  password: "",
};

export const UsersPage = () => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [formValues, setFormValues] = useState<FormValues>(emptyForm);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  const formDisabled = formLoading || detailLoading;

  const extractErrorMessage = useCallback((err: unknown, fallback: string) => {
    if (err && typeof err === "object") {
      const detail = (err as { response?: { data?: { detail?: unknown; message?: unknown } } })?.response?.data;
      const detailMessage = detail?.detail ?? detail?.message;
      if (typeof detailMessage === "string" && detailMessage.trim().length > 0) {
        return detailMessage;
      }
    }
    if (err instanceof Error && err.message) {
      return err.message;
    }
    return fallback;
  }, []);

  const loadUsers = useCallback(
    async (targetPage = page) => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.listUsers({
          page: targetPage,
          pageSize: PAGE_SIZE,
        });
        setUsers(response.items);
        setTotal(response.count);
      } catch (err) {
        setError(extractErrorMessage(err, "Failed to load users"));
      } finally {
        setLoading(false);
      }
    },
    [extractErrorMessage, page],
  );

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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
    async (user: UserAccount) => {
      setFormMode("edit");
      setFormError(null);
      setDetailLoading(true);
      setFormValues({
        id: user.id,
        email: user.email,
        password: "",
      });

      try {
        const detailed = await apiClient.getUser(user.id);
        setFormValues({
          id: detailed.id,
          email: detailed.email,
          password: "",
        });
      } catch (err) {
        setFormError(extractErrorMessage(err, "Failed to load user details"));
      } finally {
        setDetailLoading(false);
      }
    },
    [extractErrorMessage],
  );

  const handleDelete = useCallback(
    async (user: UserAccount) => {
      const confirmed = window.confirm(`Delete user "${user.email}"? This action cannot be undone.`);
      if (!confirmed) return;

      try {
        setActionUserId(user.id);
        await apiClient.deleteUser(user.id);
        if (formValues.id === user.id) {
          resetForm();
        }
        const nextPage = users.length === 1 && page > 1 ? page - 1 : page;
        if (nextPage !== page) {
          setPage(nextPage);
        }
        await loadUsers(nextPage);
      } catch (err) {
        setError(extractErrorMessage(err, "Failed to delete user"));
      } finally {
        setActionUserId(null);
      }
    },
    [extractErrorMessage, formValues.id, loadUsers, page, resetForm, users.length],
  );

  const handleFormChange = (field: keyof FormValues, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const email = formValues.email.trim();
    const password = formValues.password.trim();

    if (!email) {
      setFormError("Email is required");
      return;
    }

    if (formMode === "create" && !password) {
      setFormError("Password is required to create a user");
      return;
    }

    if (password && password.length < 8) {
      setFormError("Password must be at least 8 characters long");
      return;
    }

    try {
      setFormLoading(true);
      if (formMode === "create") {
        const payload: UserCreateInput = {
          email,
          password,
        };
        await apiClient.createUser(payload);
        resetForm();
        setPage(1);
        await loadUsers(1);
      } else if (formValues.id) {
        const payload: UserUpdateInput = {
          email,
        };
        if (password) {
          payload.password = password;
        }
        await apiClient.updateUser(formValues.id, payload);
        await loadUsers(page);
        const refreshed = await apiClient.getUser(formValues.id);
        setFormValues({
          id: refreshed.id,
          email: refreshed.email,
          password: "",
        });
      }
    } catch (err) {
      setFormError(extractErrorMessage(err, "Failed to save user"));
    } finally {
      setFormLoading(false);
    }
  };

  const columns = useMemo<PaginatedColumn<UserAccount>[]>(
    () => [
      {
        header: "Email",
        render: (item) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{item.email}</span>
            <span className="text-xs text-muted-foreground">ID: {item.id}</span>
          </div>
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
              disabled={actionUserId === item.id}
            >
              {actionUserId === item.id ? "Removing" : "Delete"}
            </Button>
          </div>
        ),
      },
    ],
    [actionUserId, handleDelete, handleEdit],
  );

  return (
    <section className="grid grid-cols-12 gap-6">
      <PaginatedTable
        title="Dashboard users"
        items={users}
        columns={columns}
        loading={loading}
        error={error}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={(nextPage) => setPage(nextPage)}
        emptyMessage="No users found"
        footerContent={
          <Button size="sm" onClick={handleCreateClick} variant="secondary">
            New user
          </Button>
        }
      />

      <Card className="col-span-12">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {formMode === "create" ? "Create user" : "Edit user"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="user-email">
                Email
              </label>
              <Input
                id="user-email"
                type="email"
                placeholder="dashboard.user@example.com"
                value={formValues.email}
                onChange={(event) => handleFormChange("email", event.target.value)}
                disabled={formDisabled}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="user-password">
                Password
              </label>
              <Input
                id="user-password"
                type="password"
                placeholder="StrongPass1!"
                value={formValues.password}
                onChange={(event) => handleFormChange("password", event.target.value)}
                disabled={formDisabled}
              />
              <p className="text-xs text-muted-foreground">
                {formMode === "create"
                  ? "Set an initial password for the new dashboard user."
                  : "Leave blank to keep the existing password."}
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
                      ? "Create user"
                      : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
};
