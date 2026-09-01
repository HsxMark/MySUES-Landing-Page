"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  Chip,
  Input,
  Label,
  ListBox,
  Select,
  Spinner,
  Tabs,
  TextArea,
  TextField,
} from "@heroui/react";

interface Message {
  text: string;
  type: "success" | "error";
}

interface AppVersionResponse {
  id: string;
  app_id: string;
  platform: string;
  version: string;
  build_number: number;
  min_supported_build_number: number | null;
  changelog: string | null;
  file_url: string | null;
  external_url: string | null;
  filename: string;
  file_size: number;
  content_type: string;
  download_count: number;
  created_at: string;
}

interface AppResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  platform: string | null;
  icon_image_id: string | null;
  created_at: string;
  updated_at: string;
  latest_version: AppVersionResponse | null;
}

interface AppMetricsPlatformSummary {
  platform: string;
  installations: number;
  opens: number;
  active_7d: number;
  active_30d: number;
}

interface AppMetricsResponse {
  app_id: string;
  slug: string;
  total_installations: number;
  total_opens: number;
  active_7d: number;
  active_30d: number;
  platforms: AppMetricsPlatformSummary[];
  versions: AppVersionResponse[];
}

const PLATFORM_OPTIONS = [
  { id: "android", label: "Android" },
  { id: "ios", label: "iOS" },
];
const APP_SLUG = "mysues";

async function api<T>(
  path: string,
  token: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<T | null> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  if (options.json) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.json);
  }
  delete options.json;

  const res = await fetch(path, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (res.status === 204) return null;

  const contentType = res.headers.get("content-type");
  const data = contentType?.includes("json") ? await res.json() : null;

  if (!res.ok) {
    throw new Error(data?.detail || res.statusText);
  }

  return data as T;
}

function MessageDisplay({ message }: { message: Message | null }) {
  if (!message) return null;
  return (
    <Chip
      color={message.type === "success" ? "success" : "danger"}
      variant="soft"
      className="mt-2"
    >
      {message.text}
    </Chip>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN");
}

function formatPlatform(platform: string) {
  return platform === "ios" ? "iOS" : "Android";
}

function formatFileSize(bytes: number) {
  if (!bytes) return "0 MB";
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminPage() {
  const [token, setToken] = useState<string>("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState<Message | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const [mysuesApp, setMysuesApp] = useState<AppResponse | null>(null);
  const [mysuesMetrics, setMysuesMetrics] = useState<AppMetricsResponse | null>(
    null,
  );
  const [mysuesLoading, setMysuesLoading] = useState(false);
  const [mysuesMessage, setMysuesMessage] = useState<Message | null>(null);
  const [releaseForm, setReleaseForm] = useState({
    platform: "android",
    version: "",
    build_number: "",
    min_supported_build_number: "",
    changelog: "",
    file_url: "",
    external_url: "",
    filename: "",
  });
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [releaseMessage, setReleaseMessage] = useState<Message | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      fetch(`/api/apps/by-slug/${APP_SLUG}`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      }).then((res) => {
        if (res.ok) {
          setToken(savedToken);
        } else {
          localStorage.removeItem("token");
        }
      });
    }
  }, []);

  const showMessage = (
    setter: React.Dispatch<React.SetStateAction<Message | null>>,
    text: string,
    type: "success" | "error",
  ) => {
    setter({ text, type });
    setTimeout(() => setter(null), 5000);
  };

  const loadMysues = useCallback(async () => {
    setMysuesLoading(true);
    setMysuesMessage(null);
    try {
      const appData = await api<AppResponse>(
        `/api/apps/by-slug/${APP_SLUG}`,
        token,
      );
      const metricsData = await api<AppMetricsResponse>(
        `/api/apps/by-slug/${APP_SLUG}/metrics`,
        token,
      );
      setMysuesApp(appData);
      setMysuesMetrics(metricsData);
    } catch (e) {
      setMysuesMessage({ text: (e as Error).message, type: "error" });
    } finally {
      setMysuesLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadMysues();
    }
  }, [token, loadMysues]);

  const handleLogin = async () => {
    setLoginLoading(true);
    setLoginMessage(null);
    try {
      const data = await api<{ access_token: string }>("/api/auth/login", "", {
        method: "POST",
        json: { username, password },
      });
      if (data?.access_token) {
        localStorage.setItem("token", data.access_token);
        setToken(data.access_token);
      }
    } catch (e) {
      showMessage(setLoginMessage, (e as Error).message, "error");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken("");
    setMysuesApp(null);
    setMysuesMetrics(null);
  };

  const handleReleasePlatformChange = (key: string | number | null) => {
    setReleaseForm((prev) => ({ ...prev, platform: String(key ?? "android") }));
  };

  const handleCreateRelease = async () => {
    if (!mysuesApp) return;
    setReleaseLoading(true);
    setReleaseMessage(null);
    try {
      const form = new FormData();
      form.append("platform", releaseForm.platform);
      form.append("version", releaseForm.version.trim());
      form.append("build_number", releaseForm.build_number.trim());
      if (releaseForm.min_supported_build_number.trim()) {
        form.append(
          "min_supported_build_number",
          releaseForm.min_supported_build_number.trim(),
        );
      }
      if (releaseForm.changelog.trim())
        form.append("changelog", releaseForm.changelog.trim());
      if (releaseForm.file_url.trim())
        form.append("file_url", releaseForm.file_url.trim());
      if (releaseForm.external_url.trim())
        form.append("external_url", releaseForm.external_url.trim());
      if (releaseForm.filename.trim())
        form.append("filename", releaseForm.filename.trim());

      const res = await fetch(`/api/apps/${mysuesApp.id}/versions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const contentType = res.headers.get("content-type");
      const data = contentType?.includes("json") ? await res.json() : null;
      if (!res.ok) {
        throw new Error(data?.detail || res.statusText);
      }

      showMessage(setReleaseMessage, "版本发布成功", "success");
      setReleaseForm({
        platform: "android",
        version: "",
        build_number: "",
        min_supported_build_number: "",
        changelog: "",
        file_url: "",
        external_url: "",
        filename: "",
      });
      loadMysues();
    } catch (e) {
      showMessage(setReleaseMessage, (e as Error).message, "error");
    } finally {
      setReleaseLoading(false);
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    if (!mysuesApp || !confirm("确定删除此版本?")) return;
    try {
      await api(`/api/apps/${mysuesApp.id}/versions/${versionId}`, token, {
        method: "DELETE",
      });
      loadMysues();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  if (!token) {
    return (
      <main className="min-h-screen bg-background p-6 text-foreground">
        <div className="mx-auto max-w-md">
          <h1 className="mb-6 text-3xl font-bold">三旋翼课程表 Admin</h1>
          <Card>
            <Card.Header>
              <Card.Title>登录</Card.Title>
            </Card.Header>
            <Card.Content className="flex flex-col gap-4">
              <TextField
                value={username}
                onChange={setUsername}
                className="w-full"
              >
                <Label>用户名</Label>
                <Input placeholder="输入用户名" />
              </TextField>
              <TextField
                value={password}
                onChange={setPassword}
                className="w-full"
              >
                <Label>密码</Label>
                <Input
                  type="password"
                  placeholder="输入密码"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </TextField>
              <Button
                variant="primary"
                onPress={handleLogin}
                isDisabled={loginLoading}
              >
                {loginLoading ? <Spinner size="sm" /> : "登录"}
              </Button>
              <MessageDisplay message={loginMessage} />
            </Card.Content>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">三旋翼课程表 Admin</h1>
          <Button variant="danger" onPress={handleLogout}>
            退出登录
          </Button>
        </div>

        <Tabs className="w-full" defaultSelectedKey="mysues">
          <Tabs.ListContainer>
            <Tabs.List aria-label="管理功能">
              <Tabs.Tab id="mysues">三旋翼课程表</Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>

          <Tabs.Panel id="mysues" className="pt-4">
            <div className="flex flex-col gap-4">
              <Card>
                <Card.Header className="flex items-center justify-between">
                  <div>
                    <Card.Title>三旋翼课程表 版本与统计</Card.Title>
                    <Card.Description>
                      统一管理 Android / iOS 版本与打开数据
                    </Card.Description>
                  </div>
                  <Button size="sm" variant="ghost" onPress={loadMysues}>
                    刷新
                  </Button>
                </Card.Header>
                <Card.Content className="flex flex-col gap-4">
                  <MessageDisplay message={mysuesMessage} />
                  {mysuesLoading ? (
                    <div className="flex justify-center py-8">
                      <Spinner size="lg" />
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-4 md:grid-cols-4">
                        <Card className="border border-border">
                          <Card.Content className="p-4">
                            <div className="text-sm text-muted">总安装量</div>
                            <div className="mt-1 text-2xl font-semibold">
                              {mysuesMetrics?.total_installations ?? 0}
                            </div>
                          </Card.Content>
                        </Card>
                        <Card className="border border-border">
                          <Card.Content className="p-4">
                            <div className="text-sm text-muted">总打开次数</div>
                            <div className="mt-1 text-2xl font-semibold">
                              {mysuesMetrics?.total_opens ?? 0}
                            </div>
                          </Card.Content>
                        </Card>
                        <Card className="border border-border">
                          <Card.Content className="p-4">
                            <div className="text-sm text-muted">7 天活跃</div>
                            <div className="mt-1 text-2xl font-semibold">
                              {mysuesMetrics?.active_7d ?? 0}
                            </div>
                          </Card.Content>
                        </Card>
                        <Card className="border border-border">
                          <Card.Content className="p-4">
                            <div className="text-sm text-muted">30 天活跃</div>
                            <div className="mt-1 text-2xl font-semibold">
                              {mysuesMetrics?.active_30d ?? 0}
                            </div>
                          </Card.Content>
                        </Card>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        {mysuesMetrics?.platforms.map((item) => (
                          <Card
                            key={item.platform}
                            className="border border-border"
                          >
                            <Card.Header>
                              <Card.Title>
                                {formatPlatform(item.platform)}
                              </Card.Title>
                            </Card.Header>
                            <Card.Content className="space-y-2 text-sm">
                              <div>安装量：{item.installations}</div>
                              <div>打开次数：{item.opens}</div>
                              <div>7 天活跃：{item.active_7d}</div>
                              <div>30 天活跃：{item.active_30d}</div>
                            </Card.Content>
                          </Card>
                        ))}
                      </div>
                    </>
                  )}
                </Card.Content>
              </Card>

              <Card>
                <Card.Header>
                  <Card.Title>发布新版本</Card.Title>
                </Card.Header>
                <Card.Content className="flex flex-col gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Select
                      className="w-full"
                      selectedKey={releaseForm.platform}
                      onSelectionChange={handleReleasePlatformChange}
                    >
                      <Label>平台</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {PLATFORM_OPTIONS.map((option) => (
                            <ListBox.Item key={option.id} id={option.id}>
                              {option.label}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                    <TextField
                      value={releaseForm.version}
                      onChange={(v) =>
                        setReleaseForm((prev) => ({ ...prev, version: v }))
                      }
                      className="w-full"
                    >
                      <Label>版本号</Label>
                      <Input placeholder="如 1.1.0" />
                    </TextField>
                    <TextField
                      value={releaseForm.build_number}
                      onChange={(v) =>
                        setReleaseForm((prev) => ({ ...prev, build_number: v }))
                      }
                      className="w-full"
                    >
                      <Label>Build Number</Label>
                      <Input placeholder="如 5" />
                    </TextField>
                    <TextField
                      value={releaseForm.min_supported_build_number}
                      onChange={(v) =>
                        setReleaseForm((prev) => ({
                          ...prev,
                          min_supported_build_number: v,
                        }))
                      }
                      className="w-full"
                    >
                      <Label>最低支持 Build</Label>
                      <Input placeholder="可选，用于强制更新" />
                    </TextField>
                    <TextField
                      value={releaseForm.file_url}
                      onChange={(v) =>
                        setReleaseForm((prev) => ({ ...prev, file_url: v }))
                      }
                      className="w-full md:col-span-2"
                    >
                      <Label>Android 文件 URL</Label>
                      <Input placeholder="APK / 安装包 URL" />
                    </TextField>
                    <TextField
                      value={releaseForm.external_url}
                      onChange={(v) =>
                        setReleaseForm((prev) => ({ ...prev, external_url: v }))
                      }
                      className="w-full md:col-span-2"
                    >
                      <Label>外部跳转 URL</Label>
                      <Input placeholder="iOS TestFlight / App Store / 备用下载地址" />
                    </TextField>
                    <TextField
                      value={releaseForm.filename}
                      onChange={(v) =>
                        setReleaseForm((prev) => ({ ...prev, filename: v }))
                      }
                      className="w-full md:col-span-2"
                    >
                      <Label>文件名</Label>
                      <Input placeholder="可选，Android 可自定义下载名" />
                    </TextField>
                    <TextField
                      value={releaseForm.changelog}
                      onChange={(v) =>
                        setReleaseForm((prev) => ({ ...prev, changelog: v }))
                      }
                      className="w-full md:col-span-2"
                    >
                      <Label>更新日志</Label>
                      <TextArea placeholder="可选" rows={3} />
                    </TextField>
                  </div>
                  <Button
                    variant="primary"
                    onPress={handleCreateRelease}
                    isDisabled={releaseLoading || !mysuesApp}
                  >
                    {releaseLoading ? <Spinner size="sm" /> : "发布版本"}
                  </Button>
                  <MessageDisplay message={releaseMessage} />
                </Card.Content>
              </Card>

              <Card>
                <Card.Header>
                  <Card.Title>版本列表</Card.Title>
                </Card.Header>
                <Card.Content>
                  {!mysuesMetrics?.versions?.length ? (
                    <p className="text-sm text-muted">暂无版本</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {mysuesMetrics.versions.map((version) => (
                        <Card key={version.id} className="border border-border">
                          <Card.Content className="flex flex-col gap-2 p-4 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-2">
                                <Chip size="sm" variant="soft">
                                  {formatPlatform(version.platform)}
                                </Chip>
                                <span className="font-semibold">
                                  v{version.version} (build{" "}
                                  {version.build_number})
                                </span>
                              </div>
                              <div className="text-muted">
                                最低支持 build：
                                {version.min_supported_build_number ?? "无"}
                              </div>
                              <div className="text-muted">
                                下载次数：{version.download_count} · 文件：
                                {version.filename || "无"} · 大小：
                                {formatFileSize(version.file_size)}
                              </div>
                              {version.changelog && (
                                <div>{version.changelog}</div>
                              )}
                              {version.file_url && (
                                <a
                                  href={version.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block text-accent hover:underline"
                                >
                                  file_url
                                </a>
                              )}
                              {version.external_url && (
                                <a
                                  href={version.external_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block text-accent hover:underline"
                                >
                                  external_url
                                </a>
                              )}
                              <div className="text-xs text-muted">
                                发布时间：{formatDate(version.created_at)}
                              </div>
                            </div>
                            <Button
                              variant="danger"
                              size="sm"
                              onPress={() => handleDeleteVersion(version.id)}
                            >
                              删除
                            </Button>
                          </Card.Content>
                        </Card>
                      ))}
                    </div>
                  )}
                </Card.Content>
              </Card>
            </div>
          </Tabs.Panel>
        </Tabs>
      </div>
    </main>
  );
}
