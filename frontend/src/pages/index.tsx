"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as motion from "motion/react-client";
import { AnimatePresence } from "motion/react";
import { PageNavBar } from "@/components/page-nav-bar";
import { SwitchThemeButton } from "@/components/switch-theme-button";
import { Button, Card, Chip, Separator, Spinner } from "@heroui/react";
import Image from "next/image";
import {
  FaAndroid,
  FaApple,
  FaCalendarAlt,
  FaChartBar,
  FaChevronDown,
  FaDownload,
  FaFileAlt,
  FaFilePdf,
  FaGithub,
  FaLock,
  FaPalette,
} from "react-icons/fa";
import Head from "next/head";

// ---- GitHub Release API types ----
interface GitHubAsset {
  name: string;
  size: number;
  browser_download_url: string;
  content_type: string;
  download_count: number;
}

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string | null;
  created_at: string;
  assets: GitHubAsset[];
}

// Unified version info for display
interface VersionInfo {
  version: string;
  changelog: string | null;
  filename: string;
  file_size: number;
  download_url: string;
  download_count: number;
  created_at: string;
  platform: string;
}

function formatFileSize(bytes: number): string {
  if (!bytes) return "0 MB";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatPlatform(platform: string): string {
  return platform === "ios" ? "iOS" : "Android";
}

const navItems = [
  { id: "home", label: "课程表" },
  { id: "features", label: "功能特性" },
  { id: "screenshots", label: "展示" },
  { id: "download", label: "下载" },
];

const screenshots = [
  { src: "/image/mysues/liquidglass.png", title: "课程表" },
  { src: "/image/mysues/score.png", title: "成绩单" },
  { src: "/image/mysues/autoimport.png", title: "导入课表" },
  { src: "/image/mysues/examinfo.png", title: "考试信息" },
  { src: "/image/mysues/profile.png", title: "个人中心" },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0, 0, 0.2, 1] },
  },
} as const;

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
} as const;

const floatingAnimation = {
  y: [0, -15, 0],
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: "easeInOut" as const,
  },
};

const floatingLogoAnimation = {
  initial: { scale: 0, rotate: -180 },
  animate: { scale: 1, rotate: 0 },
  transition: { duration: 0.8, ease: [0, 0, 0.2, 1] },
} as const;

const features = [
  {
    icon: FaCalendarAlt,
    title: "课表查询",
    description:
      "随时随地查看课程安排，支持在线教务系统数据同步，提供直观的周视图。",
  },
  {
    icon: FaChartBar,
    title: "成绩查询",
    description: "快速查询各学期成绩绩点，掌握学习进度。",
  },
  {
    icon: FaFileAlt,
    title: "考试信息",
    description: "查看考试时间、地点安排，不再错过任何一场考试。",
  },
  {
    icon: FaFilePdf,
    title: "PDF 导入",
    description: "支持导入学校下发的 PDF 格式成绩单，离线也能看。",
  },
  {
    icon: FaPalette,
    title: "个性化设置",
    description: "支持液态玻璃，自定义背景，可打造专属应用体验。",
  },
  {
    icon: FaLock,
    title: "安全登录",
    description:
      "内置 WebView 登录教务系统，通过 Cookie 管理保持会话，安全便捷。",
  },
];

const IOS_DEFAULT_URL = "https://testflight.apple.com/join/sFcAxekc";
const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO || "HsxMark/MySUES";

// ---- 可选：自定义 API 代理 / 下载代理 ----
// NEXT_PUBLIC_RELEASES_API_URL  替代 GitHub Releases API，支持 {repo} 占位符
//   例: https://example.com/api/{repo}/releases  →  https://example.com/api/HsxMark/MySUES/releases
//   例: https://eg.example.com/api/latest        →  直接使用
// 未设置时回退到 https://api.github.com/repos/{repo}/releases
//
// NEXT_PUBLIC_DOWNLOAD_PROXY_URL  替代 browser_download_url，支持 {tag} {file} 占位符
//   例: https://example.com/api/releases/download?tag={tag}&file={file}
// 未设置时直接使用原始 browser_download_url
const RELEASES_API_URL = (
  process.env.NEXT_PUBLIC_RELEASES_API_URL ||
  `https://api.github.com/repos/${GITHUB_REPO}/releases`
).replace(/{repo}/g, GITHUB_REPO);

const DOWNLOAD_PROXY_BASE = process.env.NEXT_PUBLIC_DOWNLOAD_PROXY_URL || "";

function resolveDownloadUrl(release: GitHubRelease, filename: string): string {
  if (DOWNLOAD_PROXY_BASE) {
    return DOWNLOAD_PROXY_BASE.replace(/{tag}/g, release.tag_name).replace(
      /{file}/g,
      encodeURIComponent(filename),
    );
  }
  const asset = release.assets.find((a) => a.name === filename);
  return (
    asset?.browser_download_url ||
    `https://github.com/${GITHUB_REPO}/releases/download/${release.tag_name}/${filename}`
  );
}

// ---- GitHub Release → VersionInfo 映射 ----
function mapReleaseToVersion(release: GitHubRelease): VersionInfo | null {
  // 找 Android APK asset
  const apk = release.assets.find(
    (a) =>
      a.name.toLowerCase().endsWith(".apk") ||
      a.content_type.includes("android"),
  );
  if (!apk) return null;
  return {
    version: release.tag_name.replace(/^v/i, ""),
    changelog: release.body,
    filename: apk.name,
    file_size: apk.size,
    download_url: resolveDownloadUrl(release, apk.name),
    download_count: apk.download_count,
    created_at: release.created_at,
    platform: "android",
  };
}

export default function Home() {
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReleases = useCallback(async () => {
    try {
      const res = await fetch(RELEASES_API_URL, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (!res.ok) throw new Error(`Releases API ${res.status}`);
      const releases: GitHubRelease[] = await res.json();
      const mapped = releases
        .map(mapReleaseToVersion)
        .filter(Boolean) as VersionInfo[];
      setVersions(mapped);
    } catch {
      // API 不可用时使用静态兜底
      const fallback: VersionInfo = {
        version: "1.0.0",
        changelog: null,
        filename: "sanxuanyi.apk",
        file_size: 0,
        download_url: DOWNLOAD_PROXY_BASE
          ? DOWNLOAD_PROXY_BASE.replace(/{tag}/g, "v1.0.0").replace(
              /{file}/g,
              encodeURIComponent("sanxuanyi.apk"),
            )
          : `https://github.com/${GITHUB_REPO}/releases/latest`,
        download_count: 0,
        created_at: new Date().toISOString(),
        platform: "android",
      };
      setVersions([fallback]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReleases();
  }, [fetchReleases]);

  const androidLatest = versions.length > 0 ? versions[0] : null;
  const iosUpdateUrl = IOS_DEFAULT_URL;
  const olderVersions = useMemo(() => versions.slice(1), [versions]);

  const importantNotice = androidLatest
    ? `🎉 重要提示：Android 最新版 v${androidLatest.version} 已发布，推荐尽快更新。`
    : null;

  const openUrl = (url: string | null | undefined) => {
    if (url) {
      window.open(url, "_blank");
    }
  };

  return (
    <>
      <Head>
        <title>三旋翼课程表</title>
        <meta
          name="description"
          content="三旋翼课程表 是一款校园生活助手 App，支持课表查询、成绩查询、考试信息等功能。"
        />
      </Head>

      <main className="bg-[var(--background)] text-[var(--foreground)]">
        <PageNavBar
          items={navItems}
          logo={
            <div className="flex items-center gap-2">
              <Image
                src="/image/mysues/MySUES.png"
                alt="三旋翼课程表"
                width={32}
                height={32}
                className="h-8 w-8 rounded-lg"
              />
              <span className="hidden font-semibold tracking-tight sm:inline-block">
                三旋翼课程表
              </span>
            </div>
          }
          actions={<SwitchThemeButton />}
        />

        {importantNotice && (
          <div className="sticky top-14 z-40 border-b-2 border-red-500/50 bg-red-500/10 px-4 py-3 text-center backdrop-blur-md">
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
              {importantNotice}
            </p>
          </div>
        )}

        <section
          id="home"
          className="flex min-h-screen flex-col items-center justify-center px-8"
        >
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center"
          >
            <motion.div
              animate={floatingAnimation}
              className="mb-8 flex justify-center"
            >
              <motion.div
                initial={floatingLogoAnimation.initial}
                animate={floatingLogoAnimation.animate}
                transition={floatingLogoAnimation.transition}
              >
                <Image
                  src="/image/mysues/MySUES.png"
                  alt="三旋翼课程表"
                  width={200}
                  height={200}
                  className="h-40 w-40 rounded-[2rem] drop-shadow-2xl sm:h-48 sm:w-48"
                  priority
                />
              </motion.div>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-5xl font-bold tracking-tight sm:text-7xl"
            >
              三旋翼课程表
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="mt-2 text-xl font-semibold text-[var(--muted)] sm:text-2xl"
            >
              SANXUANYI
            </motion.p>
            <motion.p
              variants={fadeInUp}
              className="mx-auto mt-6 max-w-2xl text-lg text-[var(--muted)]"
            >
              一款开源、免费、优美的课程表软件
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="mt-10 flex flex-wrap items-center justify-center gap-3"
            >
              <Chip variant="soft" size="lg">
                <span className="flex items-center gap-1.5">
                  <FaApple className="h-4 w-4" />
                  iOS 14.0+
                </span>
              </Chip>
              <Chip variant="soft" size="lg">
                <span className="flex items-center gap-1.5">
                  <FaAndroid className="h-4 w-4" />
                  Android 12.0+
                </span>
              </Chip>
            </motion.div>

            <motion.div variants={fadeInUp} className="mt-12">
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-[var(--muted)]"
              >
                <svg
                  className="mx-auto h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        <motion.section
          id="features"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="flex min-h-screen flex-col items-center justify-center px-8 py-20"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-4xl font-bold sm:text-5xl"
          >
            功能特性
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="mt-6 max-w-2xl text-center text-lg text-[var(--muted)]"
          >
            一站式校园教务信息查询，让你的大学生活更加便捷
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="mt-16 grid w-full max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={fadeInUp}>
                <Card className="h-full border border-[var(--border)] bg-[var(--surface)]">
                  <div className="p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent)]/10">
                      <feature.icon className="h-6 w-6 text-[var(--accent)]" />
                    </div>
                    <h3 className="text-lg font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {feature.description}
                    </p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        <motion.section
          id="screenshots"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="flex flex-col items-center justify-center px-8 py-20"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-4xl font-bold sm:text-5xl"
          >
            展示
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="mt-6 max-w-2xl text-center text-lg text-[var(--muted)]"
          >
            简洁直观的界面设计，轻松掌握校园信息
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="mt-16 grid w-full max-w-6xl grid-cols-2 gap-6 sm:grid-cols-3 sm:gap-8 lg:grid-cols-5"
          >
            {screenshots.map((shot) => (
              <motion.div
                key={shot.title}
                variants={fadeInUp}
                className="flex flex-col items-center gap-4"
              >
                <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                  <Image
                    src={shot.src}
                    alt={shot.title}
                    width={280}
                    height={607}
                    className="h-auto w-full"
                  />
                </div>
                <span className="text-sm font-medium text-[var(--muted)]">
                  {shot.title}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        <motion.section
          id="download"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={staggerContainer}
          className="flex min-h-[60vh] flex-col items-center justify-center px-8 py-20"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-4xl font-bold sm:text-5xl"
          >
            立即下载
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="mt-6 max-w-2xl text-center text-lg text-[var(--muted)]"
          >
            选择你的平台，开始使用 三旋翼课程表
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="mt-4 flex flex-col items-center gap-2"
          >
            {loading ? (
              <Spinner size="sm" />
            ) : (
              <>
                {androidLatest && (
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <Chip variant="soft" size="sm">
                      <span className="flex items-center gap-1.5">
                        <FaAndroid className="h-3 w-3" />v
                        {androidLatest.version}
                      </span>
                    </Chip>
                    <span>
                      {androidLatest.filename} (
                      {formatFileSize(androidLatest.file_size)})
                    </span>
                  </div>
                )}
                {!androidLatest && (
                  <span className="text-sm text-[var(--muted)]">
                    暂无版本信息
                  </span>
                )}
              </>
            )}
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="mt-12 flex flex-wrap items-center justify-center gap-4"
          >
            <a
              href={iosUpdateUrl ?? IOS_DEFAULT_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="通过 TestFlight 下载 iOS 版"
              className="transition-opacity hover:opacity-80"
            >
              <Image
                src="/image/mysues/testflight.svg"
                alt="Download on the TestFlight"
                width={138}
                height={42}
                className="h-11 w-auto md:h-10"
                unoptimized
              />
            </a>
            <Button
              size="lg"
              variant="primary"
              className="px-8 font-semibold"
              isDisabled={!androidLatest?.download_url}
              onPress={() => openUrl(androidLatest?.download_url)}
            >
              <FaAndroid className="mr-2 h-5 w-5" />
              {androidLatest
                ? `Android 下载 (${formatFileSize(androidLatest.file_size)})`
                : "Android 暂无可用版本"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="px-8 font-semibold"
              onPress={() =>
                window.open("https://github.com/HsxMark/MySUES", "_blank")
              }
            >
              <FaGithub className="mr-2 h-5 w-5" />
              GitHub
            </Button>
          </motion.div>

          <motion.div variants={fadeInUp} className="mt-10 w-full max-w-xl">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              <span>版本历史</span>
              <motion.span
                animate={{ rotate: showHistory ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="inline-flex"
              >
                <FaChevronDown className="h-3 w-3" />
              </motion.span>
            </button>

            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 space-y-3">
                    {olderVersions.map((v, index) => (
                      <div
                        key={`${v.version}-${v.created_at}`}
                        className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                          index === 0
                            ? "border border-[var(--accent)]/30 bg-[var(--accent)]/5"
                            : "border border-[var(--border)]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {index === 0 && (
                            <Chip variant="soft" size="sm" color="accent">
                              最新
                            </Chip>
                          )}
                          <Chip size="sm" variant="soft">
                            {formatPlatform(v.platform)}
                          </Chip>
                          <span className="text-sm font-medium">
                            v{v.version}
                          </span>
                          <span className="text-xs text-[var(--muted)]">
                            {formatFileSize(v.file_size)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[var(--muted)]">
                            {formatDate(v.created_at)}
                          </span>
                          {v.download_url && (
                            <a
                              href={v.download_url}
                              className="text-xs text-[var(--accent)] hover:underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <FaDownload className="inline h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}

                    {olderVersions.length === 0 && (
                      <div className="py-4 text-center text-sm text-[var(--muted)]">
                        暂无版本记录
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.section>

        <footer className="border-t border-[var(--border)] bg-[var(--background)]">
          <div className="container mx-auto px-6 py-12">
            <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="col-span-1 md:col-span-2">
                <div className="mb-4 flex items-center gap-3">
                  <Image
                    src="/image/mysues/MySUES.png"
                    alt="三旋翼课程表"
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-xl"
                  />
                  <div>
                    <div className="text-xl font-bold">三旋翼课程表</div>
                    <div className="text-sm text-[var(--muted)]">SANXUANYI</div>
                  </div>
                </div>
                <p className="max-w-md text-sm text-[var(--muted)]">
                  软件全程由 HsxMark 打造
                </p>
              </div>

              <div>
                <h3 className="mb-3 font-semibold">快速链接</h3>
                <div className="flex flex-col gap-2">
                  {navItems.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                    >
                      {item.label}
                    </a>
                  ))}
                  <a
                    href="https://github.com/HsxMark/MySUES"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                  >
                    GitHub
                  </a>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="space-y-3">
              <div className="rounded-lg border-2 border-yellow-500/50 bg-yellow-500/10 p-4">
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  本项目为开发者个人开发的非官方应用，仅供学习交流使用。应用内所有数据均直接来源于学校教务系统，本项目不保存任何用户的账号密码。请勿将本项目用于任何商业用途。
                </p>
              </div>
              <div className="flex flex-col items-center justify-between gap-2 text-sm text-[var(--muted)] sm:flex-row">
                <p>
                  Made with Flutter by{" "}
                  <span className="font-medium text-[var(--foreground)]">
                    HsxMark
                  </span>
                </p>
                <div className="flex flex-col items-center gap-1 sm:items-end">
                  <p>© 2026 三旋翼课程表. 保留所有权利.</p>
                  <a
                    href="https://beian.miit.gov.cn/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                  >
                    鲁ICP备2026043859号-1
                  </a>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
